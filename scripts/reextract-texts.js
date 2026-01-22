const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// 数据库路径
const dbPath = path.join(__dirname, '../data/app.db');
const db = new Database(dbPath);

// PDF解析函数
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF解析错误:', error.message);
    return null;
  }
}

// Word解析函数
async function parseWord(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Word解析错误:', error.message);
    return null;
  }
}

// 主函数
async function reextractTexts() {
  console.log('开始重新提取文献文本...\n');

  // 获取所有参考文献
  const papers = db.prepare(`
    SELECT id, project_id, filename, file_path, file_type
    FROM reference_papers
  `).all();

  console.log(`找到 ${papers.length} 个文献记录\n`);

  let successCount = 0;
  let failCount = 0;

  for (const paper of papers) {
    console.log(`处理: ${paper.filename}`);
    console.log(`  文件路径: ${paper.file_path}`);

    // 检查文件是否存在
    if (!fs.existsSync(paper.file_path)) {
      console.log(`  ✗ 文件不存在\n`);
      failCount++;
      continue;
    }

    // 根据文件类型解析
    let extractedText = null;
    if (paper.file_type === 'pdf') {
      extractedText = await parsePDF(paper.file_path);
    } else if (paper.file_type === 'docx') {
      extractedText = await parseWord(paper.file_path);
    }

    if (extractedText && extractedText.length > 0) {
      // 更新数据库
      db.prepare(`
        UPDATE reference_papers
        SET extracted_text = ?
        WHERE id = ?
      `).run(extractedText, paper.id);

      console.log(`  ✓ 成功提取 ${extractedText.length} 字符\n`);
      successCount++;
    } else {
      console.log(`  ✗ 提取失败\n`);
      failCount++;
    }
  }

  console.log('\n=== 提取完成 ===');
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${failCount}`);
  console.log(`总计: ${papers.length}`);

  db.close();
}

reextractTexts().catch(console.error);
