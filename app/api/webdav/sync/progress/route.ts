import { NextRequest, NextResponse } from 'next/server';
import { syncTaskManager } from '@/lib/sync-task-manager';

// GET - 获取同步进度
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (taskId) {
      // 获取指定任务的进度
      const task = syncTaskManager.getTask(taskId);
      if (!task) {
        return NextResponse.json(
          { success: false, error: '任务不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: task,
      });
    } else {
      // 获取最新任务的进度
      const task = syncTaskManager.getLatestTask();
      return NextResponse.json({
        success: true,
        data: task,
      });
    }
  } catch (error: any) {
    console.error('获取同步进度失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
