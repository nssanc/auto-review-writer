import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { encryptPassword, decryptPassword } from '@/lib/crypto';

// GET - 获取 WebDAV 配置
export async function GET() {
  try {
    const stmt = db.prepare('SELECT * FROM webdav_config LIMIT 1');
    const config = stmt.get() as any;

    if (!config) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // 返回时隐藏完整密码
    const maskedConfig = {
      ...config,
      password_masked: config.password ? '********' : '',
      password: undefined,
    };

    return NextResponse.json({
      success: true,
      data: maskedConfig,
    });
  } catch (error: any) {
    console.error('获取 WebDAV 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - 保存 WebDAV 配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, password, enabled, auto_sync, sync_interval } = body;

    if (!url || !username || !password) {
      return NextResponse.json(
        { success: false, error: '请填写所有必填项' },
        { status: 400 }
      );
    }

    // 加密密码
    const encryptedPassword = encryptPassword(password);

    // 检查是否已有配置
    const checkStmt = db.prepare('SELECT id FROM webdav_config LIMIT 1');
    const existing = checkStmt.get() as any;

    if (existing) {
      // 更新现有配置
      const updateStmt = db.prepare(`
        UPDATE webdav_config
        SET url = ?, username = ?, password = ?, enabled = ?, auto_sync = ?, sync_interval = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(url, username, encryptedPassword, enabled ? 1 : 0, auto_sync ? 1 : 0, sync_interval || 30, existing.id);
    } else {
      // 插入新配置
      const insertStmt = db.prepare(`
        INSERT INTO webdav_config (url, username, password, enabled, auto_sync, sync_interval)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run(url, username, encryptedPassword, enabled ? 1 : 0, auto_sync ? 1 : 0, sync_interval || 30);
    }

    return NextResponse.json({
      success: true,
      message: 'WebDAV 配置保存成功',
    });
  } catch (error: any) {
    console.error('保存 WebDAV 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - 更新 WebDAV 配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, username, password, enabled, auto_sync, sync_interval } = body;

    const checkStmt = db.prepare('SELECT id FROM webdav_config LIMIT 1');
    const existing = checkStmt.get() as any;

    if (!existing) {
      return NextResponse.json(
        { success: false, error: '配置不存在' },
        { status: 404 }
      );
    }

    // 如果提供了新密码，则加密
    let encryptedPassword = null;
    if (password) {
      encryptedPassword = encryptPassword(password);
    }

    // 构建更新语句
    if (encryptedPassword) {
      const updateStmt = db.prepare(`
        UPDATE webdav_config
        SET url = ?, username = ?, password = ?, enabled = ?, auto_sync = ?, sync_interval = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(url, username, encryptedPassword, enabled ? 1 : 0, auto_sync ? 1 : 0, sync_interval || 30, existing.id);
    } else {
      const updateStmt = db.prepare(`
        UPDATE webdav_config
        SET url = ?, username = ?, enabled = ?, auto_sync = ?, sync_interval = ?, updated_at = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(url, username, enabled ? 1 : 0, auto_sync ? 1 : 0, sync_interval || 30, existing.id);
    }

    return NextResponse.json({
      success: true,
      message: 'WebDAV 配置更新成功',
    });
  } catch (error: any) {
    console.error('更新 WebDAV 配置失败:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
