import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  updated: string;
  pdfUrl: string;
  categories: string[];
}

/**
 * 搜索arXiv论文
 */
export async function searchArxiv(
  query: string,
  maxResults: number = 10,
  start: number = 0
): Promise<ArxivPaper[]> {
  try {
    const url = 'http://export.arxiv.org/api/query';
    const params = {
      search_query: `all:${query}`,
      start,
      max_results: maxResults,
      sortBy: 'relevance',
      sortOrder: 'descending',
    };

    const response = await axios.get(url, { params });
    return await parseArxivXML(response.data);
  } catch (error) {
    console.error('arXiv搜索错误:', error);
    throw new Error('arXiv搜索失败');
  }
}

/**
 * 解析arXiv API返回的XML数据
 */
async function parseArxivXML(xmlData: string): Promise<ArxivPaper[]> {
  try {
    const result = await parseStringPromise(xmlData);
    const entries = result.feed?.entry || [];

    if (!Array.isArray(entries)) {
      return [parseEntry(entries)];
    }

    return entries.map(parseEntry);
  } catch (error) {
    console.error('XML解析错误:', error);
    return [];
  }
}

/**
 * 解析单个entry
 */
function parseEntry(entry: any): ArxivPaper {
  const id = entry.id?.[0] || '';
  const title = entry.title?.[0]?.trim() || '';
  const abstract = entry.summary?.[0]?.trim() || '';
  const published = entry.published?.[0] || '';
  const updated = entry.updated?.[0] || '';

  // 解析作者
  const authors = (entry.author || []).map((author: any) => author.name?.[0] || '');

  // 解析分类
  const categories = (entry.category || []).map((cat: any) => cat.$.term || '');

  // 获取PDF链接
  const links = entry.link || [];
  const pdfLink = links.find((link: any) => link.$.type === 'application/pdf');
  const pdfUrl = pdfLink?.$.href || '';

  return {
    id,
    title,
    authors,
    abstract,
    published,
    updated,
    pdfUrl,
    categories,
  };
}
