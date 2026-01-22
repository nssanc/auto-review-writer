import { NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - 获取同步状态
export async function GET() {
  try {
    // 获取配置
    const configStmt = db.prepare('SELECT * FROM webdav_config LIMIT 1');
    const config = configStmt.get() as any;

    if (!config) {
      return NextResponse.json({
        success: true,
        data: {
          enabled: false,
          lastSyncAt: null,
          pendingFiles: 0,
        },
      });
    }

    // 获取待同步文件数量
    const pendingStmt = db.prepare('SELECT COUNT(*) as count FROM webdav_file_cache WHERE sync_status = ?');
    const pendingResult = pendingStmt.get('pending') as any;

    return NextResponse.json({
      success: true,
      data: {
        enabled: config.enabled === 1,
        autoSync: config.auto_sync === 1,
        syncInterval: config.sync_interval,
        lastSyncAt: config.last_sync_at,
        pendingFiles: pendingResult?.count || 0,
      },
    });
  } catch (error: any) {
    console.error('获取同步状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
