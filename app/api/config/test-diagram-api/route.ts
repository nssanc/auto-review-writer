import { NextRequest, NextResponse } from 'next/server';

const TEST_MERMAID_CODE = `graph TD
    A[开始] --> B[处理]
    B --> C[结束]`;

const TIMEOUT_MS = 15000; // 15 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key, format = 'png' } = body;

    // 验证必需参数
    if (!api_endpoint) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必需参数：api_endpoint',
        },
        { status: 400 }
      );
    }

    // 记录开始时间
    const startTime = Date.now();

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      let imageUrl: string;

      // 判断是否为 Mermaid Ink API
      if (api_endpoint.includes('mermaid.ink')) {
        // Mermaid Ink 使用 Base64 编码的 URL
        const encoded = Buffer.from(TEST_MERMAID_CODE).toString('base64');
        imageUrl = `${api_endpoint}/img/${encoded}`;

        // 验证图片是否可访问
        const response = await fetch(imageUrl, {
          method: 'HEAD',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          return NextResponse.json(
            {
              success: false,
              message: `无法访问生成的图片（${response.status}）`,
              error: '请检查 API 端点是否正确',
            },
            { status: response.status }
          );
        }

      } else {
        // 自定义端点，使用 POST 请求
        const apiUrl = api_endpoint.endsWith('/')
          ? `${api_endpoint}generate`
          : `${api_endpoint}/generate`;

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (api_key) {
          headers['Authorization'] = `Bearer ${api_key}`;
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            code: TEST_MERMAID_CODE,
            format: format,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          let errorMessage = 'API 请求失败';

          switch (response.status) {
            case 401:
              errorMessage = 'API 密钥无效或未授权（401）';
              break;
            case 404:
              errorMessage = 'API 端点不存在（404），请检查端点 URL';
              break;
            case 429:
              errorMessage = 'API 请求频率超限（429）';
              break;
            case 500:
            case 502:
            case 503:
              errorMessage = `API 服务器错误（${response.status}）`;
              break;
            default:
              errorMessage = `API 请求失败（${response.status}）`;
          }

          return NextResponse.json(
            {
              success: false,
              message: errorMessage,
              error: errorData.error || errorData.message || '未知错误',
            },
            { status: response.status }
          );
        }

        const data = await response.json();
        imageUrl = data.imageUrl || data.url || data.image;

        if (!imageUrl) {
          return NextResponse.json(
            {
              success: false,
              message: 'API 响应格式不正确',
              error: '无法从响应中提取图片 URL',
            },
            { status: 500 }
          );
        }
      }

      // 计算响应时间
      const latency = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        message: '绘图 API 测试成功',
        data: {
          imageUrl,
          format,
          testCode: TEST_MERMAID_CODE,
          latency,
        },
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          {
            success: false,
            message: `API 请求超时（超过 ${TIMEOUT_MS / 1000} 秒）`,
            error: '请检查网络连接或尝试其他 API 端点',
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: 'API 连接失败',
          error: fetchError.message || '无法连接到 API 端点',
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Test diagram API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: '测试过程中发生错误',
        error: error.message || '未知错误',
      },
      { status: 500 }
    );
  }
}
