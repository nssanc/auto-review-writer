import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface PubmedPaper {
  pmid: string;
  title: string;
  authors: string[];
  abstract: string;
  journal: string;
  pubDate: string;
  doi?: string;
  url: string;
}

/**
 * 搜索PubMed论文
 */
export async function searchPubmed(
  query: string,
  maxResults: number = 10,
  yearFrom?: string,
  yearTo?: string
): Promise<PubmedPaper[]> {
  try {
    // 第一步：搜索获取PMID列表
    const pmids = await searchPMIDs(query, maxResults, yearFrom, yearTo);

    if (pmids.length === 0) {
      return [];
    }

    // 第二步：获取详细信息
    return await fetchPubmedDetails(pmids);
  } catch (error) {
    console.error('PubMed搜索错误:', error);
    throw new Error('PubMed搜索失败');
  }
}

/**
 * 搜索PMID列表
 */
async function searchPMIDs(
  query: string,
  maxResults: number,
  yearFrom?: string,
  yearTo?: string
): Promise<string[]> {
  const searchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi';

  // 构建查询字符串，添加年限筛选
  let searchTerm = query;
  if (yearFrom || yearTo) {
    const fromYear = yearFrom || '1900';
    const toYear = yearTo || new Date().getFullYear().toString();
    searchTerm += ` AND ${fromYear}:${toYear}[dp]`;
  }

  const response = await axios.get(searchUrl, {
    params: {
      db: 'pubmed',
      term: searchTerm,
      retmax: maxResults,
      retmode: 'json',
    },
  });

  return response.data.esearchresult?.idlist || [];
}

/**
 * 获取PubMed文章详细信息（分批处理避免URL过长）
 */
async function fetchPubmedDetails(pmids: string[]): Promise<PubmedPaper[]> {
  const fetchUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';
  const batchSize = 100; // 每批最多100个PMID
  const allPapers: PubmedPaper[] = [];

  // 分批处理PMID
  for (let i = 0; i < pmids.length; i += batchSize) {
    const batch = pmids.slice(i, i + batchSize);

    try {
      const response = await axios.get(fetchUrl, {
        params: {
          db: 'pubmed',
          id: batch.join(','),
          retmode: 'xml',
        },
      });

      const papers = await parsePubmedXML(response.data);
      allPapers.push(...papers);

      // 添加延迟避免API速率限制（NCBI建议每秒不超过3个请求）
      if (i + batchSize < pmids.length) {
        await new Promise(resolve => setTimeout(resolve, 350));
      }
    } catch (error) {
      console.error(`获取PMID批次 ${i}-${i + batch.length} 失败:`, error);
      // 继续处理下一批，不中断整个流程
    }
  }

  return allPapers;
}

/**
 * 解析PubMed XML数据
 */
async function parsePubmedXML(xmlData: string): Promise<PubmedPaper[]> {
  try {
    const result = await parseStringPromise(xmlData);
    const articles = result.PubmedArticleSet?.PubmedArticle || [];

    return articles.map((article: any) => {
      const medlineCitation = article.MedlineCitation?.[0];
      const articleData = medlineCitation?.Article?.[0];
      const pmid = medlineCitation?.PMID?.[0]?._ || medlineCitation?.PMID?.[0] || '';

      return parsePubmedArticle(pmid, articleData);
    });
  } catch (error) {
    console.error('PubMed XML解析错误:', error);
    return [];
  }
}

/**
 * 解析单篇PubMed文章
 */
function parsePubmedArticle(pmid: string, articleData: any): PubmedPaper {
  // 解析标题（可能是字符串或对象）
  const titleRaw = articleData?.ArticleTitle?.[0];
  const title = typeof titleRaw === 'string' ? titleRaw : (titleRaw?._ || '');

  const journal = articleData?.Journal?.[0]?.Title?.[0] || '';

  // 解析摘要
  const abstractTexts = articleData?.Abstract?.[0]?.AbstractText || [];
  const abstract = abstractTexts.map((text: any) => {
    return typeof text === 'string' ? text : text._ || '';
  }).join(' ');

  // 解析作者
  const authorList = articleData?.AuthorList?.[0]?.Author || [];
  const authors = authorList.map((author: any) => {
    const lastName = author.LastName?.[0] || '';
    const foreName = author.ForeName?.[0] || '';
    return `${foreName} ${lastName}`.trim();
  });

  // 解析发表日期
  const pubDate = articleData?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0];
  const year = pubDate?.Year?.[0] || '';
  const month = pubDate?.Month?.[0] || '';
  const pubDateStr = `${year}-${month}`.trim();

  // 解析DOI
  const articleIds = articleData?.ELocationID || [];
  const doiObj = articleIds.find((id: any) => id.$.EIdType === 'doi');
  const doi = doiObj?._ || '';

  return {
    pmid,
    title,
    authors,
    abstract,
    journal,
    pubDate: pubDateStr,
    doi,
    url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
  };
}
