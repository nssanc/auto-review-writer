import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// 获取学术用语
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let stmt;
    let phrases;

    if (category) {
      stmt = db.prepare('SELECT * FROM writing_phrases WHERE category = ? ORDER BY id');
      phrases = stmt.all(category);
    } else {
      stmt = db.prepare('SELECT * FROM writing_phrases ORDER BY category, id');
      phrases = stmt.all();
    }

    return NextResponse.json({
      success: true,
      data: phrases,
    });
  } catch (error) {
    console.error('获取学术用语失败:', error);
    return NextResponse.json(
      { error: '获取学术用语失败' },
      { status: 500 }
    );
  }
}
