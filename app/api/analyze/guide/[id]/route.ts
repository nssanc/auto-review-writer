import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: analysisId } = await params;
    const body = await request.json();
    const { writing_guide } = body;

    if (!writing_guide) {
      return NextResponse.json(
        { error: '缺少写作指南内容' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      UPDATE style_analysis
      SET writing_guide = ?
      WHERE id = ?
    `);
    stmt.run(writing_guide, analysisId);

    return NextResponse.json({
      success: true,
      message: '写作指南已更新',
    });
  } catch (error) {
    console.error('更新写作指南失败:', error);
    return NextResponse.json(
      { error: '更新写作指南失败' },
      { status: 500 }
    );
  }
}
