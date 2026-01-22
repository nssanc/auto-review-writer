import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: planId } = await params;
    const body = await request.json();
    const { plan_content } = body;

    if (!plan_content) {
      return NextResponse.json(
        { error: '缺少计划内容' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      UPDATE review_plans
      SET plan_content = ?
      WHERE id = ?
    `);
    stmt.run(plan_content, planId);

    return NextResponse.json({
      success: true,
      message: '撰写计划已更新',
    });
  } catch (error) {
    console.error('更新撰写计划失败:', error);
    return NextResponse.json(
      { error: '更新撰写计划失败' },
      { status: 500 }
    );
  }
}
