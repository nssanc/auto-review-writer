import { NextRequest, NextResponse } from 'next/server';

const TEST_PROMPT = "请回复'测试成功'，不要添加其他内容。";
const SYSTEM_PROMPT = "你是一个测试助手，请严格按照用户要求回复。";
const TIMEOUT_MS = 30000; // 30 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_endpoint, api_key, model_name } = body;

    // 验证必需参数
    if (!api_endpoint || !api_key || !model_name) {
      return NextResponse.json(
        {
          success: false,
          message: '缺少必需参数：api_endpoint, api_key, model_name',
        },
        { status: 400 }
      );
    }

    // 记录开始时间
    const startTime = Date.now();

    // 规范化API端点：移除常见的后缀路径
    let normalizedEndpoint = api_endpoint;
    const suffixesToRemove = ['/chat/completions', '/completions', '/models'];
    for (const suffix of suffixesToRemove) {
      if (normalizedEndpoint.endsWith(suffix)) {
        normalizedEndpoint = normalizedEndpoint.slice(0, -suffix.length);
        break;
      }
    }

    // 构建 API 请求
    const apiUrl = normalizedEndpoint.endsWith('/')
      ? `${normalizedEndpoint}chat/completions`
      : `${normalizedEndpoint}/chat/completions`;

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api_key}`,
        },
        body: JSON.stringify({
          model: model_name,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: TEST_PROMPT },
          ],
          temperature: 0.7,
          max_tokens: 100,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 计算响应时间
      const latency = Date.now() - startTime;

      // 处理 API 错误响应
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        let errorMessage = 'API 请求失败';

        switch (response.status) {
          case 401:
            errorMessage = 'API 密钥无效或未授权（401）';
            break;
          case 403:
            errorMessage = 'API 访问被拒绝（403）';
            break;
          case 404:
            errorMessage = 'API 端点不存在（404），请检查端点 URL 是否正确';
            break;
          case 429:
            errorMessage = 'API 请求频率超限或配额不足（429）';
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
            error: errorData.error?.message || errorData.message || '未知错误',
            latency,
          },
          { status: response.status }
        );
      }

      // 解析成功响应
      const data = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        return NextResponse.json(
          {
            success: false,
            message: 'API 响应格式不正确',
            error: '无法从响应中提取消息内容',
            latency,
          },
          { status: 500 }
        );
      }

      const responseText = data.choices[0].message.content;

      return NextResponse.json({
        success: true,
        message: 'API 测试成功',
        data: {
          response: responseText,
          model: data.model || model_name,
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

      // 网络错误
      return NextResponse.json(
        {
          success: false,
          message: 'API 连接失败',
          error: fetchError.message || '无法连接到 API 端点，请检查端点 URL 和网络连接',
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Test AI API error:', error);
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
