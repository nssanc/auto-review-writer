import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import db from './db';
import { webdavService } from './webdav';
import { decryptPassword } from './crypto';
import { WebDAVConfig, SyncResult, FileType } from './webdav-types';
import { syncTaskManager } from './sync-task-manager';
import {
  getProjectRemotePath,
  getRemotePdfPath,
  getRemotePlanPath,
  getRemoteAnalysisPath,
  getRemoteKeywordsPath,
  getRemoteSearchPath,
  getRemoteArticlePath,
  getRemoteImagePath,
  getRemoteExportPath
} from './path-utils';
import {
  exportPlanToMarkdown,
  exportAnalysisToMarkdown,
  exportKeywordsToMarkdown,
  exportSearchResultsToMarkdown
} from './content-exporter';

/**
 * WebDAV 同步管理器
 */
export class WebDAVSyncManager {
  private isInitialized = false;
  private syncQueue: Array<{ localPath: string; remotePath: string; fileType: FileType }> = [];
  private isSyncing = false;

  /**
   * 初始化同步管理器
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔄 Initializing WebDAV sync manager...');

      const config = this.getConfig();
      if (!config) {
        console.error('❌ No WebDAV config found');
        return false;
      }

      if (!config.enabled) {
        console.error('❌ WebDAV is not enabled');
        return false;
      }

      console.log(`📋 Config loaded: ${config.url}`);

      // 解密密码
      console.log('🔐 Decrypting password...');
      const password = decryptPassword(config.password);
      console.log('✅ Password decrypted');

      // 连接到 WebDAV
      console.log('🌐 Connecting to WebDAV...');
      await webdavService.connect({
        url: config.url,
        username: config.username,
        password: password,
        timeout: 30000,
      });

      this.isInitialized = true;
      console.log('✅ WebDAV sync manager initialized');
      return true;
    } catch (error: any) {
      console.error('❌ Failed to initialize WebDAV sync manager:', error);
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
      return false;
    }
  }

  /**
   * 获取 WebDAV 配置
   */
  private getConfig(): WebDAVConfig | null {
    try {
      const stmt = db.prepare('SELECT * FROM webdav_config WHERE enabled = 1 LIMIT 1');
      const config = stmt.get() as WebDAVConfig | undefined;
      return config || null;
    } catch (error) {
      console.error('Failed to get WebDAV config:', error);
      return null;
    }
  }

  /**
   * 计算文件哈希
   */
  private calculateFileHash(filePath: string): string {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }

  /**
   * 获取项目名称
   */
  private getProjectName(projectId: number): string {
    try {
      const stmt = db.prepare('SELECT name FROM projects WHERE id = ?');
      const project = stmt.get(projectId) as any;
      return project?.name || `project_${projectId}`;
    } catch (error) {
      console.error('Failed to get project name:', error);
      return `project_${projectId}`;
    }
  }

