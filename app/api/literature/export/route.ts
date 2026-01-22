import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

/**
 * 将文献转换为 RIS 格式 (EndNote 和 Zotero 都支持)
 */
function convertToRIS(literature: any[]): string {
  let ris = '';

  literature.forEach((lit) => {
    ris += 'TY  - JOUR\n'; // Journal Article

    if (lit.title) {
      ris += `TI  - ${lit.title}\n`;
    }

    if (lit.authors) {
      // 分割作者名字
      const authors = lit.authors.split(/[,;]/).map((a: string) => a.trim());
      authors.forEach((author: string) => {
        ris += `AU  - ${author}\n`;
      });
    }

    if (lit.abstract) {
      ris += `AB  - ${lit.abstract}\n`;
    }

    if (lit.doi) {
      ris += `DO  - ${lit.doi}\n`;
    }

    if (lit.url) {
      ris += `UR  - ${lit.url}\n`;
    }

    if (lit.source) {
      ris += `DB  - ${lit.source}\n`;
    }

    // 尝试从 metadata 中提取年份
    if (lit.metadata) {
      try {
        const meta = JSON.parse(lit.metadata);
        if (meta.year || meta.published) {
          ris += `PY  - ${meta.year || meta.published}\n`;
        }
        if (meta.journal) {
          ris += `JO  - ${meta.journal}\n`;
        }
      } catch (e) {
        // 忽略 JSON 解析错误
      }
    }

    ris += 'ER  - \n\n';
  });

  return ris;
}

/**
 * 将文献转换为 BibTeX 格式
 */
function convertToBibTeX(literature: any[]): string {
  let bibtex = '';

  literature.forEach((lit, index) => {
    const key = `ref${index + 1}`;
    bibtex += `@article{${key},\n`;

    if (lit.title) {
      bibtex += `  title = {${lit.title}},\n`;
    }

    if (lit.authors) {
      bibtex += `  author = {${lit.authors}},\n`;
    }

    if (lit.abstract) {
      bibtex += `  abstract = {${lit.abstract}},\n`;
    }

    if (lit.doi) {
      bibtex += `  doi = {${lit.doi}},\n`;
    }

    if (lit.url) {
      bibtex += `  url = {${lit.url}},\n`;
    }

    // 尝试从 metadata 中提取更多信息
    if (lit.metadata) {
      try {
        const meta = JSON.parse(lit.metadata);
        if (meta.year || meta.published) {
          bibtex += `  year = {${meta.year || meta.published}},\n`;
        }
        if (meta.journal) {
          bibtex += `  journal = {${meta.journal}},\n`;
        }
      } catch (e) {
        // 忽略 JSON 解析错误
      }
    }

    bibtex += '}\n\n';
  });

  return bibtex;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, format, papers } = body;

    if (!format) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    let literature: any[] = [];

    // 如果提供了 papers 数组，直接使用（导出当前选中的文献）
    if (papers && Array.isArray(papers) && papers.length > 0) {
      literature = papers;
    }
    // 否则从数据库获取已保存的文献
    else if (projectId) {
      const stmt = db.prepare(`
        SELECT id, title, authors, abstract, doi, url, source, metadata
        FROM searched_literature
        WHERE project_id = ? AND is_selected = 1
        ORDER BY created_at
      `);
      literature = stmt.all(projectId) as any[];
    } else {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    if (literature.length === 0) {
      return NextResponse.json(
        { error: '没有可导出的文献' },
        { status: 404 }
      );
    }

    let content = '';
    let contentType = '';
    let filename = '';

    switch (format) {
      case 'ris':
        content = convertToRIS(literature);
        contentType = 'application/x-research-info-systems';
        filename = 'references.ris';
        break;

      case 'bibtex':
        content = convertToBibTeX(literature);
        contentType = 'application/x-bibtex';
        filename = 'references.bib';
        break;

      default:
        return NextResponse.json(
          { error: '不支持的格式' },
          { status: 400 }
        );
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('导出失败:', error);
    return NextResponse.json(
      { error: '导出失败' },
      { status: 500 }
    );
  }
}
