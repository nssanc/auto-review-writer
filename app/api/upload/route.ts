import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file) {
      return NextResponse.json(
        { error: '未找到文件' },
        { status: 400 }
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少项目ID' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型，仅支持PDF和DOCX' },
        { status: 400 }
      );
    }

    // 创建上传目录
    const uploadDir = path.join(process.cwd(), 'uploads', projectId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `${Date.now()}-${file.name}`;
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    // 解析文档内容
    const { parseDocument } = await import('@/lib/parser');
    let extractedText = '';
    try {
      const fileType = file.name.endsWith('.pdf') ? 'pdf' : 'docx';
      extractedText = await parseDocument(filepath, fileType);
    } catch (error) {
      console.error('文档解析失败:', error);
    }

    // 保存到数据库
    const db = (await import('@/lib/db')).default;
    const stmt = db.prepare(`
      INSERT INTO reference_papers (project_id, filename, file_path, file_type, extracted_text)
      VALUES (?, ?, ?, ?, ?)
    `);

    const fileType = file.name.endsWith('.pdf') ? 'pdf' : 'docx';
    const result = stmt.run(projectId, file.name, filepath, fileType, extractedText);

    // 同步到 WebDAV（异步执行，不阻塞响应）
    try {
      const { webdavSyncManager } = await import('@/lib/webdav-sync');
      webdavSyncManager.syncUploadedFile(parseInt(projectId), filepath).catch(error => {
        console.error('WebDAV sync failed:', error);
      });
    } catch (error) {
      console.error('Failed to trigger WebDAV sync:', error);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        filename: file.name,
        filepath,
        fileType,
        extractedLength: extractedText.length,
      },
    });
  } catch (error) {
    console.error('文件上传错误:', error);
    return NextResponse.json(
      { error: '文件上传失败' },
      { status: 500 }
    );
  }
}
