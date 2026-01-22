'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// API 配置接口（统一）
interface APIConfig {
  id?: number;
  name: string;
  api_endpoint: string;
  api_key_masked?: string;
  model_name?: string;
  is_active: number;
  priority: number;
}

// AI 配置接口（旧版，保留兼容）
interface AIConfig {
  id?: number;
  api_endpoint: string;
  api_key_masked?: string;
  model_name: string;
}

// WebDAV 配置接口
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

export default function SystemConfigPage() {
  // AI 配置状态
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    api_endpoint: 'https://api.openai.com/v1',
    model_name: 'gpt-4',
  });
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModels, setAiModels] = useState<string[]>([]);
  const [testingAI, setTestingAI] = useState(false);
  const [testingAIFunction, setTestingAIFunction] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<any>(null);

  // WebDAV 配置状态
  const [webdavConfig, setWebdavConfig] = useState<WebDAVConfig>({
    url: '',
    username: '',
    enabled: 0,
    auto_sync: 1,
    sync_interval: 30,
  });
  const [webdavPassword, setWebdavPassword] = useState('');
  const [testingWebDAV, setTestingWebDAV] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const [syncTaskId, setSyncTaskId] = useState<string | null>(null);
  const [backups, setBackups] = useState<Array<{ filename: string; date: string; size: number }>>([]);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // 通用状态
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ai' | 'webdav'>('ai');

  useEffect(() => {
    loadAIConfig();
    loadWebDAVConfig();
    loadSyncStatus();
  }, []);

  // 轮询同步进度
  useEffect(() => {
    if (!syncTaskId) return;

    const pollProgress = async () => {
      try {
        const response = await fetch(`/api/webdav/sync/progress?taskId=${syncTaskId}`);
        const result = await response.json();
        if (result.success && result.data) {
          setSyncProgress(result.data);

          // 如果同步完成或失败，停止轮询
          if (result.data.status === 'completed' || result.data.status === 'failed') {
            setSyncing(false);
            setSyncTaskId(null);
            await loadSyncStatus();

            if (result.data.status === 'completed') {
              setMessage(`✅ 同步完成！已同步 ${result.data.synced_files} 个文件`);
            } else {
              setMessage(`❌ 同步失败: ${result.data.error_message || '未知错误'}`);
            }
          }
        }
      } catch (error) {
        console.error('获取同步进度失败:', error);
      }
    };

    // 立即执行一次
    pollProgress();

    // 每秒轮询一次
    const interval = setInterval(pollProgress, 1000);

    return () => clearInterval(interval);
  }, [syncTaskId]);

  // 加载 AI 配置
  const loadAIConfig = async () => {
    try {
      const response = await fetch('/api/config/ai');
      const result = await response.json();
      if (result.success && result.data) {
        setAiConfig(result.data);
        if (result.data.model_name && result.data.api_key_masked) {
          setAiModels([result.data.model_name]);
        }
      }
    } catch (error) {
      console.error('加载AI配置失败:', error);
    }
  };

  // 加载 WebDAV 配置
  const loadWebDAVConfig = async () => {
    try {
      const response = await fetch('/api/config/webdav');
      const result = await response.json();
      if (result.success && result.data) {
        setWebdavConfig(result.data);
      }
    } catch (error) {
      console.error('加载WebDAV配置失败:', error);
    }
  };

  // 加载同步状态
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

  // 测试 AI 连接
  const testAIConnection = async () => {
    if (!aiConfig.api_endpoint || !aiApiKey) {
      setMessage('❌ 请填写 API 端点和密钥');
      return;
    }

    setTestingAI(true);
    setMessage('');
    setAiTestResult(null);

    try {
      const response = await fetch('/api/config/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: aiConfig.api_endpoint,
          api_key: aiApiKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiModels(result.data);
        setMessage(`✅ AI连接成功！找到 ${result.data.length} 个可用模型`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 连接失败: ${error.message}`);
    } finally {
      setTestingAI(false);
    }
  };

  // 测试 AI 功能
  const testAIFunctionality = async () => {
    if (!aiConfig.api_endpoint || !aiApiKey || !aiConfig.model_name) {
      setMessage('❌ 请填写 API 端点、密钥和模型名称');
      return;
    }

    setTestingAIFunction(true);
    setMessage('');
    setAiTestResult(null);

    try {
      const response = await fetch('/api/config/ai/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: aiConfig.api_endpoint,
          api_key: aiApiKey,
          model_name: aiConfig.model_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setAiTestResult(result.data);
        setMessage(`✅ AI功能测试成功！`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 测试失败: ${error.message}`);
    } finally {
      setTestingAIFunction(false);
    }
  };

  // 保存 AI 配置
  const saveAIConfig = async () => {
    if (!aiConfig.api_endpoint || !aiConfig.model_name) {
      setMessage('❌ 请填写所有必填项');
      return;
    }

    if (!aiApiKey && !aiConfig.api_key_masked) {
      setMessage('❌ 请输入 API 密钥');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: aiConfig.api_endpoint,
          api_key: aiApiKey || undefined,
          model_name: aiConfig.model_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ AI配置保存成功！');
        setAiApiKey('');
        await loadAIConfig();
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 测试 WebDAV 连接
  const testWebDAVConnection = async () => {
    if (!webdavConfig.url || !webdavConfig.username || !webdavPassword) {
      setMessage('❌ 请填写所有必填项');
      return;
    }

    setTestingWebDAV(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/webdav/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webdavConfig.url,
          username: webdavConfig.username,
          password: webdavPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage(`✅ WebDAV连接成功！延迟: ${result.data.latency}ms`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 连接失败: ${error.message}`);
    } finally {
      setTestingWebDAV(false);
    }
  };

  // 保存 WebDAV 配置
  const saveWebDAVConfig = async () => {
    if (!webdavConfig.url || !webdavConfig.username) {
      setMessage('❌ 请填写所有必填项');
      return;
    }

    if (!webdavPassword && !webdavConfig.password_masked) {
      setMessage('❌ 请输入密码');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/webdav', {
        method: webdavConfig.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webdavConfig.url,
          username: webdavConfig.username,
          password: webdavPassword || undefined,
          enabled: webdavConfig.enabled,
          auto_sync: webdavConfig.auto_sync,
          sync_interval: webdavConfig.sync_interval,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ WebDAV配置保存成功！');
        setWebdavPassword('');
        await loadWebDAVConfig();
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

  // 手动同步
  const handleFullSync = async () => {
    setSyncing(true);
    setMessage('');
    setSyncProgress(null);

    try {
      const response = await fetch('/api/webdav/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'full', background: true }),
      });

      const result = await response.json();

      if (result.success && result.data.taskId) {
        setMessage('🚀 同步任务已启动，正在后台执行...');
        setSyncTaskId(result.data.taskId);
      } else {
        setMessage(`❌ ${result.error || '启动同步失败'}`);
        setSyncing(false);
      }
    } catch (error: any) {
      setMessage(`❌ 同步失败: ${error.message}`);
      setSyncing(false);
    }
  };

  // 加载备份列表
  const loadBackups = async () => {
    try {
      const response = await fetch('/api/webdav/restore');
      const result = await response.json();
      if (result.success) {
        setBackups(result.data);
      }
    } catch (error) {
      console.error('加载备份列表失败:', error);
    }
  };

  // 恢复数据库
  const handleRestore = async (filename: string) => {
    if (!confirm(`确定要恢复数据库到 ${filename} 吗？当前数据库将被自动备份。`)) {
      return;
    }

    setRestoring(true);
    setMessage('');

    try {
      const response = await fetch('/api/webdav/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ 数据库恢复成功！旧数据库已自动备份。刷新页面查看恢复的数据。');
        setShowRestoreDialog(false);
      } else {
        setMessage(`❌ ${result.error || '恢复失败'}`);
      }
    } catch (error: any) {
      setMessage(`❌ 恢复失败: ${error.message}`);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm mb-3 font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回首页
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
            系统配置
          </h1>
          <p className="text-gray-600 mt-2">配置 AI 服务和云存储设置</p>
        </div>
      </header>

      {/* 主内容 */}
      <main className="relative max-w-7xl mx-auto px-4 py-8">
        {/* 消息提示 */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl border ${
            message.startsWith('✅') || message.startsWith('🚀')
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            {message}
          </div>
        )}

        {/* 标签切换 */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            AI 配置
          </button>
          <button
            onClick={() => setActiveTab('webdav')}
            className={`px-6 py-3 rounded-xl font-medium transition-all ${
              activeTab === 'webdav'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            WebDAV 云存储
          </button>
        </div>

        {/* AI 配置面板 */}
        {activeTab === 'ai' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 overflow-hidden" style={{ minHeight: '800px' }}>
            <iframe
              src="/config/apis?embedded=true"
              className="w-full border-0"
              style={{ height: '800px' }}
              title="API 配置管理"
            />
          </div>
        )}

        {/* AI 配置面板（旧版，已隐藏） */}
        {false && activeTab === 'ai' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                AI 服务配置
              </h2>
            </div>

            {/* 当前配置状态 */}
            {aiConfig.api_key_masked && (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-purple-700 mb-2">✅ 当前配置</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>API端点:</strong> {aiConfig.api_endpoint}</p>
                  <p><strong>API密钥:</strong> {aiConfig.api_key_masked}</p>
                  <p><strong>模型:</strong> {aiConfig.model_name}</p>
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* API 端点 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 端点 *
                </label>
                <input
                  type="text"
                  value={aiConfig.api_endpoint}
                  onChange={(e) => setAiConfig({ ...aiConfig, api_endpoint: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-sm text-gray-600">
                  支持 OpenAI、OneAPI、NewAPI、DeepSeek、Moonshot 等兼容服务
                </p>
              </div>

              {/* API 密钥 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API 密钥 *
                </label>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder={aiConfig.api_key_masked || '请输入 API 密钥'}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
                {aiConfig.api_key_masked && (
                  <p className="mt-2 text-sm text-gray-600">
                    当前密钥: {aiConfig.api_key_masked}
                  </p>
                )}
              </div>

              {/* 测试按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={testAIConnection}
                  disabled={testingAI}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {testingAI ? '测试中...' : '🔌 测试连接并获取模型'}
                </button>
                <button
                  onClick={testAIFunctionality}
                  disabled={testingAIFunction || !aiConfig.model_name}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {testingAIFunction ? '测试中...' : '🤖 测试 AI 功能'}
                </button>
              </div>

              {/* AI 测试结果 */}
              {aiTestResult && (
                <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                  <h4 className="font-semibold text-green-700 mb-2">✅ AI 响应测试成功</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiTestResult.response}</p>
                </div>
              )}

              {/* 模型选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称 *
                </label>
                {aiModels.length > 0 ? (
                  <select
                    value={aiConfig.model_name}
                    onChange={(e) => setAiConfig({ ...aiConfig, model_name: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  >
                    {aiModels.map((model) => (
                      <option key={model} value={model} className="bg-slate-800">
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={aiConfig.model_name}
                    onChange={(e) => setAiConfig({ ...aiConfig, model_name: e.target.value })}
                    placeholder="例如: gpt-4, gemini-3-flash-preview"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  />
                )}
                <p className="mt-2 text-sm text-gray-600">
                  {aiModels.length > 0
                    ? `共 ${aiModels.length} 个可用模型`
                    : '无法自动获取模型列表，请手动输入模型名称'}
                </p>
              </div>

              {/* 保存按钮 */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={saveAIConfig}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  {loading ? '保存中...' : '💾 保存配置'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WebDAV 配置面板 */}
        {activeTab === 'webdav' && (
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-200 p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="text-3xl">☁️</span>
              WebDAV 云存储配置
            </h2>

            {/* 同步状态卡片 */}
            {syncStatus && syncStatus.enabled && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-blue-700 mb-2">✅ WebDAV 已启用</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>最后同步:</strong> {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString('zh-CN') : '从未同步'}</p>
                  <p><strong>待同步文件:</strong> {syncStatus.pendingFiles} 个</p>
                  <p><strong>自动同步:</strong> {syncStatus.autoSync ? `已启用 (每 ${syncStatus.syncInterval} 分钟)` : '已禁用'}</p>
                </div>
              </div>
            )}

            {/* 实时同步进度 */}
            {syncing && syncProgress && (
              <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-700">🔄 正在同步...</h3>
                  <span className="text-sm text-purple-700">{syncProgress.progress_percent}%</span>
                </div>

                {/* 进度条 */}
                <div className="w-full bg-gray-50 rounded-full h-2 mb-3">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncProgress.progress_percent}%` }}
                  ></div>
                </div>

                {/* 当前文件 */}
                {syncProgress.current_file && (
                  <p className="text-xs text-gray-600 mb-2">
                    📄 {syncProgress.current_file}
                  </p>
                )}

                {/* 统计信息 */}
                <div className="text-xs text-gray-600 space-y-1">
                  <p>已同步: {syncProgress.synced_files} / {syncProgress.total_files} 个文件</p>
                  {syncProgress.failed_files > 0 && (
                    <p className="text-red-400">失败: {syncProgress.failed_files} 个</p>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-6">
              {/* WebDAV URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WebDAV URL *
                </label>
                <input
                  type="text"
                  value={webdavConfig.url}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, url: e.target.value })}
                  placeholder="https://your-server.com/remote.php/dav/files/username/"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-sm text-gray-600">
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
                  value={webdavConfig.username}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, username: e.target.value })}
                  placeholder="请输入用户名"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              {/* 密码 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码 *
                </label>
                <input
                  type="password"
                  value={webdavPassword}
                  onChange={(e) => setWebdavPassword(e.target.value)}
                  placeholder={webdavConfig.password_masked || '请输入密码'}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                {webdavConfig.password_masked && (
                  <p className="mt-2 text-sm text-gray-600">
                    当前密码: {webdavConfig.password_masked} (留空则不修改)
                  </p>
                )}
              </div>

              {/* 测试连接按钮 */}
              <div>
                <button
                  onClick={testWebDAVConnection}
                  disabled={testingWebDAV}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {testingWebDAV ? '测试中...' : '🔌 测试连接'}
                </button>
              </div>

              <hr className="border-gray-200" />

              <h3 className="text-xl font-bold text-gray-900">同步设置</h3>

              {/* 启用 WebDAV */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={webdavConfig.enabled === 1}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, enabled: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 text-blue-500 bg-white border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="enabled" className="text-gray-700 cursor-pointer">
                  启用 WebDAV 云存储
                </label>
              </div>

              {/* 自动同步 */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto_sync"
                  checked={webdavConfig.auto_sync === 1}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, auto_sync: e.target.checked ? 1 : 0 })}
                  className="w-5 h-5 text-blue-500 bg-white border-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="auto_sync" className="text-gray-700 cursor-pointer">
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
                  value={webdavConfig.sync_interval}
                  onChange={(e) => setWebdavConfig({ ...webdavConfig, sync_interval: parseInt(e.target.value) || 30 })}
                  min="5"
                  max="1440"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="mt-2 text-sm text-gray-600">
                  自动同步的时间间隔（5-1440 分钟）
                </p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-4">
                <button
                  onClick={saveWebDAVConfig}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  {loading ? '保存中...' : '💾 保存配置'}
                </button>
                <button
                  onClick={handleFullSync}
                  disabled={syncing || !webdavConfig.enabled}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  {syncing ? '同步中...' : '🔄 立即同步'}
                </button>
                <button
                  onClick={() => {
                    loadBackups();
                    setShowRestoreDialog(true);
                  }}
                  disabled={!webdavConfig.enabled}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed transition-all shadow-lg font-medium"
                >
                  📥 恢复数据
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 恢复对话框 */}
      {showRestoreDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">恢复数据库</h3>
                <button
                  onClick={() => setShowRestoreDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {backups.length === 0 ? (
                <p className="text-center text-gray-500 py-8">没有找到可恢复的备份</p>
              ) : (
                <div className="space-y-3">
                  {backups.map((backup) => (
                    <div
                      key={backup.filename}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{backup.filename}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(backup.date).toLocaleString('zh-CN')} • {(backup.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => handleRestore(backup.filename)}
                        disabled={restoring}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        {restoring ? '恢复中...' : '恢复'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}