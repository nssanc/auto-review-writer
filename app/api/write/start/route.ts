import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import aiService from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, language, options } = body;

    if (!projectId || !language) {
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

    // 获取参考文献列表（上传的文献）
    const papersStmt = db.prepare(`
      SELECT filename, extracted_text FROM reference_papers
      WHERE project_id = ?
    `);
    const papers = papersStmt.all(projectId) as any[];

    // 获取搜索保存的文献（只获取已选择的）
    const literatureStmt = db.prepare(`
      SELECT id, title, authors, abstract, doi, url, source FROM searched_literature
      WHERE project_id = ? AND is_selected = 1
      ORDER BY created_at
    `);
    const literature = literatureStmt.all(projectId) as any[];

    // 获取项目关键词
    const keywordsStmt = db.prepare(`
      SELECT keyword, category, is_primary FROM project_keywords
      WHERE project_id = ?
      ORDER BY is_primary DESC, created_at ASC
    `);
    const keywords = keywordsStmt.all(projectId) as any[];

    // 创建统一的编号文献列表
    const numberedReferences: Array<{
      id: number;
      title: string;
      authors?: string;
      abstract?: string;
      doi?: string;
      url?: string;
      source?: string;
    }> = [];

    // 添加搜索的文献到编号列表
    literature.forEach((lit) => {
      numberedReferences.push({
        id: lit.id,
        title: lit.title,
        authors: lit.authors,
        abstract: lit.abstract,
        doi: lit.doi,
        url: lit.url,
        source: lit.source
      });
    });

    // 构建给AI的参考文献列表（带编号）
    let references = '## 参考文献列表（请使用编号引用）\n\n';
    numberedReferences.forEach((ref, index) => {
      const num = index + 1;
      references += `[${num}] ${ref.title}\n`;
      if (ref.authors) {
        references += `    作者: ${ref.authors}\n`;
      }
      if (ref.abstract) {
        references += `    摘要: ${ref.abstract.substring(0, 300)}...\n`;
      }
      if (ref.doi) {
        references += `    DOI: ${ref.doi}\n`;
      }
      references += '\n';
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
          let fullContent = '';

          // 调用AI流式写作
          for await (const chunk of aiService.streamWriteReview(
            plan.plan_content,
            guide?.writing_guide || '',
            references,
            language,
            options
          )) {
            fullContent += chunk;
            controller.enqueue(encoder.encode(chunk));
          }

          // 保存到数据库
          const saveStmt = db.prepare(`
            INSERT INTO review_drafts (project_id, content, language, version)
            VALUES (?, ?, ?, 1)
          `);
          saveStmt.run(projectId, fullContent, language);

          controller.close();
        } catch (error) {
          console.error('AI写作错误:', error);
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
    console.error('启动AI写作失败:', error);
    return NextResponse.json(
      { error: '启动AI写作失败' },
      { status: 500 }
    );
  }
}
