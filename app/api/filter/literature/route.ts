import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { papers, projectId, topN = 20 } = body;

    if (!papers || papers.length === 0) {
      return NextResponse.json(
        { error: '没有文献可以筛选' },
        { status: 400 }
      );
    }

    // 获取项目关键词
    const keywordsStmt = db.prepare(`
      SELECT keyword, is_primary FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC
    `);
    const keywords = keywordsStmt.all(projectId) as any[];

    // 获取项目信息
    const projectStmt = db.prepare('SELECT name, description FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId) as any;

    // 构建提示词
    let prompt = `作为一个学术文献筛选专家，请从以下 ${papers.length} 篇文献中筛选出最相关的 ${topN} 篇。

项目主题: ${project?.name || ''}
${project?.description ? `项目描述: ${project.description}` : ''}
`;

    if (keywords.length > 0) {
      const primaryKws = keywords.filter(k => k.is_primary === 1).map(k => k.keyword);
      const secondaryKws = keywords.filter(k => k.is_primary === 0).map(k => k.keyword);

      if (primaryKws.length > 0) {
        prompt += `\n核心关键词: ${primaryKws.join(', ')}`;
      }
      if (secondaryKws.length > 0) {
        prompt += `\n相关关键词: ${secondaryKws.join(', ')}`;
      }
    }

    prompt += `\n\n文献列表:\n`;
    papers.forEach((paper: any, index: number) => {
      prompt += `\n${index + 1}. 标题: ${paper.title}\n`;
      prompt += `   作者: ${paper.authors}\n`;
      prompt += `   摘要: ${paper.abstract.substring(0, 300)}...\n`;
    });

    prompt += `\n请根据以下标准筛选文献:
1. 与项目主题和关键词的相关性
2. 研究的创新性和重要性
3. 发表时间（优先考虑近期文献）
4. 作者权威性

请返回JSON格式，包含筛选出的文献索引（从1开始）:
{
  "selectedIndices": [1, 3, 5, ...],
  "reason": "简要说明筛选理由"
}`;

    const response = await aiService.chat(prompt);

    // 解析AI响应
    const cleanedResponse = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const result = JSON.parse(cleanedResponse);

    // 根据索引筛选文献
    const filteredPapers = result.selectedIndices
      .map((idx: number) => papers[idx - 1])
      .filter((p: any) => p !== undefined);

    return NextResponse.json({
      success: true,
      data: {
        filteredPapers,
        reason: result.reason,
        originalCount: papers.length,
        filteredCount: filteredPapers.length
      },
    });
  } catch (error) {
    console.error('筛选文献失败:', error);
    return NextResponse.json(
      { error: '筛选文献失败' },
      { status: 500 }
    );
  }
}
