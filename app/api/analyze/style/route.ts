import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少项目ID' },
        { status: 400 }
      );
    }

    // 获取项目的参考文献
    const stmt = db.prepare(`
      SELECT extracted_text FROM reference_papers
      WHERE project_id = ? AND extracted_text IS NOT NULL
    `);
    const papers = stmt.all(projectId) as any[];

    if (papers.length === 0) {
      return NextResponse.json(
        { error: '未找到参考文献' },
        { status: 404 }
      );
    }

    // 合并所有文献文本（限制长度）
    const combinedText = papers
      .map(p => p.extracted_text)
      .join('\n\n')
      .substring(0, 10000);

    // 调用AI进行风格分析
    const analysisResult = await aiService.analyzeStyle(combinedText);

    // 生成写作指南
    const writingGuide = await aiService.generateWritingGuide(analysisResult);

    // 保存到数据库
    const saveStmt = db.prepare(`
      INSERT INTO style_analysis (project_id, analysis_result, writing_guide)
      VALUES (?, ?, ?)
    `);
    const result = saveStmt.run(projectId, analysisResult, writingGuide);

    // 更新项目状态
    db.prepare('UPDATE projects SET status = ? WHERE id = ?').run('analyzing', projectId);

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        analysisResult,
        writingGuide,
      },
    });
  } catch (error) {
    console.error('风格分析错误:', error);
    return NextResponse.json(
      { error: '风格分析失败' },
      { status: 500 }
    );
  }
}

