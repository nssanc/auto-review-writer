import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key } = body;

    if (!api_endpoint || !api_key) {
      return NextResponse.json(
        { success: false, error: '缺少API端点或密钥' },
        { status: 400 }
      );
    }

    // 尝试获取模型列表
    try {
      // 构建models端点URL
      const modelsUrl = api_endpoint.replace(/\/v1.*$/, '/v1/models');

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${api_key}`,
        },
      });

      if (!response.ok) {
        return NextResponse.json(
          { success: false, error: `API返回错误: ${response.status}` },
          { status: 400 }
        );
      }

      const data = await response.json();

      // 提取模型列表
      let models: string[] = [];

      if (data.data && Array.isArray(data.data)) {
        // OpenAI格式 - 只返回实际存在的模型
        models = data.data
          .map((m: any) => m.id || m.model)
          .filter((id: string) => id); // 移除过滤条件，返回所有模型
      } else if (Array.isArray(data)) {
        // 简单数组格式
        models = data;
      }

      return NextResponse.json({
        success: true,
        data: models,
      });
    } catch (error: any) {
      console.error('获取模型列表失败:', error);
      return NextResponse.json(
        { success: false, error: '连接失败: ' + error.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('处理请求失败:', error);
    return NextResponse.json(
      { success: false, error: '处理请求失败' },
      { status: 500 }
    );
  }
}
