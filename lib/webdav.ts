import { createClient, WebDAVClient, FileStat } from 'webdav';
import fs from 'fs';
import path from 'path';
import { WebDAVClientConfig, ConnectionTestResult } from './webdav-types';

// 重试配置
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1秒
const MAX_DELAY = 30000; // 30秒
const BACKOFF_MULTIPLIER = 2;

/**
 * WebDAV 客户端封装类
 */
export class WebDAVService {
  private client: WebDAVClient | null = null;
  private config: WebDAVClientConfig | null = null;

  /**
   * 连接到 WebDAV 服务器
   */
  async connect(config: WebDAVClientConfig): Promise<void> {
    try {
      this.config = config;
      this.client = createClient(config.url, {
        username: config.username,
        password: config.password,
      });

      // 测试连接
      await this.client.getDirectoryContents('/');
      console.log('✅ WebDAV connected successfully');
    } catch (error: any) {
      console.error('❌ WebDAV connection failed:', error);
      throw new Error(`Failed to connect to WebDAV: ${error.message}`);
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<ConnectionTestResult> {
    if (!this.client) {
      return {
        success: false,
        message: 'WebDAV client not initialized',
      };
    }

    const startTime = Date.now();
    try {
      await this.client.getDirectoryContents('/');
      const latency = Date.now() - startTime;

      return {
        success: true,
        message: 'Connection successful',
        latency,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed',
      };
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(remotePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      const exists = await this.client.exists(remotePath);
      if (!exists) {
        await this.client.createDirectory(remotePath, { recursive: true });
        console.log(`✅ Created directory: ${remotePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to create directory ${remotePath}:`, error);
      throw error;
    }
  }

  /**
   * 上传文件
   */
  async uploadFile(localPath: string, remotePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      // 确保远程目录存在
      const remoteDir = path.dirname(remotePath);
      await this.ensureDirectory(remoteDir);

      // 读取本地文件
      const fileContent = fs.readFileSync(localPath);

      // 上传到 WebDAV
      await this.client.putFileContents(remotePath, fileContent);
      console.log(`✅ Uploaded: ${localPath} -> ${remotePath}`);
    } catch (error: any) {
      console.error(`❌ Upload failed: ${localPath}`, error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(remotePath: string, localPath: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      // 确保本地目录存在
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        fs.mkdirSync(localDir, { recursive: true });
      }

      // 从 WebDAV 下载
      const fileContent = await this.client.getFileContents(remotePath);
      fs.writeFileSync(localPath, fileContent as Buffer);
      console.log(`✅ Downloaded: ${remotePath} -> ${localPath}`);
    } catch (error: any) {
      console.error(`❌ Download failed: ${remotePath}`, error);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(remotePath: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      await this.client.deleteFile(remotePath);
      console.log(`✅ Deleted: ${remotePath}`);
    } catch (error: any) {
      console.error(`❌ Delete failed: ${remotePath}`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * 上传文本内容
   */
  async uploadContent(remotePath: string, content: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      const dirPath = path.dirname(remotePath);
      await this.ensureDirectoryExists(dirPath);
      await this.client.putFileContents(remotePath, content, { overwrite: true });
      console.log(`✅ Uploaded content: ${remotePath}`);
    } catch (error: any) {
      console.error(`❌ Upload content failed: ${remotePath}`, error);
      throw new Error(`Failed to upload content: ${error.message}`);
    }
  }

  /**
   * 列出目录内容
   */
  async listDirectory(remotePath: string): Promise<FileStat[]> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      const contents = await this.client.getDirectoryContents(remotePath);
      return contents as FileStat[];
    } catch (error: any) {
      console.error(`❌ List directory failed: ${remotePath}`, error);
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * 检查文件是否存在
   */
  async exists(remotePath: string): Promise<boolean> {
    if (!this.client) {
      throw new Error('WebDAV client not initialized');
    }

    try {
      return await this.client.exists(remotePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 带重试的上传文件
   */
  async uploadFileWithRetry(localPath: string, remotePath: string, retries: number = MAX_RETRIES): Promise<void> {
    let lastError: Error | null = null;
    let delay = INITIAL_DELAY;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.uploadFile(localPath, remotePath);
        return; // 成功，直接返回
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Upload attempt ${attempt + 1}/${retries + 1} failed: ${error.message}`);

        if (attempt < retries) {
          // 等待后重试
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY);
        }
      }
    }

    throw lastError || new Error('Upload failed after retries');
  }

  /**
   * 带重试的下载文件
   */
  async downloadFileWithRetry(remotePath: string, localPath: string, retries: number = MAX_RETRIES): Promise<void> {
    let lastError: Error | null = null;
    let delay = INITIAL_DELAY;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await this.downloadFile(remotePath, localPath);
        return;
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Download attempt ${attempt + 1}/${retries + 1} failed: ${error.message}`);

        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * BACKOFF_MULTIPLIER, MAX_DELAY);
        }
      }
    }

    throw lastError || new Error('Download failed after retries');
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.client = null;
    this.config = null;
    console.log('✅ WebDAV disconnected');
  }
}

// 导出单例实例
export const webdavService = new WebDAVService();
