import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取单个模板
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stmt = db.prepare('SELECT * FROM review_templates WHERE id = ?');
    const template = stmt.get(id);

    if (!template) {
      return NextResponse.json(
        { error: '模板不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('获取模板失败:', error);
    return NextResponse.json(
      { error: '获取模板失败' },
      { status: 500 }
    );
  }
}

// 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, structure, is_default } = body;

    const stmt = db.prepare(`
      UPDATE review_templates
      SET name = ?, description = ?, structure = ?, is_default = ?
      WHERE id = ?
    `);
    stmt.run(name, description || null, structure, is_default ? 1 : 0, id);

    return NextResponse.json({
      success: true,
      message: '模板更新成功',
    });
  } catch (error) {
    console.error('更新模板失败:', error);
    return NextResponse.json(
      { error: '更新模板失败' },
      { status: 500 }
    );
  }
}

// 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stmt = db.prepare('DELETE FROM review_templates WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({
      success: true,
      message: '模板删除成功',
    });
  } catch (error) {
    console.error('删除模板失败:', error);
    return NextResponse.json(
      { error: '删除模板失败' },
      { status: 500 }
    );
  }
}
