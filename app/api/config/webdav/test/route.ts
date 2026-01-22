import { NextRequest, NextResponse } from 'next/server';
import { webdavService } from '@/lib/webdav';

// POST - 测试 WebDAV 连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, password } = body;

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填项' },
        { status: 400 }
      );
    }

    const startTime = Date.now();

    // 尝试连接
    await webdavService.connect({
      url,
      username,
      password,
      timeout: 10000,
    });

    // 测试连接
    const result = await webdavService.testConnection();
    const latency = Date.now() - startTime;

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: '连接成功',
        data: {
          latency,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('WebDAV 连接测试失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '连接失败' },
      { status: 500 }
    );
  }
}
