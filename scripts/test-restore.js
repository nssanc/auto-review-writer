const path = require('path');
const fs = require('fs');

// 测试恢复流程
async function testRestore() {
  console.log('🔍 Testing database restore process...\n');

  const dbPath = path.join(process.cwd(), 'data', 'app.db');
  console.log(`Database path: ${dbPath}`);
  console.log(`Database exists: ${fs.existsSync(dbPath)}`);

  if (fs.existsSync(dbPath)) {
    const stats = fs.statSync(dbPath);
    console.log(`Database size: ${(stats.size / 1024).toFixed(2)} KB`);
  }

  // 测试数据库是否可以打开
  console.log('\n📊 Testing database connection...');
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    console.log('✅ Database opened successfully');

    // 测试查询
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`✅ Found ${tables.length} tables`);

    db.close();
    console.log('✅ Database closed successfully');
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }

  // 测试 WebDAV 配置
  console.log('\n🌐 Testing WebDAV configuration...');
  try {
    const Database = require('better-sqlite3');
    const db = new Database(dbPath);
    const config = db.prepare('SELECT * FROM webdav_config WHERE enabled = 1 LIMIT 1').get();

    if (config) {
      console.log('✅ WebDAV is enabled');
      console.log(`   URL: ${config.url}`);
      console.log(`   Username: ${config.username}`);
    } else {
      console.log('⚠️ WebDAV is not enabled');
    }

    db.close();
  } catch (error) {
    console.error('❌ WebDAV config error:', error.message);
  }

  // 检查备份文件
  console.log('\n📦 Checking backup files...');
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir);
  const backups = files.filter(f => f.includes('backup'));
  console.log(`Found ${backups.length} backup files:`);
  backups.forEach(f => {
    const filePath = path.join(dataDir, f);
    const stats = fs.statSync(filePath);
    console.log(`   ${f} - ${(stats.size / 1024).toFixed(2)} KB`);
  });
}

testRestore().catch(console.error);
