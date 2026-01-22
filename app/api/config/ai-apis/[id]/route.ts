import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// PUT - 更新 AI 配置
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, api_endpoint, api_key, model_name, is_active, priority } = body;

    if (!name || !api_endpoint || !model_name) {
      return NextResponse.json(
        { success: false, error: '缺少必填项' },
        { status: 400 }
      );
    }

    // 构建更新语句
    let updateFields = [
      'name = ?',
      'api_endpoint = ?',
      'model_name = ?',
      'is_active = ?',
      'priority = ?',
      "updated_at = datetime('now')"
    ];
    let values = [name, api_endpoint, model_name, is_active ?? 1, priority ?? 0];

    // 如果提供了新密钥，则更新
    if (api_key) {
      updateFields.splice(2, 0, 'api_key = ?');
      values.splice(2, 0, api_key);
    }

    values.push(id);

    const stmt = db.prepare(`
      UPDATE ai_config
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);

    return NextResponse.json({
      success: true,
      message: 'AI 配置更新成功',
    });
  } catch (error: any) {
    console.error('更新 AI 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - 删除 AI 配置
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const stmt = db.prepare('DELETE FROM ai_config WHERE id = ?');
    stmt.run(id);

    return NextResponse.json({
      success: true,
      message: 'AI 配置删除成功',
    });
  } catch (error: any) {
    console.error('删除 AI 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
