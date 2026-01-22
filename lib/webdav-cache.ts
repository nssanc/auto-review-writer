import fs from 'fs';
import crypto from 'crypto';
import db from './db';
import { webdavService } from './webdav';
import { WebDAVFileCache } from './webdav-types';

/**
 * WebDAV 缓存管理器
 */
export class WebDAVCacheManager {
  /**
   * 获取文件缓存信息
   */
  getCacheInfo(filePath: string): WebDAVFileCache | null {
    try {
      const stmt = db.prepare('SELECT * FROM webdav_file_cache WHERE file_path = ?');
      const cache = stmt.get(filePath) as WebDAVFileCache | undefined;
      return cache || null;
    } catch (error) {
      console.error('Failed to get cache info:', error);
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
   * 检查文件是否需要同步
   */
  needsSync(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const cache = this.getCacheInfo(filePath);
    if (!cache) {
      return true; // 没有缓存记录，需要同步
    }

    // 检查文件是否被修改
    const currentHash = this.calculateFileHash(filePath);
    return currentHash !== cache.file_hash;
  }

  /**
   * 从云端获取文件
   */
  async getFromCloud(filePath: string): Promise<boolean> {
    try {
      const cache = this.getCacheInfo(filePath);
      if (!cache) {
        console.error('No cache info found for file:', filePath);
        return false;
      }

      await webdavService.downloadFileWithRetry(cache.remote_path, filePath);
      console.log(`✅ Downloaded from cloud: ${filePath}`);
      return true;
    } catch (error) {
      console.error('Failed to get from cloud:', error);
      return false;
    }
  }

  /**
   * 清除缓存记录
   */
  clearCache(filePath?: string): void {
    try {
      if (filePath) {
        const stmt = db.prepare('DELETE FROM webdav_file_cache WHERE file_path = ?');
        stmt.run(filePath);
      } else {
        const stmt = db.prepare('DELETE FROM webdav_file_cache');
        stmt.run();
      }
      console.log('✅ Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * 获取所有待同步的文件
   */
  getPendingFiles(): WebDAVFileCache[] {
    try {
      const stmt = db.prepare('SELECT * FROM webdav_file_cache WHERE sync_status = ?');
      return stmt.all('pending') as WebDAVFileCache[];
    } catch (error) {
      console.error('Failed to get pending files:', error);
      return [];
    }
  }
}

// 导出单例实例
export const webdavCacheManager = new WebDAVCacheManager();
