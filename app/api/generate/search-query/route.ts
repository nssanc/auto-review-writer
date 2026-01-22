import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, source } = body;

    if (!keywords || keywords.length === 0) {
      return NextResponse.json(
        { error: '请提供至少一个关键词' },
        { status: 400 }
      );
    }

    // 构建提示词
    const primaryKeywords = keywords.filter((k: any) => k.isPrimary);
    const secondaryKeywords = keywords.filter((k: any) => !k.isPrimary);

    let prompt = `作为一个学术文献检索专家，请根据以下关键词生成一个专业的布尔检索式。

数据源: ${source === 'arxiv' ? 'arXiv' : 'PubMed'}

`;

    if (primaryKeywords.length > 0) {
      prompt += `核心关键词（必须包含）: ${primaryKeywords.map((k: any) => k.keyword).join(', ')}\n`;
    }
    if (secondaryKeywords.length > 0) {
      prompt += `相关关键词（可选包含）: ${secondaryKeywords.map((k: any) => k.keyword).join(', ')}\n`;
    }

    prompt += `
请生成一个优化的检索式，要求：
1. 使用布尔运算符（AND, OR, NOT）
2. 核心关键词之间用 AND 连接
3. 相关关键词可以用 OR 连接作为补充
4. 考虑同义词和相关术语
5. ${source === 'pubmed' ? '使用PubMed的MeSH术语和字段标签' : '使用arXiv的搜索语法'}
6. 检索式要简洁高效

请直接返回检索式，不要包含任何解释或额外文字。`;

    const response = await aiService.chat(prompt);

    // 清理响应
    let cleanedQuery = response;

    // 移除 <think> 标签及其内容
    cleanedQuery = cleanedQuery.replace(/<think>[\s\S]*?<\/think>/g, '');

    // 移除其他可能的XML标签
    cleanedQuery = cleanedQuery.replace(/<[^>]+>/g, '');

    // 移除markdown代码块标记
    cleanedQuery = cleanedQuery.replace(/```.*?\n/g, '').replace(/```/g, '');

    // 移除多余空白和换行
    cleanedQuery = cleanedQuery.trim();

    return NextResponse.json({
      success: true,
      data: {
        query: cleanedQuery,
      },
    });
  } catch (error) {
    console.error('生成检索式失败:', error);
    return NextResponse.json(
      { error: '生成检索式失败' },
      { status: 500 }
    );
  }
}
