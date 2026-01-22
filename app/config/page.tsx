'use client';

import { useState, useEffect } from 'react';

interface AIConfig {
  id?: number;
  api_endpoint: string;
  api_key_masked?: string;
  model_name: string;
}

export default function AIConfigPage() {
  const [config, setConfig] = useState<AIConfig>({
    api_endpoint: 'https://api.openai.com/v1',
    model_name: 'gpt-4',
  });
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testingFunction, setTestingFunction] = useState(false);
  const [message, setMessage] = useState('');
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // 加载现有配置
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config/ai');
      const result = await response.json();
      if (result.success && result.data) {
        setConfig(result.data);
        // 如果有保存的模型，自动加载模型列表以便编辑
        if (result.data.model_name && result.data.api_key_masked) {
          setModels([result.data.model_name]); // 至少显示当前模型
        }
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 测试连接并获取模型列表
  const testConnection = async () => {
    if (!config.api_endpoint || !apiKey) {
      setMessage('请填写 API 端点和密钥');
      return;
    }

    setTestingConnection(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: config.api_endpoint,
          api_key: apiKey,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setModels(result.data);
        setMessage(`✅ 连接成功！找到 ${result.data.length} 个可用模型`);
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 连接失败: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  // 测试 API 功能
  const testAPIFunction = async () => {
    if (!config.api_endpoint || !apiKey || !config.model_name) {
      setMessage('请填写 API 端点、密钥和模型名称');
      return;
    }

    setTestingFunction(true);
    setTestResult(null);
    setMessage('');

    try {
      const response = await fetch('/api/config/test-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: config.api_endpoint,
          api_key: apiKey,
          model_name: config.model_name,
        }),
      });

      const result = await response.json();
      setTestResult(result);

      if (!result.success) {
        setMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: '测试失败',
        data: { error: error.message },
      });
      setMessage(`❌ 测试失败: ${error.message}`);
    } finally {
      setTestingFunction(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!config.api_endpoint || !apiKey || !config.model_name) {
      setMessage('请填写所有必填项');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: config.api_endpoint,
          api_key: apiKey,
          model_name: config.model_name,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setMessage('✅ 配置保存成功！');
        setApiKey(''); // 清空密钥输入框
        await loadConfig(); // 重新加载配置以显示保存的内容
      } else {
        setMessage(`❌ ${result.error}`);
      }
    } catch (error: any) {
      setMessage(`❌ 保存失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <a href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block">
          ← 返回首页
        </a>
        <h1 className="text-3xl font-bold mb-8">AI 配置</h1>

        {/* 当前配置信息卡片 */}
        {config.api_key_masked && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">✅ 当前配置</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>API端点:</strong> {config.api_endpoint}</p>
              <p><strong>API密钥:</strong> {config.api_key_masked}</p>
              <p><strong>模型:</strong> {config.model_name}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* API 端点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              API 端点 *
            </label>
            <input
              type="text"
              value={config.api_endpoint}
              onChange={(e) => setConfig({ ...config, api_endpoint: e.target.value })}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="mt-1 text-sm text-gray-500">
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
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config.api_key_masked || '请输入 API 密钥'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {config.api_key_masked && (
              <p className="mt-1 text-sm text-gray-500">
                当前密钥: {config.api_key_masked}
              </p>
            )}
          </div>

          {/* 测试连接按钮 */}
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testingConnection ? '测试中...' : '测试连接并获取模型'}
            </button>
            <button
              onClick={testAPIFunction}
              disabled={testingFunction || !config.model_name}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              title={!config.model_name ? '请先选择模型' : '测试 API 文字生成功能'}
            >
              {testingFunction ? '测试中...' : '测试 API 功能'}
            </button>
          </div>

          {/* 模型选择或输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              模型名称 *
            </label>
            {models.length > 0 ? (
              <select
                value={config.model_name}
                onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.model_name}
                onChange={(e) => setConfig({ ...config, model_name: e.target.value })}
                placeholder="例如: gpt-4, gemini-3-flash-preview"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
            <p className="mt-1 text-sm text-gray-500">
              {models.length > 0
                ? `共 ${models.length} 个可用模型`
                : '无法自动获取模型列表，请手动输入模型名称'}
            </p>
          </div>

          {/* 消息提示 */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* API 功能测试结果 */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className={`font-semibold mb-2 ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {testResult.success ? '✅ API 功能测试成功' : '❌ API 功能测试失败'}
              </p>
              <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                {testResult.message}
              </p>
              {testResult.data && (
                <div className="mt-3 space-y-2 text-sm">
                  {testResult.data.latency && (
                    <p className="text-gray-700">
                      <strong>响应时间:</strong> {testResult.data.latency}ms
                    </p>
                  )}
                  {testResult.data.model && (
                    <p className="text-gray-700">
                      <strong>使用模型:</strong> {testResult.data.model}
                    </p>
                  )}
                  {testResult.data.response && (
                    <div className="mt-2">
                      <p className="text-gray-700 font-medium">API 响应内容:</p>
                      <div className="mt-1 p-3 bg-white rounded border border-gray-200">
                        <p className="text-gray-800">{testResult.data.response}</p>
                      </div>
                    </div>
                  )}
                  {testResult.data.error && (
                    <p className="text-red-600">
                      <strong>错误详情:</strong> {testResult.data.error}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex gap-4">
            <button
              onClick={saveConfig}
              disabled={loading || !config.model_name}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '保存中...' : '保存配置'}
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              返回首页
            </button>
          </div>

          {/* API管理链接 */}
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900 mb-2">🎨 绘图API配置</h3>
            <p className="text-sm text-purple-800 mb-3">
              配置多个绘图API和图像处理API，支持优先级排序
            </p>
            <a
              href="/config/apis"
              className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              管理绘图和图像处理API →
            </a>
          </div>

          {/* 使用说明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>1. 填写 API 端点和密钥</li>
              <li>2. 点击"测试连接并获取模型"按钮</li>
              <li>3. 从下拉列表中选择要使用的模型</li>
              <li>4. 点击"保存配置"完成设置</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
