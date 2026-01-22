import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare(`
      SELECT id, plan_content, version, created_at
      FROM review_plans
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const plan = stmt.get(projectId);

    return NextResponse.json({
      success: true,
      data: plan || null,
    });
  } catch (error) {
    console.error('获取撰写计划失败:', error);
    return NextResponse.json(
      { success: false, error: '获取撰写计划失败' },
      { status: 500 }
    );
  }
}
