import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 获取所有图像处理API配置
export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM image_processing_apis ORDER BY priority DESC, id ASC');
    const apis = stmt.all();

    // 隐藏API密钥
    const maskedApis = apis.map((api: any) => ({
      ...api,
      api_key_masked: api.api_key ? `${api.api_key.substring(0, 8)}...` : '',
      api_key: undefined
    }));

    return NextResponse.json({
      success: true,
      data: maskedApis,
    });
  } catch (error) {
    console.error('获取图像处理API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '获取配置失败' },
      { status: 500 }
    );
  }
}

// 添加新的图像处理API配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, api_endpoint, api_key, is_active = 1, priority = 0 } = body;

    if (!name || !api_endpoint || !api_key) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO image_processing_apis (name, api_endpoint, api_key, is_active, priority)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(name, api_endpoint, api_key, is_active, priority);

    return NextResponse.json({
      success: true,
      data: { id: result.lastInsertRowid },
    });
  } catch (error) {
    console.error('添加图像处理API配置失败:', error);
    return NextResponse.json(
      { success: false, error: '添加配置失败' },
      { status: 500 }
    );
  }
}
