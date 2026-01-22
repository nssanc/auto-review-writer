import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取所有模板
export async function GET() {
  try {
    const stmt = db.prepare(`
      SELECT * FROM review_templates
      ORDER BY is_default DESC, created_at DESC
    `);
    const templates = stmt.all();

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('获取模板失败:', error);
    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    );
  }
}

// 创建新模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, structure, is_default } = body;

    if (!name || !structure) {
      return NextResponse.json(
        { error: '模板名称和结构不能为空' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO review_templates (name, description, structure, is_default)
      VALUES (?, ?, ?, ?)
    `);
    const result = stmt.run(
      name,
      description || null,
      structure,
      is_default ? 1 : 0
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        message: '模板创建成功',
      },
    });
  } catch (error) {
    console.error('创建模板失败:', error);
    return NextResponse.json(
      { error: '创建模板失败' },
      { status: 500 }
    );
  }
}
