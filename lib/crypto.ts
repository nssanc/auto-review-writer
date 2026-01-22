import crypto from 'crypto';

// 加密算法配置
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;

// 生成密钥派生
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha256');
}

/**
 * 加密密码
 * @param plaintext 明文密码
 * @param masterPassword 主密码（用于派生加密密钥）
 * @returns 加密后的字符串（格式：salt:iv:tag:encrypted）
 */
export function encryptPassword(plaintext: string, masterPassword: string = process.env.ENCRYPTION_KEY || 'default-master-key'): string {
  try {
    // 生成随机 salt 和 IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // 派生密钥
    const key = deriveKey(masterPassword, salt);

    // 创建加密器
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    // 加密数据
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // 获取认证标签
    const tag = cipher.getAuthTag();

    // 组合所有部分：salt:iv:tag:encrypted
    return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Password encryption failed:', error);
    throw new Error('Failed to encrypt password');
  }
}

/**
 * 解密密码
 * @param encryptedData 加密的数据（格式：salt:iv:tag:encrypted）
 * @param masterPassword 主密码
 * @returns 解密后的明文密码
 */
export function decryptPassword(encryptedData: string, masterPassword: string = process.env.ENCRYPTION_KEY || 'default-master-key'): string {
  try {
    // 分割加密数据
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [saltHex, ivHex, tagHex, encrypted] = parts;

    // 转换为 Buffer
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');

    // 派生密钥
    const key = deriveKey(masterPassword, salt);

    // 创建解密器
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // 解密数据
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Password decryption failed:', error);
    throw new Error('Failed to decrypt password');
  }
}
