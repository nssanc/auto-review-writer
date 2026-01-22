const path = require('path');
const fs = require('fs');

async function testAutoRestore() {
  console.log('🔍 Testing automatic database restore...\n');

  try {
    const Database = require('better-sqlite3');
    const testDir = path.join(process.cwd(), 'data', 'test-restore');

    // 确保测试目录存在
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const sourceDbPath = path.join(testDir, 'source.db');
    const targetDbPath = path.join(testDir, 'target.db');

    // 1. 创建源数据库
    console.log('📝 Step 1: Creating source database...');
    const sourceDb = new Database(sourceDbPath);
    sourceDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    sourceDb.exec("INSERT INTO test (name) VALUES ('restored data')");
    sourceDb.close();
    console.log('✅ Source database created');

    // 2. 测试 VACUUM INTO
    console.log('\n🔄 Step 2: Testing VACUUM INTO...');
    const readDb = new Database(sourceDbPath, { readonly: true });
    readDb.exec(`VACUUM INTO '${targetDbPath}'`);
    readDb.close();
    console.log('✅ VACUUM INTO completed');

    // 3. 验证目标数据库
    console.log('\n🔍 Step 3: Validating target database...');
    const targetDb = new Database(targetDbPath, { readonly: true });
    const result = targetDb.prepare('SELECT * FROM test').all();
    console.log(`✅ Found ${result.length} rows in target database`);
    console.log(`   Data: ${JSON.stringify(result)}`);
    targetDb.close();

    // 4. 清理测试文件
    console.log('\n🧹 Step 4: Cleaning up...');
    fs.unlinkSync(sourceDbPath);
    fs.unlinkSync(targetDbPath);
    fs.rmdirSync(testDir);
    console.log('✅ Test files cleaned up');

    console.log('\n✅ All tests passed! Auto-restore should work.');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testAutoRestore().catch(console.error);

