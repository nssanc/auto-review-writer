const fs = require('fs');
const path = require('path');

// 测试PDF解析
async function testPDFParse() {
  try {
    console.log('开始测试PDF解析...\n');

    // 测试pdf-parse是否安装
    let pdfParse;
    try {
      const pdfParseModule = require('pdf-parse');
      // pdf-parse 可能是 default export 或直接 export
      pdfParse = pdfParseModule.default || pdfParseModule;
      console.log('✓ pdf-parse 模块已安装');
      console.log('  模块类型:', typeof pdfParse);
    } catch (error) {
      console.error('✗ pdf-parse 模块未安装:', error.message);
      return;
    }

    // 查找上传的PDF文件
    const uploadsDir = path.join(__dirname, '../uploads');
    const projectDirs = fs.readdirSync(uploadsDir);

    console.log(`\n找到 ${projectDirs.length} 个项目目录\n`);

    for (const projectDir of projectDirs) {
      const projectPath = path.join(uploadsDir, projectDir);
      if (!fs.statSync(projectPath).isDirectory()) continue;

      const files = fs.readdirSync(projectPath);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));

      console.log(`项目 ${projectDir}: 找到 ${pdfFiles.length} 个PDF文件`);

      for (const pdfFile of pdfFiles) {
        const filePath = path.join(projectPath, pdfFile);
        const fileSize = fs.statSync(filePath).size;

        console.log(`\n测试文件: ${pdfFile}`);
        console.log(`文件大小: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

        try {
          const dataBuffer = fs.readFileSync(filePath);
          console.log('✓ 文件读取成功');

          const data = await pdfParse(dataBuffer);
          console.log(`✓ PDF解析成功`);
          console.log(`  - 页数: ${data.numpages}`);
          console.log(`  - 文本长度: ${data.text.length} 字符`);
          console.log(`  - 前100字符: ${data.text.substring(0, 100).replace(/\n/g, ' ')}`);
        } catch (error) {
          console.error('✗ PDF解析失败:', error.message);
        }
      }
    }

  } catch (error) {
    console.error('测试失败:', error);
  }
}

testPDFParse();
