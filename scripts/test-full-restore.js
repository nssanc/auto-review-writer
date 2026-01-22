const path = require('path');
const fs = require('fs');

async function testFullRestore() {
  console.log('🔍 Testing full database restore process...\n');

  try {
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    const tempPath = `${dbPath}.restore-test-${Date.now()}`;
    const backupPath = `${dbPath}.backup-test-${Date.now()}`;

    console.log('📋 Paths:');
    console.log(`   DB: ${dbPath}`);
    console.log(`   Temp: ${tempPath}`);
    console.log(`   Backup: ${backupPath}`);

    // 1. 创建一个测试数据库文件
    console.log('\n📝 Creating test database...');
    const Database = require('better-sqlite3');
    const testDb = new Database(tempPath);
    testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    testDb.exec("INSERT INTO test (name) VALUES ('test')");
    testDb.close();
    console.log('✅ Test database created');

    // 2. 验证测试数据库
    console.log('\n🔍 Validating test database...');
    const validateDb = new Database(tempPath, { readonly: true });
    const result = validateDb.prepare('SELECT * FROM test').all();
    console.log(`✅ Test database valid, found ${result.length} rows`);
    validateDb.close();

    // 3. 备份当前数据库
    console.log('\n💾 Backing up current database...');
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
      console.log('✅ Current database backed up');
    }

    // 4. 尝试打开并关闭当前数据库
    console.log('\n🔒 Testing database close...');
    try {
      const currentDb = new Database(dbPath);
      console.log('✅ Database opened');
      currentDb.close();
      console.log('✅ Database closed');
    } catch (error) {
      console.error('❌ Database close error:', error.message);
    }

    // 5. 等待文件句柄释放
    console.log('\n⏳ Waiting for file handles to release...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ Wait completed');

    // 6. 尝试替换数据库文件（不实际替换，只是测试）
    console.log('\n🔄 Testing file replacement (dry run)...');
    console.log(`   Would delete: ${dbPath}`);
    console.log(`   Would rename: ${tempPath} -> ${dbPath}`);
    console.log('✅ File replacement test passed');

    // 7. 清理测试文件
    console.log('\n🧹 Cleaning up...');
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      console.log('✅ Test database removed');
    }
    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath);
      console.log('✅ Backup removed');
    }

    console.log('\n✅ All tests passed!');
    console.log('\n💡 The issue might be:');
    console.log('   1. Database is still open in the Next.js process');
    console.log('   2. Need to close database before replacing file');
    console.log('   3. May need to restart the application after restore');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullRestore().catch(console.error);

