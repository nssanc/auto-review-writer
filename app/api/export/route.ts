import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, language, format } = body;

    if (!projectId || !language || !format) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // Get draft content
    const stmt = db.prepare(`
      SELECT content FROM review_drafts
      WHERE project_id = ? AND language = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const draft = stmt.get(projectId, language) as any;

    if (!draft) {
      return NextResponse.json(
        { error: '未找到草稿' },
        { status: 404 }
      );
    }

    // Get selected literature for references
    const litStmt = db.prepare(`
      SELECT id, title, authors, doi, url, abstract, source
      FROM searched_literature
      WHERE project_id = ? AND is_selected = 1
      ORDER BY created_at
    `);
    const allLiterature = litStmt.all(projectId) as any[];

    // 解析文章中的引用编号
    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const citedNumbers = new Set<number>();

    let match;
    while ((match = citationRegex.exec(draft.content)) !== null) {
      // 解析引用编号，可能是 [1] 或 [1,2,3]
      const numbers = match[1].split(',').map(n => parseInt(n.trim()));
      numbers.forEach(num => {
        if (num > 0 && num <= allLiterature.length) {
          citedNumbers.add(num);
        }
      });
    }

    // 只包含被引用的文献
    const citedLiterature = Array.from(citedNumbers)
      .sort((a, b) => a - b)
      .map(num => allLiterature[num - 1])
      .filter(lit => lit !== undefined);

    // Build references section (only cited literature)
    let referencesSection = '\n\n## References\n\n';
    if (citedLiterature.length > 0) {
      citedLiterature.forEach((lit, index) => {
        const num = index + 1;
        referencesSection += `${num}. **${lit.title}**\n`;
        if (lit.authors) {
          referencesSection += `   Authors: ${lit.authors}\n`;
        }
        if (lit.doi) {
          referencesSection += `   DOI: ${lit.doi}\n`;
        }
        if (lit.url) {
          referencesSection += `   URL: ${lit.url}\n`;
        }
        if (lit.source) {
          referencesSection += `   Source: ${lit.source}\n`;
        }
        referencesSection += '\n';
      });
    } else {
      referencesSection += 'No references cited in the text.\n';
    }

    // Combine draft content with references
    const fullContent = draft.content + referencesSection;

    if (format === 'markdown') {
      // Export as Markdown
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="review_${language}.md"`,
        },
      });
    } else if (format === 'word') {
      // For Word export, we'll return markdown for now
      // In production, you'd use a library like docx or pandoc
      const blob = new Blob([fullContent], { type: 'text/plain' });
      return new NextResponse(blob, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="review_${language}.docx"`,
        },
      });
    }

    return NextResponse.json(
      { error: '不支持的格式' },
      { status: 400 }
    );
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}
