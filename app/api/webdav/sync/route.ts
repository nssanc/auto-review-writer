import { NextRequest, NextResponse } from 'next/server';
import { webdavSyncManager } from '@/lib/webdav-sync';
import { syncTaskManager } from '@/lib/sync-task-manager';

// POST - 手动全量同步
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, background = true } = body;

    if (action === 'full') {
      // 创建同步任务
      const taskId = syncTaskManager.createTask();

      if (background) {
        // 后台异步执行同步
        setImmediate(async () => {
          try {
            syncTaskManager.updateTaskStatus(taskId, 'running');
            const result = await webdavSyncManager.fullSync(taskId);
            syncTaskManager.updateTaskStatus(
              taskId,
              result.success ? 'completed' : 'failed',
              result.success ? undefined : result.message
            );
          } catch (error: any) {
            syncTaskManager.updateTaskStatus(taskId, 'failed', error.message);
          }
        });

        // 立即返回任务ID
        return NextResponse.json({
          success: true,
          message: '同步任务已启动',
          data: { taskId },
        });
      } else {
        // 同步执行（阻塞）
        syncTaskManager.updateTaskStatus(taskId, 'running');
        const result = await webdavSyncManager.fullSync(taskId);
        syncTaskManager.updateTaskStatus(
          taskId,
          result.success ? 'completed' : 'failed',
          result.success ? undefined : result.message
        );

        return NextResponse.json({
          success: result.success,
          message: result.message,
          data: {
            taskId,
            syncedFiles: result.syncedFiles,
            failedFiles: result.failedFiles,
            totalSize: result.totalSize,
            duration: result.duration,
            errors: result.errors,
          },
        });
      }
    }

    return NextResponse.json(
      { success: false, error: '无效的操作' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('同步失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
