import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || 'zh';

    const stmt = db.prepare(`
      SELECT id, content, language, version, created_at
      FROM review_drafts
      WHERE project_id = ? AND language = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const draft = stmt.get(projectId, language);

    return NextResponse.json({
      success: true,
      data: draft || null,
    });
  } catch (error) {
    console.error('获取草稿失败:', error);
    return NextResponse.json(
      { success: false, error: '获取草稿失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { content, language } = body;

    if (!content || !language) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // Check if draft exists
    const checkStmt = db.prepare(`
      SELECT id FROM review_drafts
      WHERE project_id = ? AND language = ?
    `);
    const existing = checkStmt.get(projectId, language);

    if (existing) {
      // Update existing draft
      const updateStmt = db.prepare(`
        UPDATE review_drafts
        SET content = ?, version = version + 1
        WHERE project_id = ? AND language = ?
      `);
      updateStmt.run(content, projectId, language);
    } else {
      // Create new draft
      const insertStmt = db.prepare(`
        INSERT INTO review_drafts (project_id, content, language, version)
        VALUES (?, ?, ?, 1)
      `);
      insertStmt.run(projectId, content, language);
    }

    return NextResponse.json({
      success: true,
      message: '保存成功',
    });
  } catch (error) {
    console.error('保存草稿失败:', error);
    return NextResponse.json(
      { success: false, error: '保存草稿失败' },
      { status: 500 }
    );
  }
}
