import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, papers, maxResults, customCriteria } = body;

    if (!projectId || !papers || papers.length === 0) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取项目信息
    const projectStmt = db.prepare('SELECT name, description FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId) as any;

    if (!project) {
      return NextResponse.json(
        { error: '项目不存在' },
        { status: 404 }
      );
    }

    // 获取项目关键词
    const keywordsStmt = db.prepare(`
      SELECT keyword FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC
    `);
    const keywords = keywordsStmt.all(projectId) as any[];
    const keywordList = keywords.map(k => k.keyword);

    // 调用AI筛选
    const researchTopic = project.description || project.name;
    const filteredPapers = await aiService.filterLiterature(
      papers,
      keywordList,
      researchTopic,
      maxResults || papers.length,
      customCriteria
    );

    return NextResponse.json({
      success: true,
      data: filteredPapers,
      message: `从${papers.length}篇文献中筛选出${filteredPapers.length}篇最相关的文献`
    });
  } catch (error) {
    console.error('AI筛选文献失败:', error);
    return NextResponse.json(
      { error: 'AI筛选文献失败' },
      { status: 500 }
    );
  }
}