  /**
   * 记录同步日志
   */
  private logSync(
    syncType: 'upload' | 'download' | 'delete',
    fileType: FileType,
    localPath: string,
    remotePath: string,
    status: 'success' | 'failed',
    errorMessage?: string,
    fileSize?: number,
    duration?: number,
    retryCount: number = 0
  ): void {
    try {
      const stmt = db.prepare(`
        INSERT INTO webdav_sync_log
        (sync_type, file_type, local_path, remote_path, status, error_message, file_size, sync_duration, retry_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(syncType, fileType, localPath, remotePath, status, errorMessage, fileSize, duration, retryCount);
    } catch (error) {
      console.error('Failed to log sync:', error);
    }
  }

  /**
   * 更新文件缓存
   */
  private updateFileCache(
    filePath: string,
    remotePath: string,
    fileHash: string,
    fileSize: number,
    syncStatus: 'synced' | 'pending' | 'failed'
  ): void {
    try {
      const stmt = db.prepare(`
        INSERT INTO webdav_file_cache (file_path, remote_path, file_hash, file_size, sync_status, last_sync_at, last_modified)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(file_path) DO UPDATE SET
          remote_path = excluded.remote_path,
          file_hash = excluded.file_hash,
          file_size = excluded.file_size,
          sync_status = excluded.sync_status,
          last_sync_at = excluded.last_sync_at,
          updated_at = datetime('now')
      `);
      stmt.run(filePath, remotePath, fileHash, fileSize, syncStatus);
    } catch (error) {
      console.error('Failed to update file cache:', error);
    }
  }

  /**
   * 获取文件缓存
   */
  private getFileCache(filePath: string): any {
    try {
      const stmt = db.prepare('SELECT * FROM webdav_file_cache WHERE file_path = ?');
      return stmt.get(filePath);
    } catch (error) {
      console.error('Failed to get file cache:', error);
      return null;
    }
  }

  /**
   * 同步上传的文件
   */
  async syncUploadedFile(projectId: number, localPath: string): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    const startTime = Date.now();
    const fileName = path.basename(localPath);
    const remotePath = getRemotePdfPath(projectId, fileName);

    try {
      // 检查文件是否存在
      if (!fs.existsSync(localPath)) {
        throw new Error('Local file does not exist');
      }

      const fileSize = fs.statSync(localPath).size;
      const fileHash = this.calculateFileHash(localPath);

      // 检查缓存，避免重复上传
      const cached = this.getFileCache(localPath);
      if (cached && cached.file_hash === fileHash && cached.sync_status === 'synced') {
        console.log(`⏭️  Skipped (already synced): ${fileName}`);
        return true;
      }

      // 上传文件
      await webdavService.uploadFileWithRetry(localPath, remotePath);

      const duration = Date.now() - startTime;

      // 记录日志
      this.logSync('upload', 'file', localPath, remotePath, 'success', undefined, fileSize, duration);

      // 更新缓存
      this.updateFileCache(localPath, remotePath, fileHash, fileSize, 'synced');

      console.log(`✅ Synced uploaded file: ${fileName}`);
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logSync('upload', 'file', localPath, remotePath, 'failed', error.message, undefined, duration);
      console.error(`❌ Failed to sync uploaded file: ${fileName}`, error);
      return false;
    }
  }

  /**
   * 同步计划文件
   */
  async syncPlanFile(projectId: number): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const content = exportPlanToMarkdown(projectId);
      if (!content) {
        console.log('⏭️  No plan content to sync');
        return true;
      }

      const filename = `plan_${Date.now()}.md`;
      const remotePath = getRemotePlanPath(projectId, filename);

      await webdavService.uploadContent(remotePath, content);
      console.log(`✅ Synced plan file: ${filename}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to sync plan file:', error);
      return false;
    }
  }

  /**
   * 同步分析文件
   */
  async syncAnalysisFile(projectId: number): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const content = exportAnalysisToMarkdown(projectId);
      if (!content) {
        console.log('⏭️  No analysis content to sync');
        return true;
      }

      const filename = `analysis_${Date.now()}.md`;
      const remotePath = getRemoteAnalysisPath(projectId, filename);

      await webdavService.uploadContent(remotePath, content);
      console.log(`✅ Synced analysis file: ${filename}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to sync analysis file:', error);
      return false;
    }
  }

  /**
   * 同步关键词文件
   */
  async syncKeywordsFile(projectId: number): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const content = exportKeywordsToMarkdown(projectId);
      if (!content) {
        console.log('⏭️  No keywords content to sync');
        return true;
      }

      const filename = `keywords_${Date.now()}.md`;
      const remotePath = getRemoteKeywordsPath(projectId, filename);

      await webdavService.uploadContent(remotePath, content);
      console.log(`✅ Synced keywords file: ${filename}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to sync keywords file:', error);
      return false;
    }
  }

