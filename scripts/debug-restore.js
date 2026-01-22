const path = require('path');
const fs = require('fs');

async function debugRestore() {
  console.log('🔍 Debugging restore process...\n');

  try {
    // 1. 加载数据库配置
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'app.db');
    const db = new Database(dbPath);

    // 2. 获取 WebDAV 配置
    console.log('📋 Step 1: Loading WebDAV config...');
    const config = db.prepare('SELECT * FROM webdav_config WHERE enabled = 1 LIMIT 1').get();

    if (!config) {
      console.error('❌ WebDAV is not enabled');
      db.close();
      return;
    }

    console.log('✅ WebDAV config loaded');
    db.close();

    // 3. 解密密码
    console.log('\n🔐 Step 2: Decrypting password...');
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
    console.log('\n🌐 Step 3: Connecting to WebDAV...');
    const { createClient } = require('webdav');
    const client = createClient(config.url, {
      username: config.username,
      password: password,
    });

    // 5. 列出备份文件
    console.log('\n📦 Step 4: Listing backups...');
    const backupDir = '/literature-review-ai/backups/database';
    const backups = await client.getDirectoryContents(backupDir);
    console.log(`✅ Found ${backups.length} backup files`);

    if (backups.length === 0) {
      console.log('⚠️ No backups found');
      return;
    }

    const firstBackup = backups[0];
    console.log(`   Using: ${firstBackup.basename}`);

    // 6. 下载备份文件
    console.log('\n📥 Step 5: Downloading backup...');
    const remotePath = `${backupDir}/${firstBackup.basename}`;
    const tempDir = path.join(process.cwd(), 'data', 'temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempPath = path.join(tempDir, `restore-${Date.now()}.db`);
    console.log(`   Remote: ${remotePath}`);
    console.log(`   Local: ${tempPath}`);

    const fileContent = await client.getFileContents(remotePath);
    fs.writeFileSync(tempPath, fileContent);
    console.log('✅ Download completed');

    // 7. 验证文件
    console.log('\n🔍 Step 6: Validating file...');
    const stats = fs.statSync(tempPath);
    console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

    const testDb = new Database(tempPath, { readonly: true });
    const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log(`✅ Valid database with ${tables.length} tables`);
    testDb.close();

    // 8. 测试 VACUUM INTO
    console.log('\n🔄 Step 7: Testing VACUUM INTO...');
    const targetPath = path.join(tempDir, `new-${Date.now()}.db`);
    console.log(`   Target: ${targetPath}`);

    const sourceDb = new Database(tempPath, { readonly: true });
    sourceDb.exec(`VACUUM INTO '${targetPath}'`);
    sourceDb.close();
    console.log('✅ VACUUM INTO completed');

    // 9. 清理
    console.log('\n🧹 Step 8: Cleaning up...');
    fs.unlinkSync(tempPath);
    fs.unlinkSync(targetPath);
    console.log('✅ Cleanup completed');

    console.log('\n✅ All steps passed! The restore process should work.');

  } catch (error) {
    console.error('\n❌ Error occurred:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugRestore().catch(console.error);
