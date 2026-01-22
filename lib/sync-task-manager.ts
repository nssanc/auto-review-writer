import db from './db';
import { v4 as uuidv4 } from 'uuid';

/**
 * 同步任务状态
 */
export type SyncTaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * 同步任务信息
 */
export interface SyncTask {
  id?: number;
  task_id: string;
  status: SyncTaskStatus;
  current_file: string | null;
  total_files: number;
  synced_files: number;
  failed_files: number;
  total_size: number;
  progress_percent: number;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
}

/**
 * 同步任务管理器
 */
class SyncTaskManager {
  /**
   * 创建新的同步任务
   */
  createTask(): string {
    const taskId = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO webdav_sync_tasks (task_id, status, total_files, synced_files, failed_files, progress_percent)
      VALUES (?, 'pending', 0, 0, 0, 0)
    `);
    stmt.run(taskId);
    return taskId;
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId: string, status: SyncTaskStatus, errorMessage?: string): void {
    const stmt = db.prepare(`
      UPDATE webdav_sync_tasks
      SET status = ?, error_message = ?, updated_at = CURRENT_TIMESTAMP,
          completed_at = CASE WHEN ? IN ('completed', 'failed', 'cancelled') THEN CURRENT_TIMESTAMP ELSE completed_at END
      WHERE task_id = ?
    `);
    stmt.run(status, errorMessage || null, status, taskId);
  }

  /**
   * 更新任务进度
   */
  updateTaskProgress(
    taskId: string,
    currentFile: string,
    syncedFiles: number,
    totalFiles: number,
    failedFiles: number = 0
  ): void {
    const progressPercent = totalFiles > 0 ? Math.round((syncedFiles / totalFiles) * 100) : 0;
    const stmt = db.prepare(`
      UPDATE webdav_sync_tasks
      SET current_file = ?, synced_files = ?, total_files = ?, failed_files = ?,
          progress_percent = ?, updated_at = CURRENT_TIMESTAMP
      WHERE task_id = ?
    `);
    stmt.run(currentFile, syncedFiles, totalFiles, failedFiles, progressPercent, taskId);
  }

  /**
   * 获取任务信息
   */
  getTask(taskId: string): SyncTask | null {
    const stmt = db.prepare('SELECT * FROM webdav_sync_tasks WHERE task_id = ?');
    return stmt.get(taskId) as SyncTask | null;
  }

  /**
   * 获取最新的任务
   */
  getLatestTask(): SyncTask | null {
    const stmt = db.prepare('SELECT * FROM webdav_sync_tasks ORDER BY started_at DESC LIMIT 1');
    return stmt.get() as SyncTask | null;
  }

  /**
   * 清理旧任务（保留最近10个）
   */
  cleanupOldTasks(): void {
    db.exec(`
      DELETE FROM webdav_sync_tasks
      WHERE id NOT IN (
        SELECT id FROM webdav_sync_tasks ORDER BY started_at DESC LIMIT 10
      )
    `);
  }
}

export const syncTaskManager = new SyncTaskManager();
