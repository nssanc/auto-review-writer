import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';
import { db } from '@/lib/db';

// AI推荐关键词
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { userKeywords, projectDescription } = body;

    if (!userKeywords || userKeywords.length === 0) {
      return NextResponse.json(
        { error: '请至少提供一个关键词' },
        { status: 400 }
      );
    }

    // 获取项目的写作指南
    const guideStmt = db.prepare(`
      SELECT writing_guide FROM style_analysis
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const guideData = guideStmt.get(projectId) as any;

    // 获取项目的撰写计划
    const planStmt = db.prepare(`
      SELECT plan_content FROM review_plans
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const planData = planStmt.get(projectId) as any;

    // 构建上下文信息
    let contextInfo = '';
    if (guideData?.writing_guide) {
      contextInfo += `\n\n写作指南内容：\n${guideData.writing_guide.substring(0, 2000)}`;
    }
    if (planData?.plan_content) {
      contextInfo += `\n\n撰写计划内容：\n${planData.plan_content.substring(0, 2000)}`;
    }

    const prompt = `作为一个学术研究助手，请基于以下信息推荐相关的研究关键词：

用户提供的关键词：${userKeywords.join(', ')}
${projectDescription ? `项目描述：${projectDescription}` : ''}
${contextInfo}

请根据上述写作指南和撰写计划的内容，推荐10-15个高度相关的学术关键词，包括：
1. 核心概念的同义词和相关术语
2. 相关的研究方法
3. 相关的应用领域
4. 相关的技术和工具
5. 与写作指南和计划主题相关的关键词

请按以下JSON格式返回（不要包含markdown代码块标记）：
{
  "keywords": [
    {"keyword": "关键词1", "category": "方法类/应用类/理论类/数据类", "relevance": "相关性说明"},
    ...
  ]
}`;

    const response = await aiService.chat(prompt);

    // 解析AI返回的JSON
    let suggestions;
    try {
      // 清理响应内容
      let cleanedResponse = response;

      // 移除 <think> 标签及其内容
      cleanedResponse = cleanedResponse.replace(/<think>[\s\S]*?<\/think>/g, '');

      // 移除其他可能的XML标签
      cleanedResponse = cleanedResponse.replace(/<[^>]+>/g, '');

      // 移除markdown代码块标记
      cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');

      // 尝试提取JSON对象
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      cleanedResponse = cleanedResponse.trim();
      suggestions = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('解析AI响应失败:', parseError);
      console.error('原始响应:', response.substring(0, 500));
      return NextResponse.json(
        { error: 'AI响应格式错误，请重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: suggestions.keywords || [],
    });
  } catch (error) {
    console.error('推荐关键词失败:', error);
    return NextResponse.json(
      { error: '推荐关键词失败' },
      { status: 500 }
    );
  }
}
