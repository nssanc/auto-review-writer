import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 读取文件内容
    const text = await file.text();

    // 解析CSV/Excel
    let papers: any[] = [];

    if (file.name.endsWith('.csv')) {
      papers = parseCSV(text);
    } else {
      return NextResponse.json(
        { error: '暂时只支持CSV格式，Excel支持即将推出' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: papers,
      message: `成功导入 ${papers.length} 篇文献`
    });
  } catch (error) {
    console.error('导入文献失败:', error);
    return NextResponse.json(
      { error: '导入文献失败' },
      { status: 500 }
    );
  }
}

function parseCSV(text: string): any[] {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  // 解析表头
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

  // 查找列索引
  const titleIndex = headers.findIndex(h =>
    h.includes('题目') || h.includes('标题') || h.toLowerCase().includes('title')
  );
  const authorIndex = headers.findIndex(h =>
    h.includes('作者') || h.toLowerCase().includes('author')
  );
  const abstractIndex = headers.findIndex(h =>
    h.includes('摘要') || h.toLowerCase().includes('abstract')
  );
  const urlIndex = headers.findIndex(h =>
    h.includes('链接') || h.includes('来源') || h.toLowerCase().includes('url')
  );
  const publishedIndex = headers.findIndex(h =>
    h.includes('时间') || h.includes('日期') || h.toLowerCase().includes('date') || h.toLowerCase().includes('published')
  );

  // 解析数据行
  const papers = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length > 0 && titleIndex >= 0 && values[titleIndex]) {
      papers.push({
        title: values[titleIndex] || '',
        authors: authorIndex >= 0 ? values[authorIndex] || '' : '',
        abstract: abstractIndex >= 0 ? values[abstractIndex] || '' : '',
        url: urlIndex >= 0 ? values[urlIndex] || '' : '',
        published: publishedIndex >= 0 ? values[publishedIndex] || '' : '',
      });
    }
  }

  return papers;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}
