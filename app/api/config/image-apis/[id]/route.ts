import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 更新图像处理API配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { name, api_endpoint, api_key, model_name, is_active, priority } = body;
    const { id } = await params;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (api_endpoint !== undefined) {
      updates.push('api_endpoint = ?');
      values.push(api_endpoint);
    }
    if (api_key !== undefined && api_key !== '') {
      updates.push('api_key = ?');
      values.push(api_key);
    }
    if (model_name !== undefined) {
      updates.push('model_name = ?');
      values.push(model_name);
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      values.push(priority);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const stmt = db.prepare(`
      UPDATE image_processing_apis
      SET ${updates.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新图像处理API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '更新配置失败' },
      { status: 500 }
    );
  }
}

// 删除图像处理API配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stmt = db.prepare('DELETE FROM image_processing_apis WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除图像处理API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '删除配置失败' },
      { status: 500 }
    );
  }
}
