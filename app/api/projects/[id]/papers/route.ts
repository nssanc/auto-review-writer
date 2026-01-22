import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import fs from 'fs';
import { webdavSyncManager } from '@/lib/webdav-sync';
import { getRemotePdfPath } from '@/lib/path-utils';
import { webdavService } from '@/lib/webdav';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare(`
      SELECT id, filename, file_type, created_at
      FROM reference_papers
      WHERE project_id = ?
      ORDER BY created_at DESC
    `);
    const papers = stmt.all(projectId);

    return NextResponse.json({
      success: true,
      data: papers,
    });
  } catch (error) {
    console.error('获取参考文献失败:', error);
    return NextResponse.json(
      { success: false, error: '获取参考文献失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(request.url);
    const paperId = searchParams.get('id');

    if (!paperId) {
      return NextResponse.json(
        { success: false, error: '缺少文献ID' },
        { status: 400 }
      );
    }

    // 1. 查询文献信息
    const stmt = db.prepare(`
      SELECT id, filename, file_path, project_id
      FROM reference_papers
      WHERE id = ? AND project_id = ?
    `);
    const paper = stmt.get(paperId, projectId) as any;

    if (!paper) {
      return NextResponse.json(
        { success: false, error: '文献不存在' },
        { status: 404 }
      );
    }

    // 2. 删除数据库记录
    const deleteStmt = db.prepare('DELETE FROM reference_papers WHERE id = ?');
    deleteStmt.run(paperId);

    // 3. 删除本地文件
    if (paper.file_path && fs.existsSync(paper.file_path)) {
      try {
        fs.unlinkSync(paper.file_path);
        console.log(`✅ 已删除本地文件: ${paper.file_path}`);
      } catch (error) {
        console.error('删除本地文件失败:', error);
      }
    }

    // 4. 删除 WebDAV 文件
    try {
      const remotePath = getRemotePdfPath(parseInt(projectId), paper.filename);
      await webdavService.deleteFile(remotePath);
      console.log(`✅ 已删除 WebDAV 文件: ${remotePath}`);
    } catch (error) {
      console.error('删除 WebDAV 文件失败:', error);
    }

    // 5. 清理文件缓存
    try {
      const cacheStmt = db.prepare('DELETE FROM webdav_file_cache WHERE file_path = ?');
      cacheStmt.run(paper.file_path);
    } catch (error) {
      console.error('清理文件缓存失败:', error);
    }

    return NextResponse.json({
      success: true,
      message: '文献删除成功',
    });
  } catch (error: any) {
    console.error('删除文献失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '删除文献失败' },
      { status: 500 }
    );
  }
}
