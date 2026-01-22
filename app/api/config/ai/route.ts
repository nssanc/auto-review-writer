import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import aiService from '@/lib/ai';

// 获取当前 AI 配置
export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM ai_config ORDER BY id DESC LIMIT 1');
    const config = stmt.get() as any;

    if (config) {
      return NextResponse.json({
        success: true,
        data: {
          id: config.id,
          api_endpoint: config.api_endpoint,
          model_name: config.model_name,
          // 不返回完整的 API Key，只返回部分用于显示
          api_key_masked: config.api_key ? `${config.api_key.substring(0, 8)}...` : '',
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (error) {
    console.error('获取 AI 配置失败:', error);
    return NextResponse.json(
      { error: '获取 AI 配置失败' },
      { status: 500 }
    );
  }
}

// 保存或更新 AI 配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key, model_name } = body;

    if (!api_endpoint || !api_key) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 删除旧配置
    db.prepare('DELETE FROM ai_config').run();

    // 插入新配置
    const stmt = db.prepare(`
      INSERT INTO ai_config (api_endpoint, api_key, model_name)
      VALUES (?, ?, ?)
    `);
    const result = stmt.run(api_endpoint, api_key, model_name || 'gpt-4');

    // 重置 AI Service 客户端
    aiService.resetClient();

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        message: 'AI 配置已保存',
      },
    });
  } catch (error) {
    console.error('保存 AI 配置失败:', error);
    return NextResponse.json(
      { error: '保存 AI 配置失败' },
      { status: 500 }
    );
  }
}
