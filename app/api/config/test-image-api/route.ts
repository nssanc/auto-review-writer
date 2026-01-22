import { NextRequest, NextResponse } from 'next/server';

const TEST_PROMPT = "A simple red circle on white background, minimalist style";
const TIMEOUT_MS = 60000; // 60 seconds (image generation is slower)

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

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      // 判断 API 类型并构建请求
      let apiUrl: string;
      let requestBody: any;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      };

      // 检查是否为 DALL-E 格式（OpenAI）
      if (model_name.toLowerCase().includes('dall-e') ||
          api_endpoint.includes('openai.com')) {
        apiUrl = api_endpoint.endsWith('/')
          ? `${api_endpoint}images/generations`
          : `${api_endpoint}/images/generations`;

        requestBody = {
          model: model_name,
          prompt: TEST_PROMPT,
          n: 1,
          size: '1024x1024',
        };
      } else {
        // Gemini 或其他格式（使用 chat completions）
        apiUrl = api_endpoint.endsWith('/')
          ? `${api_endpoint}chat/completions`
          : `${api_endpoint}/chat/completions`;

        requestBody = {
          model: model_name,
          messages: [
            {
              role: 'user',
              content: TEST_PROMPT,
            },
          ],
          temperature: 0.7,
        };
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 计算响应时间
      const latency = Date.now() - startTime;

      // 处理错误响应
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
            errorMessage = 'API 端点不存在（404），请检查端点 URL';
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

      // 解析响应
      const data = await response.json();
      let imageUrl: string | null = null;

      // 尝试从不同格式中提取图片 URL
      if (data.data && data.data[0]) {
        // DALL-E 格式
        imageUrl = data.data[0].url || data.data[0].b64_json;
        if (data.data[0].b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        }
      } else if (data.choices && data.choices[0]) {
        // Gemini 格式（从 message content 中提取）
        const content = data.choices[0].message?.content;
        if (content) {
          // 尝试提取 markdown 图片链接
          const markdownMatch = content.match(/!\[.*?\]\((.*?)\)/);
          if (markdownMatch) {
            imageUrl = markdownMatch[1];
          } else if (content.startsWith('http')) {
            imageUrl = content;
          } else if (content.includes('base64')) {
            imageUrl = content;
          }
        }
      } else if (data.url) {
        // 直接 URL 格式
        imageUrl = data.url;
      } else if (data.image) {
        imageUrl = data.image;
      }

      if (!imageUrl) {
        // 提供更详细的调试信息
        console.error('Image API response format:', JSON.stringify(data, null, 2));

        return NextResponse.json(
          {
            success: false,
            message: 'API 响应格式不正确',
            error: '无法从响应中提取图片 URL 或 Base64 数据。这可能不是图像生成 API，或者返回格式不支持。',
            debug: {
              responseKeys: Object.keys(data),
              hasData: !!data.data,
              hasChoices: !!data.choices,
              hasUrl: !!data.url,
              hasImage: !!data.image,
            },
            latency,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: '图像生成 API 测试成功',
        data: {
          imageUrl,
          model: data.model || model_name,
          testPrompt: TEST_PROMPT,
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
            error: '图像生成可能需要较长时间，请稍后重试',
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
    console.error('Test image API error:', error);
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
