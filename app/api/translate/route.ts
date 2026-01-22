import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, abstract } = body;

    if (!title || !abstract) {
      return NextResponse.json(
        { error: '缺少标题或摘要' },
        { status: 400 }
      );
    }

    // 使用AI翻译
    const prompt = `请将以下英文学术文献的标题和摘要翻译成中文。保持学术性和准确性。

标题：${title}

摘要：${abstract}

请按以下格式返回：
标题：[翻译后的标题]
摘要：[翻译后的摘要]`;

    const client = (aiService as any).getClient();
    const response = await client.chat.completions.create({
      model: (aiService as any).currentModel || 'gpt-4',
      messages: [
        { role: 'system', content: '你是一个专业的学术翻译专家。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
    });

    const result = response.choices[0].message.content || '';

    // 解析翻译结果
    const titleMatch = result.match(/标题[：:]\s*(.+?)(?=\n|$)/);
    const abstractMatch = result.match(/摘要[：:]\s*([\s\S]+)/);

    return NextResponse.json({
      success: true,
      data: {
        title: titleMatch ? titleMatch[1].trim() : result.split('\n')[0],
        abstract: abstractMatch ? abstractMatch[1].trim() : result,
      },
    });
  } catch (error) {
    console.error('翻译失败:', error);
    return NextResponse.json(
      { error: '翻译失败' },
      { status: 500 }
    );
  }
}
