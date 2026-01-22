'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface WebDAVConfig {
  id?: number;
  url: string;
  username: string;
  password_masked?: string;
  enabled: number;
  auto_sync: number;
  sync_interval: number;
  last_sync_at?: string;
}

interface SyncStatus {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number;
  lastSyncAt: string | null;
  pendingFiles: number;
}

export default function WebDAVConfigPage() {
  const [config, setConfig] = useState<WebDAVConfig>({
    url: '',
    username: '',
    enabled: 0,
    auto_sync: 1,
    sync_interval: 30,
  });
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  useEffect(() => {
    loadConfig();
    loadSyncStatus();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config/webdav');
      const result = await response.json();
      if (result.success && result.data) {
        setConfig(result.data);
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  const loadSyncStatus = async () => {
    try {
      const response = await fetch('/api/webdav/sync/status');
      const result = await response.json();
      if (result.success) {
        setSyncStatus(result.data);
      }
    } catch (error) {
      console.error('加载同步状态失败:', error);
    }
  };

  const testConnection = async () => {
    if (!config.url || !config.username || !password) {
      setMessage('❌ 请填写所有必填项');
      return;
    }

    setTesting(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/webdav/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          username: config.username,
          password: password,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ 连接成功！延迟: ${result.data.latency}ms`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 连接失败: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const saveConfig = async () => {
    if (!config.url || !config.username) {
      setMessage('❌ 请填写所有必填项');
      return;
    }

    if (!password && !config.password_masked) {
      setMessage('❌ 请输入密码');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/webdav', {
        method: config.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          username: config.username,
          password: password || undefined,
          enabled: config.enabled,
          auto_sync: config.auto_sync,
          sync_interval: config.sync_interval,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ 配置保存成功！');
        setPassword('');
        await loadConfig();
        await loadSyncStatus();
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setMessage('');

    try {
      const response = await fetch('/api/webdav/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full' }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ 同步完成！已同步 ${result.data.syncedFiles} 个文件`);
        await loadSyncStatus();
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 同步失败: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/config/system" className="text-purple-600 hover:text-purple-700 text-sm mb-3 inline-block">
            ← 返回系统配置
          </Link>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            WebDAV 云存储配置
          </h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* 同步状态卡片 */}
        {syncStatus && syncStatus.enabled && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">✅ WebDAV 已启用</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>最后同步:</strong> {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString('zh-CN') : '从未同步'}</p>
              <p><strong>待同步文件:</strong> {syncStatus.pendingFiles} 个</p>
              <p><strong>自动同步:</strong> {syncStatus.autoSync ? `已启用 (每 ${syncStatus.syncInterval} 分钟)` : '已禁用'}</p>
            </div>
          </div>
        )}

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900">连接配置</h2>

          {/* WebDAV URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WebDAV URL *
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://your-server.com/remote.php/dav/files/username/"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              支持 Nextcloud、ownCloud、坚果云等 WebDAV 服务
            </p>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名 *
            </label>
            <input
              type="text"
              value={config.username}
              onChange={(e) => setConfig({ ...config, username: e.target.value })}
              placeholder="请输入用户名"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 密码 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码 *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={config.password_masked || '请输入密码'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            {config.password_masked && (
              <p className="mt-1 text-sm text-gray-500">
                当前密码: {config.password_masked} (留空则不修改)
              </p>
            )}
          </div>

          {/* 测试连接按钮 */}
          <div>
            <button
              onClick={testConnection}
              disabled={testing}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>

          <hr className="border-gray-200" />

          <h2 className="text-xl font-bold text-gray-900">同步设置</h2>

          {/* 启用 WebDAV */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="enabled"
              checked={config.enabled === 1}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
              启用 WebDAV 云存储
            </label>
          </div>

          {/* 自动同步 */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_sync"
              checked={config.auto_sync === 1}
              onChange={(e) => setConfig({ ...config, auto_sync: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="auto_sync" className="ml-2 text-sm text-gray-700">
              启用自动同步
            </label>
          </div>

          {/* 同步间隔 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              同步间隔（分钟）
            </label>
            <input
              type="number"
              value={config.sync_interval}
              onChange={(e) => setConfig({ ...config, sync_interval: parseInt(e.target.value) || 30 })}
              min="5"
              max="1440"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
              自动同步的时间间隔（5-1440 分钟）
            </p>
          </div>

          <hr className="border-gray-200" />

          {/* 操作按钮 */}
          <div className="flex gap-4">
            <button
              onClick={saveConfig}
              disabled={loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存配置'}
            </button>
            <button
              onClick={handleFullSync}
              disabled={syncing || !config.enabled}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {syncing ? '同步中...' : '立即同步'}
            </button>
            <Link
              href="/config/system"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              返回
            </Link>
          </div>

          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. 填写 WebDAV 服务器地址、用户名和密码</li>
              <li>2. 点击"测试连接"确认配置正确</li>
              <li>3. 启用 WebDAV 云存储和自动同步</li>
              <li>4. 点击"保存配置"完成设置</li>
              <li>5. 使用"立即同步"手动触发全量同步</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}