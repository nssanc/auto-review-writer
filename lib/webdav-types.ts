// WebDAV 配置接口
export interface WebDAVConfig {
  id?: number;
  url: string;
  username: string;
  password: string;
  enabled: number;
  auto_sync: number;
  sync_interval: number;
  last_sync_at?: string;
  created_at?: string;
  updated_at?: string;
}

// 同步任务类型
export type SyncType = 'upload' | 'download' | 'delete';

// 文件类型
export type FileType = 'file' | 'database' | 'output' | 'plan' | 'analysis' | 'keywords' | 'search' | 'article' | 'image';

// 同步状态
export type SyncStatus = 'pending' | 'success' | 'failed';

// 同步日志接口
export interface WebDAVSyncLog {
  id?: number;
  sync_type: SyncType;
  file_type: FileType;
  local_path: string;
  remote_path: string;
  status: SyncStatus;
  error_message?: string;
  file_size?: number;
  sync_duration?: number;
  retry_count: number;
  created_at?: string;
}

// 文件缓存接口
export interface WebDAVFileCache {
  id?: number;
  file_path: string;
  remote_path: string;
  file_hash?: string;
  file_size?: number;
  last_modified?: string;
  sync_status: 'synced' | 'pending' | 'failed';
  last_sync_at?: string;
  created_at?: string;
  updated_at?: string;
}

// 同步任务接口
export interface SyncTask {
  localPath: string;
  remotePath: string;
  fileType: FileType;
  syncType: SyncType;
  priority?: number;
}

// 同步结果接口
export interface SyncResult {
  success: boolean;
  message: string;
  syncedFiles?: number;
  failedFiles?: number;
  totalSize?: number;
  duration?: number;
  errors?: Array<{
    file: string;
    error: string;
  }>;
}

// 文件信息接口
export interface FileInfo {
  path: string;
  size: number;
  lastModified: Date;
  hash?: string;
}

// WebDAV 客户端配置
export interface WebDAVClientConfig {
  url: string;
  username: string;
  password: string;
  timeout?: number;
  maxRetries?: number;
}

// 连接测试结果
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latency?: number;
  serverInfo?: {
    type?: string;
    version?: string;
  };
}
