import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key, model_name } = body;

    if (!api_endpoint || !api_key || !model_name) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 测试 AI 功能
    const result = await aiService.testAIFunction(api_endpoint, api_key, model_name);

    return NextResponse.json({
      success: true,
      data: {
        message: 'AI 功能测试成功',
        response: result,
      },
    });
  } catch (error: any) {
    console.error('测试 AI 功能失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '测试失败' },
      { status: 500 }
    );
  }
}
