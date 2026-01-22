import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { templateId } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: '缺少模板ID' },
        { status: 400 }
      );
    }

    // Get template
    const templateStmt = db.prepare('SELECT * FROM review_templates WHERE id = ?');
    const template = templateStmt.get(templateId) as any;

    if (!template) {
      return NextResponse.json(
        { success: false, error: '模板不存在' },
        { status: 404 }
      );
    }

    // Check if project exists
    const projectStmt = db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = projectStmt.get(projectId);

    if (!project) {
      return NextResponse.json(
        { success: false, error: '项目不存在' },
        { status: 404 }
      );
    }

    // Create or update review plan with template structure
    const checkPlanStmt = db.prepare('SELECT id FROM review_plans WHERE project_id = ?');
    const existingPlan = checkPlanStmt.get(projectId);

    if (existingPlan) {
      // Update existing plan
      const updateStmt = db.prepare(`
        UPDATE review_plans
        SET plan_content = ?, version = version + 1
        WHERE project_id = ?
      `);
      updateStmt.run(template.structure, projectId);
    } else {
      // Create new plan
      const insertStmt = db.prepare(`
        INSERT INTO review_plans (project_id, plan_content, version)
        VALUES (?, ?, 1)
      `);
      insertStmt.run(projectId, template.structure);
    }

    return NextResponse.json({
      success: true,
      message: '模板应用成功',
    });
  } catch (error) {
    console.error('应用模板失败:', error);
    return NextResponse.json(
      { success: false, error: '应用模板失败' },
      { status: 500 }
    );
  }
}
