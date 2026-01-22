import mammoth from 'mammoth';
import fs from 'fs';

/**
 * 解析PDF文件
 */
export async function parsePDF(filePath: string): Promise<string> {
  try {
    // 使用 require 并处理可能的 default export
    let pdfParse;
    try {
      const pdfModule = require('pdf-parse');
      pdfParse = pdfModule.default || pdfModule;
    } catch (e) {
      // 如果 require 失败，尝试动态导入
      const pdfModule = await import('pdf-parse');
      pdfParse = pdfModule.default || pdfModule;
    }

    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error);
    throw new Error('PDF文件解析失败');
  }
}

/**
 * 解析Word文档
 */
export async function parseWord(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Word文档解析错误:', error);
    throw new Error('Word文档解析失败');
  }
}

/**
 * 根据文件类型自动选择解析方法
 */
export async function parseDocument(filePath: string, fileType: string): Promise<string> {
  const type = fileType.toLowerCase();

  if (type === 'pdf' || filePath.endsWith('.pdf')) {
    return await parsePDF(filePath);
  } else if (type === 'docx' || filePath.endsWith('.docx')) {
    return await parseWord(filePath);
  } else {
    throw new Error('不支持的文件类型');
  }
}
