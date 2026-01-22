import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取项目关键词
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare(`
      SELECT * FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC, created_at ASC
    `);
    const keywords = stmt.all(projectId);

    return NextResponse.json({
      success: true,
      data: keywords,
    });
  } catch (error) {
    console.error('获取关键词失败:', error);
    return NextResponse.json(
      { error: '获取关键词失败' },
      { status: 500 }
    );
  }
}

// 添加关键词
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { keyword, category, is_primary } = body;

    if (!keyword) {
      return NextResponse.json(
        { error: '关键词不能为空' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO project_keywords (project_id, keyword, category, is_primary)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      projectId,
      keyword,
      category || null,
      is_primary ? 1 : 0
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        message: '关键词添加成功',
      },
    });
  } catch (error) {
    console.error('添加关键词失败:', error);
    return NextResponse.json(
      { error: '添加关键词失败' },
      { status: 500 }
    );
  }
}

// 删除关键词
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const keywordId = searchParams.get('keywordId');

    if (!keywordId) {
      return NextResponse.json(
        { error: '缺少关键词ID' },
        { status: 400 }
      );
    }

    const stmt = db.prepare('DELETE FROM project_keywords WHERE id = ?');
    stmt.run(keywordId);

    return NextResponse.json({
      success: true,
      message: '关键词删除成功',
    });
  } catch (error) {
    console.error('删除关键词失败:', error);
    return NextResponse.json(
      { error: '删除关键词失败' },
      { status: 500 }
    );
  }
}
