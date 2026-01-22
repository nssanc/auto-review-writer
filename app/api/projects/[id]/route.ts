import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;

    const stmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('获取项目详情失败:', error);
    return NextResponse.json(
      { success: false, error: '获取项目详情失败' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { name, description } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: '项目名称不能为空' },
        { status: 400 }
      );
    }

    // 更新项目信息
    const stmt = db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(name.trim(), description || '', projectId);

    // 获取更新后的项目
    const getStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = getStmt.get(projectId);

    return NextResponse.json({
      success: true,
      data: project,
      message: '项目更新成功',
    });
  } catch (error) {
    console.error('更新项目失败:', error);
    return NextResponse.json(
      { success: false, error: '更新项目失败' },
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

    // 删除相关的子表数据
    db.prepare('DELETE FROM reference_papers WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM style_analysis WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM review_plans WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM searched_literature WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM review_drafts WHERE project_id = ?').run(projectId);
    db.prepare('DELETE FROM project_keywords WHERE project_id = ?').run(projectId);

    // 删除项目
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(projectId);

    return NextResponse.json({
      success: true,
      message: '项目删除成功',
    });
  } catch (error) {
    console.error('删除项目失败:', error);
    return NextResponse.json(
      { success: false, error: '删除项目失败' },
      { status: 500 }
    );
  }
}
