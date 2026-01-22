import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encryptPassword, decryptPassword } from '@/lib/crypto';

// GET - 获取所有 AI 配置
export async function GET(request: NextRequest) {
  try {
    const stmt = db.prepare('SELECT * FROM ai_config ORDER BY priority ASC, id ASC');
    const configs = stmt.all() as any[];

    // 脱敏处理
    const maskedConfigs = configs.map(config => ({
      ...config,
      api_key_masked: config.api_key ? `${config.api_key.substring(0, 8)}...` : '',
      api_key: undefined,
    }));

    return NextResponse.json({
      success: true,
      data: maskedConfigs,
    });
  } catch (error: any) {
    console.error('获取 AI 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 创建新的 AI 配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, api_endpoint, api_key, model_name, is_active, priority } = body;

    if (!name || !api_endpoint || !api_key || !model_name) {
      return NextResponse.json(
        { success: false, error: '缺少必填项' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO ai_config (name, api_endpoint, api_key, model_name, is_active, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      api_endpoint,
      api_key,
      model_name,
      is_active ?? 1,
      priority ?? 0
    );

    return NextResponse.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error: any) {
    console.error('创建 AI 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
