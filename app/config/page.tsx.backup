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
  const [message, setMessage] = useState('');

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
        loadConfig();
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
        <h1 className="text-3xl font-bold mb-8">AI 配置</h1>

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
          <div>
            <button
              onClick={testConnection}
              disabled={testingConnection}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {testingConnection ? '测试中...' : '测试连接并获取模型'}
            </button>
          </div>

          {/* 模型选择 */}
          {models.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择模型 *
              </label>
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
              <p className="mt-1 text-sm text-gray-500">
                共 {models.length} 个可用模型
              </p>
            </div>
          )}

          {/* 消息提示 */}
          {message && (
            <div className={`p-4 rounded-lg ${
              message.startsWith('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          {/* 保存按钮 */}
          <div className="flex gap-4">
            <button
              onClick={saveConfig}
              disabled={loading || models.length === 0}
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
