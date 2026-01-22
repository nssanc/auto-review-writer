import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';
import { db } from '@/lib/db';

// AI分类文献
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    // 获取项目关键词
    const keywordsStmt = db.prepare(`
      SELECT keyword, category, is_primary
      FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC
    `);
    const keywords = keywordsStmt.all(projectId) as any[];

    if (keywords.length === 0) {
      return NextResponse.json(
        { error: '请先添加项目关键词' },
        { status: 400 }
      );
    }

    // 获取未分类的文献
    const literatureStmt = db.prepare(`
      SELECT id, title, abstract, authors
      FROM searched_literature
      WHERE project_id = ? AND is_selected = 1
    `);
    const literature = literatureStmt.all(projectId) as any[];

    if (literature.length === 0) {
      return NextResponse.json(
        { error: '没有需要分类的文献' },
        { status: 400 }
      );
    }

    // 构建分类提示词
    const keywordList = keywords.map(k =>
      `${k.keyword}${k.category ? ` (${k.category})` : ''}`
    ).join(', ');

    const prompt = `作为学术文献分类专家，请基于以下项目关键词对文献进行分类：

项目关键词：${keywordList}

请将每篇文献分类到以下类别之一：
1. 方法类 - 介绍算法、技术、工具
2. 应用类 - 描述应用场景、案例、实践
3. 理论类 - 阐述概念、模型、框架
4. 数据类 - 涉及数据集、基准、评估

文献列表：
${literature.map((lit, idx) => `
[${idx + 1}] 标题：${lit.title}
摘要：${lit.abstract?.substring(0, 300) || '无摘要'}
`).join('\n')}

请按以下JSON格式返回（不要包含markdown代码块标记）：
{
  "classifications": [
    {"id": 文献ID, "category": "分类", "relevance": "相关性说明", "keywords": ["匹配的关键词"]},
    ...
  ]
}`;

    // 调用AI进行分类
    const response = await aiService.chat(prompt);

    // 解析AI返回的JSON
    let classifications;
    try {
      const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      classifications = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      return NextResponse.json(
        { error: 'AI响应格式错误' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: classifications.classifications || [],
    });
  } catch (error) {
    console.error('分类文献失败:', error);
    return NextResponse.json(
      { error: '分类文献失败' },
      { status: 500 }
    );
  }
}
