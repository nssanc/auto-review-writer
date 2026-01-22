const path = require('path');
const fs = require('fs');

async function testWebDAVRestore() {
  console.log('🔍 Testing WebDAV restore functionality...\n');

  try {
    // 1. 加载数据库
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    const db = new Database(dbPath);

    // 2. 获取 WebDAV 配置
    console.log('📋 Loading WebDAV configuration...');
    const config = db.prepare('SELECT * FROM webdav_config WHERE enabled = 1 LIMIT 1').get();

    if (!config) {
      console.error('❌ WebDAV is not enabled');
      db.close();
      return;
    }

    console.log('✅ WebDAV configuration loaded');
    console.log(`   URL: ${config.url}`);
    console.log(`   Username: ${config.username}`);

    db.close();

    // 3. 解密密码
    console.log('\n🔐 Decrypting password...');

    // 直接使用 crypto 模块解密
    const crypto = require('crypto');

    function decryptPassword(encrypted) {
      const parts = encrypted.split(':');
      const salt = Buffer.from(parts[0], 'hex');
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encryptedHex = parts[3];

      const masterPassword = process.env.ENCRYPTION_KEY || 'default-master-key';
      const key = crypto.pbkdf2Sync(masterPassword, salt, 100000, 32, 'sha256');
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }

    const password = decryptPassword(config.password);
    console.log('✅ Password decrypted');

    // 4. 连接 WebDAV
    console.log('\n🌐 Connecting to WebDAV...');
    const { createClient } = require('webdav');
    const client = createClient(config.url, {
      username: config.username,
      password: password,
    });

    // 5. 测试连接
    console.log('🔍 Testing WebDAV connection...');
    const contents = await client.getDirectoryContents('/');
    console.log(`✅ Connected! Found ${contents.length} items`);

    // 6. 列出备份文件
    console.log('\n📦 Listing database backups...');
    const backupDir = '/literature-review-ai/backups/database';
    try {
      const backups = await client.getDirectoryContents(backupDir);
      console.log(`✅ Found ${backups.length} backup files:`);
      backups.forEach(b => {
        console.log(`   ${b.basename} - ${(b.size / 1024 / 1024).toFixed(2)} MB`);
      });

      if (backups.length === 0) {
        console.log('⚠️ No backup files found');
        return;
      }

      // 7. 测试下载第一个备份文件
      const firstBackup = backups[0];
      console.log(`\n📥 Testing download of: ${firstBackup.basename}`);
      const remotePath = `${backupDir}/${firstBackup.basename}`;
      const tempPath = path.join(process.cwd(), 'data', `test-restore-${Date.now()}.db`);

      console.log(`   Remote: ${remotePath}`);
      console.log(`   Local: ${tempPath}`);

      const fileContent = await client.getFileContents(remotePath);
      fs.writeFileSync(tempPath, fileContent);
      console.log(`✅ Downloaded successfully`);

      // 8. 验证下载的文件
      const stats = fs.statSync(tempPath);
      console.log(`   File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      // 9. 验证是否为有效的 SQLite 数据库
      console.log('\n🔍 Validating SQLite database...');
      const Database = require('better-sqlite3');
      const testDb = new Database(tempPath, { readonly: true });
      const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      console.log(`✅ Valid database with ${tables.length} tables`);
      testDb.close();

      // 10. 清理测试文件
      fs.unlinkSync(tempPath);
      console.log('✅ Test file cleaned up');

      console.log('\n✅ All tests passed! WebDAV restore should work.');

    } catch (error) {
      console.error('❌ Error:', error.message);
      console.error('Stack:', error.stack);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testWebDAVRestore().catch(console.error);

