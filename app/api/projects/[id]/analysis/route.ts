import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare(`
      SELECT id, analysis_result, writing_guide, created_at
      FROM style_analysis
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const analysis = stmt.get(projectId);

    return NextResponse.json({
      success: true,
      data: analysis || null,
    });
  } catch (error) {
    console.error('获取风格分析失败:', error);
    return NextResponse.json(
      { success: false, error: '获取风格分析失败' },
      { status: 500 }
    );
  }
}
