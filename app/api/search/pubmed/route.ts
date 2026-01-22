import { NextRequest, NextResponse } from 'next/server';
import { searchPubmed } from '@/lib/pubmed';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, maxResults = 50, yearFrom, yearTo, highImpactOnly } = body;

    if (!query) {
      return NextResponse.json(
        { error: '缺少搜索关键词' },
        { status: 400 }
      );
    }

    const results = await searchPubmed(query, maxResults, yearFrom, yearTo);

    // 高影响力期刊列表
    const highImpactJournals = [
      'Nature', 'Science', 'Cell', 'Lancet', 'NEJM', 'JAMA',
      'Nature Medicine', 'Nature Biotechnology', 'Nature Genetics',
      'Cell Stem Cell', 'Cell Metabolism', 'Immunity',
      'PNAS', 'PLoS Biology', 'eLife'
    ];

    // 转换数据格式
    let formattedResults = results.map(paper => ({
      title: paper.title,
      authors: paper.authors.join(', '),
      abstract: paper.abstract,
      url: paper.url,
      published: paper.pubDate,
      journal: paper.journal || '',
    }));

    // 如果启用高影响力筛选
    if (highImpactOnly) {
      formattedResults = formattedResults.filter(paper =>
        highImpactJournals.some(journal =>
          paper.journal.toLowerCase().includes(journal.toLowerCase())
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: formattedResults,
    });
  } catch (error) {
    console.error('PubMed搜索错误:', error);
    return NextResponse.json(
      { error: 'PubMed搜索失败' },
      { status: 500 }
    );
  }
}
