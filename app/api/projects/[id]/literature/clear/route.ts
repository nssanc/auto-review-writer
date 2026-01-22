import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare('DELETE FROM searched_literature WHERE project_id = ?');
    const result = stmt.run(projectId);

    return NextResponse.json({
      success: true,
      message: `已清除所有文献`,
      deletedCount: result.changes,
    });
  } catch (error) {
    console.error('清除文献失败:', error);
    return NextResponse.json(
      { error: '清除文献失败' },
      { status: 500 }
    );
  }
}
