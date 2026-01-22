import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '未找到文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '只支持Word文档（.doc, .docx）' },
        { status: 400 }
      );
    }

    // 验证文件大小（限制10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '文件大小不能超过10MB' },
        { status: 400 }
      );
    }

    // 将文件转换为Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用mammoth解析Word文档
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Word文档内容为空' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        content: text,
        filename: file.name,
        size: file.size,
      },
    });
  } catch (error: any) {
    console.error('解析Word文档失败:', error);
    return NextResponse.json(
      { success: false, error: '解析Word文档失败: ' + error.message },
      { status: 500 }
    );
  }
}
