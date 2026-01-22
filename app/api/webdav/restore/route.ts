import { NextRequest, NextResponse } from 'next/server';
import { webdavSyncManager } from '@/lib/webdav-sync';

// GET - 列出可恢复的备份
export async function GET(request: NextRequest) {
  try {
    const backups = await webdavSyncManager.listDatabaseBackups();

    return NextResponse.json({
      success: true,
      data: backups,
    });
  } catch (error: any) {
    console.error('获取备份列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 恢复数据库
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filename } = body;

    if (!filename) {
      return NextResponse.json(
        { success: false, error: '缺少文件名' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting database restore for: ${filename}`);
    const success = await webdavSyncManager.restoreDatabase(filename);

    if (success) {
      return NextResponse.json({
        success: true,
        message: '数据库恢复成功！旧数据库已自动备份。',
      });
    } else {
      return NextResponse.json(
        { success: false, error: '数据库恢复失败，请查看服务器日志获取详细信息' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ 恢复数据库失败:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: `恢复失败: ${error.message}` },
      { status: 500 }
    );
  }
}
