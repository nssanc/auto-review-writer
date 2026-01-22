import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { status } = await request.json();
    const { id: projectId } = await params;

    if (!status) {
      return NextResponse.json(
        { success: false, error: '缺少状态参数' },
        { status: 400 }
      );
    }

    const validStatuses = ['draft', 'analyzing', 'writing', 'completed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: '无效的状态值' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('UPDATE projects SET status = ? WHERE id = ?');
    stmt.run(status, projectId);

    return NextResponse.json({
      success: true,
      message: '项目状态已更新',
    });
  } catch (error: any) {
    console.error('更新项目状态失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
