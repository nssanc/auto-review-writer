import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 创建新项目
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: '项目名称不能为空' },
        { status: 400 }
      );
    }

    const stmt = db.prepare(`
      INSERT INTO projects (name, description, status)
      VALUES (?, ?, 'draft')
    `);

    const result = stmt.run(name, description || '');

    return NextResponse.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        name,
        description,
        status: 'draft',
      },
    });
  } catch (error) {
    console.error('创建项目错误:', error);
    return NextResponse.json(
      { error: '创建项目失败' },
      { status: 500 }
    );
  }
}

// 获取所有项目
export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    const projects = stmt.all();

    return NextResponse.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('获取项目列表错误:', error);
    return NextResponse.json(
      { error: '获取项目列表失败' },
      { status: 500 }
    );
  }
}