  /**
   * 同步搜索结果文件
   */
  async syncSearchResultsFile(projectId: number): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    try {
      const content = exportSearchResultsToMarkdown(projectId);
      if (!content) {
        console.log('⏭️  No search results to sync');
        return true;
      }

      const filename = `search_results_${Date.now()}.md`;
      const remotePath = getRemoteSearchPath(projectId, filename);

      await webdavService.uploadContent(remotePath, content);
      console.log(`✅ Synced search results file: ${filename}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to sync search results file:', error);
      return false;
    }
  }

  /**
   * 备份数据库
   */
  async backupDatabase(): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    const startTime = Date.now();
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const remotePath = `/literature-review-ai/backups/database/app-${timestamp}.db`;

    try {
      if (!fs.existsSync(dbPath)) {
        throw new Error('Database file does not exist');
      }

      const fileSize = fs.statSync(dbPath).size;

      // 上传数据库
      await webdavService.uploadFileWithRetry(dbPath, remotePath);

      const duration = Date.now() - startTime;

      // 记录日志
      this.logSync('upload', 'database', dbPath, remotePath, 'success', undefined, fileSize, duration);

      // 更新最后同步时间
      const updateStmt = db.prepare("UPDATE webdav_config SET last_sync_at = datetime('now') WHERE enabled = 1");
      updateStmt.run();

      console.log(`✅ Database backed up: ${remotePath}`);
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logSync('upload', 'database', dbPath, remotePath, 'failed', error.message, undefined, duration);
      console.error('❌ Failed to backup database:', error);
      return false;
    }
  }

  /**
   * 同步输出文件
   */
  async syncOutputFile(localPath: string): Promise<boolean> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return false;
    }

    const startTime = Date.now();
    const fileName = path.basename(localPath);
    const remotePath = `/literature-review-ai/outputs/${fileName}`;

    try {
      if (!fs.existsSync(localPath)) {
        throw new Error('Output file does not exist');
      }

      const fileSize = fs.statSync(localPath).size;
      const fileHash = this.calculateFileHash(localPath);

      // 上传文件
      await webdavService.uploadFileWithRetry(localPath, remotePath);

      const duration = Date.now() - startTime;

      // 记录日志
      this.logSync('upload', 'output', localPath, remotePath, 'success', undefined, fileSize, duration);

      // 更新缓存
      this.updateFileCache(localPath, remotePath, fileHash, fileSize, 'synced');

      console.log(`✅ Synced output file: ${fileName}`);
      return true;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logSync('upload', 'output', localPath, remotePath, 'failed', error.message, undefined, duration);
      console.error(`❌ Failed to sync output file: ${fileName}`, error);
      return false;
    }
  }

  /**
   * 全量同步
   */
  async fullSync(taskId?: string): Promise<SyncResult> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return {
          success: false,
          message: 'WebDAV not initialized',
        };
      }
    }

    const startTime = Date.now();
    let syncedFiles = 0;
    let failedFiles = 0;
    let totalSize = 0;
    const errors: Array<{ file: string; error: string }> = [];

    try {
      // 计算总文件数
      let totalFiles = 1; // 数据库备份
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const outputsDir = path.join(process.cwd(), 'outputs');

      if (fs.existsSync(uploadsDir)) {
        const projects = fs.readdirSync(uploadsDir);
        for (const projectId of projects) {
          const projectDir = path.join(uploadsDir, projectId);
          if (fs.statSync(projectDir).isDirectory()) {
            totalFiles += fs.readdirSync(projectDir).length;
          }
        }
      }

      if (fs.existsSync(outputsDir)) {
        totalFiles += fs.readdirSync(outputsDir).filter(f =>
          fs.statSync(path.join(outputsDir, f)).isFile()
        ).length;
      }

      // 1. 备份数据库
      if (taskId) {
        syncTaskManager.updateTaskProgress(taskId, '数据库备份', syncedFiles, totalFiles, failedFiles);
      }
      const dbBackedUp = await this.backupDatabase();
      if (dbBackedUp) {
        syncedFiles++;
      } else {
        failedFiles++;
        errors.push({ file: 'database', error: 'Database backup failed' });
      }

      // 2. 同步所有上传的文件
      if (fs.existsSync(uploadsDir)) {
        const projects = fs.readdirSync(uploadsDir);
        for (const projectId of projects) {
          const projectDir = path.join(uploadsDir, projectId);
          if (fs.statSync(projectDir).isDirectory()) {
            const files = fs.readdirSync(projectDir);
            for (const file of files) {
              const filePath = path.join(projectDir, file);
              if (taskId) {
                syncTaskManager.updateTaskProgress(taskId, `上传文件: ${file}`, syncedFiles, totalFiles, failedFiles);
              }
              const synced = await this.syncUploadedFile(parseInt(projectId), filePath);
              if (synced) {
                syncedFiles++;
                totalSize += fs.statSync(filePath).size;
              } else {
                failedFiles++;
                errors.push({ file: filePath, error: 'Upload failed' });
              }
            }
          }
        }
      }

      // 3. 同步所有输出文件
      if (fs.existsSync(outputsDir)) {
        const files = fs.readdirSync(outputsDir);
        for (const file of files) {
          const filePath = path.join(outputsDir, file);
          if (fs.statSync(filePath).isFile()) {
            if (taskId) {
              syncTaskManager.updateTaskProgress(taskId, `输出文件: ${file}`, syncedFiles, totalFiles, failedFiles);
            }
            const synced = await this.syncOutputFile(filePath);
            if (synced) {
              syncedFiles++;
              totalSize += fs.statSync(filePath).size;
            } else {
              failedFiles++;
              errors.push({ file: filePath, error: 'Upload failed' });
            }
          }
        }
      }

      // 4. 同步项目内容（计划、分析、关键词、搜索结果）
      try {
        const projectsStmt = db.prepare('SELECT id FROM projects');
        const allProjects = projectsStmt.all() as Array<{ id: number }>;

        for (const project of allProjects) {
          const projectId = project.id;

          // 同步计划
          if (taskId) {
            syncTaskManager.updateTaskProgress(taskId, `项目 ${projectId}: 同步计划`, syncedFiles, totalFiles, failedFiles);
          }
          await this.syncPlanFile(projectId).catch(err => {
            console.error(`Failed to sync plan for project ${projectId}:`, err);
          });

          // 同步分析
          if (taskId) {
            syncTaskManager.updateTaskProgress(taskId, `项目 ${projectId}: 同步分析`, syncedFiles, totalFiles, failedFiles);
          }
          await this.syncAnalysisFile(projectId).catch(err => {
            console.error(`Failed to sync analysis for project ${projectId}:`, err);
          });

          // 同步关键词
          if (taskId) {
            syncTaskManager.updateTaskProgress(taskId, `项目 ${projectId}: 同步关键词`, syncedFiles, totalFiles, failedFiles);
          }
          await this.syncKeywordsFile(projectId).catch(err => {
            console.error(`Failed to sync keywords for project ${projectId}:`, err);
          });

          // 同步搜索结果
          if (taskId) {
            syncTaskManager.updateTaskProgress(taskId, `项目 ${projectId}: 同步搜索结果`, syncedFiles, totalFiles, failedFiles);
          }
          await this.syncSearchResultsFile(projectId).catch(err => {
            console.error(`Failed to sync search results for project ${projectId}:`, err);
          });
        }
      } catch (error) {
        console.error('Failed to sync project content:', error);
      }

      const duration = Date.now() - startTime;

      return {
        success: failedFiles === 0,
        message: `Synced ${syncedFiles} files, ${failedFiles} failed`,
        syncedFiles,
        failedFiles,
        totalSize,
        duration,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
        syncedFiles,
        failedFiles,
        errors,
      };
    }
  }

  /**
   * 列出可恢复的数据库备份
   */
  async listDatabaseBackups(): Promise<Array<{ filename: string; date: string; size: number }>> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) return [];
    }

    try {
      const backupDir = '/literature-review-ai/backups/database';
      const files = await webdavService.listDirectory(backupDir);

      return files
        .filter(f => f.filename.endsWith('.db'))
        .map(f => ({
          filename: f.basename || path.basename(f.filename),
          date: f.lastmod || '',
          size: f.size || 0
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error: any) {
      console.error('Failed to list database backups:', error);
      return [];
    }
  }

  /**
   * 恢复数据库（自动在线恢复）
   */
  async restoreDatabase(filename: string): Promise<boolean> {
    console.log(`\n========== Starting Database Restore ==========`);
    console.log(`Filename: ${filename}`);
    console.log(`Initialized: ${this.isInitialized}`);

    if (!this.isInitialized) {
      console.log('⚠️ WebDAV not initialized, initializing...');
      const initialized = await this.initialize();
      if (!initialized) {
        console.error('❌ Failed to initialize WebDAV');
        return false;
      }
      console.log('✅ WebDAV initialized successfully');
    }

    const Database = require('better-sqlite3');
    let tempDb = null;

    try {
      const remotePath = `/literature-review-ai/backups/database/${filename}`;
      const tempDir = path.join(process.cwd(), 'data', 'temp');
      const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');

      // 确保临时目录存在
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, `restore-${Date.now()}.db`);
      const backupPath = `${dbPath}.backup-${Date.now()}`;

      console.log(`📥 Step 1/5: Downloading backup from WebDAV...`);
      console.log(`   Remote: ${remotePath}`);
      console.log(`   Temp: ${tempPath}`);

      // 1. 下载备份文件
      await webdavService.downloadFile(remotePath, tempPath);
      console.log(`✅ Download completed`);

      // 2. 验证下载的文件
      console.log(`\n🔍 Step 2/5: Validating backup file...`);
      if (!fs.existsSync(tempPath)) {
        throw new Error('下载的备份文件不存在');
      }

      const stats = fs.statSync(tempPath);
      if (stats.size === 0) {
        fs.unlinkSync(tempPath);
        throw new Error('下载的备份文件为空');
      }
      console.log(`✅ File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // 验证是否为有效的 SQLite 数据库
      try {
        tempDb = new Database(tempPath, { readonly: true });
        const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        console.log(`✅ Valid SQLite database with ${tables.length} tables`);
        tempDb.close();
        tempDb = null;
      } catch (error) {
        if (tempDb) tempDb.close();
        fs.unlinkSync(tempPath);
        throw new Error('下载的文件不是有效的 SQLite 数据库');
      }

      // 3. 备份当前数据库
      console.log(`\n💾 Step 3/5: Backing up current database...`);
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        console.log(`✅ Current database backed up to: ${backupPath}`);
      }

      // 4. 使用 SQLite 的 VACUUM INTO 来安全替换数据库
      console.log(`\n🔄 Step 4/5: Restoring database using VACUUM INTO...`);
      const sourceDb = new Database(tempPath, { readonly: true });
      const targetPath = `${dbPath}.new-${Date.now()}`;

      // 使用 VACUUM INTO 创建新数据库
      sourceDb.exec(`VACUUM INTO '${targetPath}'`);
      sourceDb.close();
      console.log(`✅ Database vacuumed to: ${targetPath}`);

      // 5. 关闭当前数据库连接并替换文件
      console.log(`\n🔄 Step 5/5: Replacing database file...`);
      const { closeDatabase, resetDatabase } = require('./db');

      try {
        closeDatabase();
        console.log('✅ Database connection closed');
      } catch (error) {
        console.log('⚠️ Database close warning:', error);
      }

      // 等待文件句柄释放
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 替换数据库文件
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      fs.renameSync(targetPath, dbPath);
      console.log(`✅ Database file replaced`);

      // 重置数据库实例
      resetDatabase();
      console.log(`✅ Database instance reset`);

      // 清理临时文件
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      console.log(`\n✅ Database restored successfully from: ${filename}`);
      console.log(`📝 Backup of old database: ${backupPath}`);

      return true;
    } catch (error: any) {
      console.error('❌ Failed to restore database:', error);

      // 清理临时文件
      if (tempDb) {
        try {
          tempDb.close();
        } catch (e) {
          // ignore
        }
      }

      return false;
    }
  }
}

// 导出单例实例
export const webdavSyncManager = new WebDAVSyncManager();
