import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, language } = body;

    if (!projectId || !language) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取草稿内容
    const stmt = db.prepare(`
      SELECT content FROM review_drafts
      WHERE project_id = ? AND language = ?
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const draft = stmt.get(projectId, language) as any;

    if (!draft) {
      return NextResponse.json(
        { error: '未找到草稿' },
        { status: 404 }
      );
    }

    // 创建输出目录
    const outputDir = path.join(process.cwd(), 'outputs');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 生成文件名
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `review_${projectId}_${language}_${timestamp}.md`;
    const filepath = path.join(outputDir, filename);

    // 写入文件
    fs.writeFileSync(filepath, draft.content, 'utf-8');

    // 同步到 WebDAV（异步执行，不阻塞响应）
    try {
      const { webdavSyncManager } = await import('@/lib/webdav-sync');
      webdavSyncManager.syncOutputFile(filepath).catch(error => {
        console.error('WebDAV sync failed:', error);
      });
    } catch (error) {
      console.error('Failed to trigger WebDAV sync:', error);
    }

    return NextResponse.json({
      success: true,
      filename,
      filepath,
    });
  } catch (error) {
    console.error('导出Markdown失败:', error);
    return NextResponse.json(
      { error: '导出Markdown失败' },
      { status: 500 }
    );
  }
}

