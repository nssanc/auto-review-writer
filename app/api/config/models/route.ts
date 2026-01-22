import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';

// 获取可用模型列表
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key } = body;

    if (!api_endpoint || !api_key) {
      return NextResponse.json(
        { success: false, error: '缺少 API 端点或密钥' },
        { status: 400 }
      );
    }

    // 调用 AI Service 获取模型列表
    const models = await aiService.listModels(api_endpoint, api_key);

    return NextResponse.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    console.error('获取模型列表失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '获取模型列表失败' },
      { status: 500 }
    );
  }
}
