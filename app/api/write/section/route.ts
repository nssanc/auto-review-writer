import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, language, sectionTitle, section, previousContent, options } = body;

    if (!projectId || !language || !sectionTitle || !section) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取撰写计划
    const planStmt = db.prepare(`
      SELECT plan_content FROM review_plans
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const plan = planStmt.get(projectId) as any;

    if (!plan) {
      return NextResponse.json(
        { error: '请先生成撰写计划' },
        { status: 400 }
      );
    }

    // 获取写作指南
    const guideStmt = db.prepare(`
      SELECT writing_guide FROM style_analysis
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const guide = guideStmt.get(projectId) as any;

    // 获取参考文献列表
    const papersStmt = db.prepare(`
      SELECT filename, extracted_text FROM reference_papers
      WHERE project_id = ?
    `);
    const papers = papersStmt.all(projectId) as any[];

    // 获取搜索保存的文献
    const literatureStmt = db.prepare(`
      SELECT title, authors, abstract FROM searched_literature
      WHERE project_id = ?
    `);
    const literature = literatureStmt.all(projectId) as any[];

    // 获取项目关键词
    const keywordsStmt = db.prepare(`
      SELECT keyword, category, is_primary FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC, created_at ASC
    `);
    const keywords = keywordsStmt.all(projectId) as any[];

    // 整合所有参考文献信息
    let references = '## 上传的参考文献\n';
    papers.forEach((p, i) => {
      references += `\n${i + 1}. ${p.filename}\n`;
      if (p.extracted_text) {
        references += `摘要: ${p.extracted_text.substring(0, 500)}...\n`;
      }
    });

    references += '\n## 搜索的相关文献\n';
    literature.forEach((lit, i) => {
      references += `\n${i + 1}. ${lit.title}\n`;
      references += `作者: ${lit.authors}\n`;
      references += `摘要: ${lit.abstract}\n`;
    });

    // 添加项目关键词信息
    if (keywords.length > 0) {
      references += '\n## 项目关键词\n';
      const primaryKeywords = keywords.filter(k => k.is_primary === 1);
      const secondaryKeywords = keywords.filter(k => k.is_primary === 0);

      if (primaryKeywords.length > 0) {
        references += '\n核心关键词: ' + primaryKeywords.map(k => k.keyword).join(', ') + '\n';
      }
      if (secondaryKeywords.length > 0) {
        references += '相关关键词: ' + secondaryKeywords.map(k => k.keyword).join(', ') + '\n';
      }
    }

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let sectionContent = '';

          // 调用AI按章节流式写作
          for await (const chunk of aiService.streamWriteReviewBySection(
            section,
            sectionTitle,
            plan.plan_content,
            guide?.writing_guide || '',
            references,
            previousContent || '',
            language,
            options
          )) {
            sectionContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          controller.close();
        } catch (error) {
          console.error('AI章节写作错误:', error);
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('启动章节写作失败:', error);
    return NextResponse.json(
      { error: '启动章节写作失败' },
      { status: 500 }
    );
  }
}
