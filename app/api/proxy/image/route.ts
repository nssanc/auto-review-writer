import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: '缺少图片URL参数' },
        { status: 400 }
      );
    }

    // 验证URL格式
    try {
      new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: '无效的图片URL' },
        { status: 400 }
      );
    }

    // 获取图片
    const response = await fetch(imageUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `获取图片失败: ${response.status}` },
        { status: response.status }
      );
    }

    // 获取图片数据
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    // 返回图片
    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('代理图片失败:', error);
    return NextResponse.json(
      { error: '代理图片失败' },
      { status: 500 }
    );
  }
}
