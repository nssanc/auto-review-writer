import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// GET - 获取同步日志
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // 获取日志
    const stmt = db.prepare(`
      SELECT * FROM webdav_sync_log
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const logs = stmt.all(limit, offset);

    // 获取总数
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM webdav_sync_log');
    const countResult = countStmt.get() as any;

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total: countResult?.count || 0,
        limit,
        offset,
      },
    });
  } catch (error: any) {
    console.error('获取同步日志失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
