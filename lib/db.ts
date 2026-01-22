import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let dbInstance: Database.Database | null = null;

function getDb(): Database.Database {
  if (dbInstance) {
    return dbInstance;
  }

  // 使用绝对路径，确保在任何工作目录下都能找到数据库
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'app.db');
  const dbDir = path.dirname(dbPath);

  // 确保数据目录存在
  if (!fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`✅ Created database directory: ${dbDir}`);
    } catch (error) {
      console.error(`❌ Failed to create database directory: ${dbDir}`, error);
      throw error;
    }
  }

  // 创建数据库连接
  try {
    dbInstance = new Database(dbPath);
    console.log(`✅ Database connected: ${dbPath}`);
  } catch (error) {
    console.error(`❌ Failed to open database: ${dbPath}`, error);
    throw error;
  }

  // 启用外键约束
  dbInstance.pragma('foreign_keys = ON');

  return dbInstance;
}

// 关闭数据库连接
export function closeDatabase() {
  if (dbInstance) {
    try {
      dbInstance.close();
      dbInstance = null;
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Failed to close database:', error);
      throw error;
    }
  }
}

// 重置数据库实例（用于恢复后重新连接）
export function resetDatabase() {
  dbInstance = null;
}

// 导出 db 作为 getter
export const db = new Proxy({} as Database.Database, {
  get(target, prop) {
    return (getDb() as any)[prop];
  }
});

// 初始化数据库表
export function initDatabase() {
  // 创建projects表
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建reference_papers表
  db.exec(`
    CREATE TABLE IF NOT EXISTS reference_papers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT,
      extracted_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建style_analysis表
  db.exec(`
    CREATE TABLE IF NOT EXISTS style_analysis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      analysis_result TEXT,
      writing_guide TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建review_plans表
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      plan_content TEXT,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建searched_literature表
  db.exec(`
    CREATE TABLE IF NOT EXISTS searched_literature (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      source TEXT,
      title TEXT,
      authors TEXT,
      abstract TEXT,
      doi TEXT,
      url TEXT,
      pdf_url TEXT,
      metadata TEXT,
      is_selected INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建review_drafts表
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      content TEXT,
      language TEXT,
      version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建ai_config表（支持多个AI配置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_endpoint TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT DEFAULT 'gpt-4',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 迁移旧的 ai_config 数据（如果存在旧数据且没有 name 字段）
  try {
    const columns = db.pragma('table_info(ai_config)');
    const hasNameColumn = columns.some((col: any) => col.name === 'name');

    if (!hasNameColumn) {
      // 备份旧数据
      const oldConfigs = db.prepare('SELECT * FROM ai_config').all();

      // 删除旧表
      db.exec('DROP TABLE IF EXISTS ai_config');

      // 重新创建新表
      db.exec(`
        CREATE TABLE ai_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          api_endpoint TEXT NOT NULL,
          api_key TEXT NOT NULL,
          model_name TEXT DEFAULT 'gpt-4',
          is_active INTEGER DEFAULT 1,
          priority INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 迁移旧数据
      if (oldConfigs.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO ai_config (name, api_endpoint, api_key, model_name, is_active, priority, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        oldConfigs.forEach((config: any, index: number) => {
          insertStmt.run(
            `AI 配置 ${index + 1}`,
            config.api_endpoint,
            config.api_key,
            config.model_name || 'gpt-4',
            1,
            index,
            config.created_at,
            config.updated_at
          );
        });

        console.log(`✅ 已迁移 ${oldConfigs.length} 个 AI 配置`);
      }
    }
  } catch (error) {
    console.error('迁移 ai_config 表失败:', error);
  }

  // 创建project_keywords表
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_keywords (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      keyword TEXT NOT NULL,
      category TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    )
  `);

  // 创建review_templates表
  db.exec(`
    CREATE TABLE IF NOT EXISTS review_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      structure TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建writing_phrases表（学术用语库）
  db.exec(`
    CREATE TABLE IF NOT EXISTS writing_phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      phrase TEXT NOT NULL,
      usage TEXT,
      example TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建diagram_apis表（绘图API配置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS diagram_apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_endpoint TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT DEFAULT 'gemini-3-pro-view',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建image_processing_apis表（图像处理API配置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS image_processing_apis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_endpoint TEXT NOT NULL,
      api_key TEXT NOT NULL,
      model_name TEXT DEFAULT 'dall-e-3',
      is_active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建webdav_config表（WebDAV配置）
  db.exec(`
    CREATE TABLE IF NOT EXISTS webdav_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      enabled INTEGER DEFAULT 0,
      auto_sync INTEGER DEFAULT 1,
      sync_interval INTEGER DEFAULT 30,
      last_sync_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建webdav_sync_log表（同步日志）
  db.exec(`
    CREATE TABLE IF NOT EXISTS webdav_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sync_type TEXT NOT NULL,
      file_type TEXT NOT NULL,
      local_path TEXT NOT NULL,
      remote_path TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      file_size INTEGER,
      sync_duration INTEGER,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建webdav_file_cache表（文件缓存元数据）
  db.exec(`
    CREATE TABLE IF NOT EXISTS webdav_file_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL UNIQUE,
      remote_path TEXT NOT NULL,
      file_hash TEXT,
      file_size INTEGER,
      last_modified DATETIME,
      sync_status TEXT DEFAULT 'synced',
      last_sync_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 创建webdav_sync_tasks表（同步任务）
  db.exec(`
    CREATE TABLE IF NOT EXISTS webdav_sync_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL,
      current_file TEXT,
      total_files INTEGER DEFAULT 0,
      synced_files INTEGER DEFAULT 0,
      failed_files INTEGER DEFAULT 0,
      total_size INTEGER DEFAULT 0,
      progress_percent INTEGER DEFAULT 0,
      error_message TEXT,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('Database initialized successfully');
}

export default db;
