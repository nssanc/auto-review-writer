'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface API {
  id?: number;
  name: string;
  api_endpoint: string;
  api_key_masked?: string;
  model_name?: string;
  is_active: number;
  priority: number;
}

export default function APIManagementPage() {
  const [activeTab, setActiveTab] = useState<'ai' | 'diagram' | 'image'>('ai');
  const [aiAPIs, setAiAPIs] = useState<API[]>([]);
  const [diagramAPIs, setDiagramAPIs] = useState<API[]>([]);
  const [imageAPIs, setImageAPIs] = useState<API[]>([]);
  const [message, setMessage] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    api_endpoint: '',
    api_key: '',
    model_name: '',
    is_active: 1,
    priority: 0,
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [testingAPIId, setTestingAPIId] = useState<number | null>(null);
  const [testResults, setTestResults] = useState<Record<number, any>>({});

  // 检查是否为嵌入模式
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    // 检查 URL 参数
    const params = new URLSearchParams(window.location.search);
    setIsEmbedded(params.get('embedded') === 'true');
  }, []);

  useEffect(() => {
    loadAPIs();
  }, []);

  const loadAPIs = async () => {
    try {
      const [a, d, i] = await Promise.all([
        fetch('/api/config/ai-apis'),
        fetch('/api/config/diagram-apis'),
        fetch('/api/config/image-apis'),
      ]);
      const aa = await a.json();
      const dd = await d.json();
      const ii = await i.json();
      if (aa.success) setAiAPIs(aa.data);
      if (dd.success) setDiagramAPIs(dd.data);
      if (ii.success) setImageAPIs(ii.data);
    } catch (error) {
      console.error('加载失败:', error);
    }
  };

  const handleDelete = async (id: number, type: 'ai' | 'diagram' | 'image') => {
    if (!confirm('确定删除？')) return;
    try {
      const url = type === 'ai'
        ? `/api/config/ai-apis/${id}`
        : type === 'diagram'
        ? `/api/config/diagram-apis/${id}`
        : `/api/config/image-apis/${id}`;
      const res = await fetch(url, { method: 'DELETE' });
      const result = await res.json();
      if (result.success) {
        setMessage('✅ 删除成功');
        loadAPIs();
      }
    } catch (error) {
      setMessage('❌ 删除失败');
    }
  };

  const testConnection = async () => {
    if (!formData.api_endpoint || !formData.api_key) {
      setMessage('❌ 请填写API端点和密钥');
      return;
    }

    setTestingConnection(true);
    setMessage('');

    try {
      const endpoint = activeTab === 'ai'
        ? '/api/config/models'
        : '/api/config/image-models';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: formData.api_endpoint,
          api_key: formData.api_key,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // 去重模型列表
        const uniqueModels = Array.from(new Set(result.data as string[]));
        setAvailableModels(uniqueModels);
        setMessage(`✅ 连接成功！找到 ${uniqueModels.length} 个可用模型`);
      } else {
        setMessage(`❌ ${result.error || '连接失败'}`);
      }
    } catch (error: any) {
      console.error('测试连接失败:', error);
      setMessage(`❌ 连接失败: ${error.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleEdit = (api: API) => {
    setEditingId(api.id!);
    setFormData({
      name: api.name,
      api_endpoint: api.api_endpoint,
      api_key: '',
      model_name: api.model_name || '',
      is_active: api.is_active,
      priority: api.priority,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!formData.name || !formData.api_endpoint) {
      setMessage('❌ 请填写所有必填项');
      return;
    }
    try {
      const url = activeTab === 'ai'
        ? `/api/config/ai-apis/${editingId}`
        : activeTab === 'diagram'
        ? `/api/config/diagram-apis/${editingId}`
        : `/api/config/image-apis/${editingId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setMessage('✅ 更新成功');
        setShowEditModal(false);
        setEditingId(null);
        setFormData({ name: '', api_endpoint: '', api_key: '', model_name: '', is_active: 1, priority: 0 });
        setAvailableModels([]);
        loadAPIs();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 更新失败');
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.api_endpoint || !formData.api_key) {
      setMessage('❌ 请填写所有必填项');
      return;
    }
    try {
      const url = activeTab === 'ai'
        ? '/api/config/ai-apis'
        : activeTab === 'diagram'
        ? '/api/config/diagram-apis'
        : '/api/config/image-apis';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();
      if (result.success) {
        setMessage('✅ 添加成功');
        setShowAddModal(false);
        setFormData({ name: '', api_endpoint: '', api_key: '', model_name: '', is_active: 1, priority: 0 });
        setAvailableModels([]);
        loadAPIs();
      } else {
        setMessage('❌ ' + result.error);
      }
    } catch (error) {
      setMessage('❌ 添加失败');
    }
  };

  const handleTestAPI = async (api: API, type: 'ai' | 'diagram' | 'image') => {
    const apiKey = prompt(`请输入 ${api.name} 的 API 密钥以进行测试：`);
    if (!apiKey) return;

    setTestingAPIId(api.id!);
    setTestResults(prev => ({ ...prev, [api.id!]: null }));

    const endpoint = type === 'ai'
      ? '/api/config/test-ai'
      : type === 'diagram'
      ? '/api/config/test-diagram-api'
      : '/api/config/test-image-api';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_endpoint: api.api_endpoint,
          api_key: apiKey,
          model_name: api.model_name,
          format: 'png',
        }),
      });

      const data = await response.json();
      setTestResults(prev => ({ ...prev, [api.id!]: data }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [api.id!]: { success: false, message: '测试失败', error: error.message },
      }));
    } finally {
      setTestingAPIId(null);
    }
  };

  const currentAPIs = activeTab === 'ai' ? aiAPIs : activeTab === 'diagram' ? diagramAPIs : imageAPIs;

  return (
    <div className={isEmbedded ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50"}>
      {!isEmbedded && (
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-purple-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <Link href="/config/system" className="text-purple-600 hover:text-purple-700 text-sm mb-3 inline-block">
              ← 返回系统配置
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              API 配置管理
            </h1>
          </div>
        </header>
      )}

      <main className={isEmbedded ? "" : "max-w-7xl mx-auto px-4 py-8"}>
        {message && <div className="mb-4 p-4 bg-blue-50 rounded-lg">{message}</div>}

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-purple-100 p-6">
          {/* API用途说明 */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center">
              <span className="mr-2">ℹ️</span>
              API 用途说明
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white/70 p-3 rounded-lg">
                <p className="font-medium text-purple-700 mb-1">📝 文字API</p>
                <p className="text-gray-600 text-xs">用于文档内容分析、提取关键信息、生成综述等文本处理任务（如GPT、Gemini等）</p>
              </div>
              <div className="bg-white/70 p-3 rounded-lg">
                <p className="font-medium text-blue-700 mb-1">📊 绘图API</p>
                <p className="text-gray-600 text-xs">用于生成流程图、架构图等结构化图表（支持Mermaid等格式，使用文字模型）</p>
              </div>
              <div className="bg-white/70 p-3 rounded-lg">
                <p className="font-medium text-pink-700 mb-1">🎨 图像API</p>
                <p className="text-gray-600 text-xs">用于生成学术概念海报和插图（需要DALL-E、Stable Diffusion等图像生成模型）</p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('ai')}
                className={'px-6 py-3 rounded-xl font-medium transition-all ' + (activeTab === 'ai' ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200')}
              >
                📝 文字API ({aiAPIs.length})
              </button>
              <button
                onClick={() => setActiveTab('diagram')}
                className={'px-6 py-3 rounded-xl font-medium transition-all ' + (activeTab === 'diagram' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200')}
              >
                📊 绘图API ({diagramAPIs.length})
              </button>
              <button
                onClick={() => setActiveTab('image')}
                className={'px-6 py-3 rounded-xl font-medium transition-all ' + (activeTab === 'image' ? 'bg-pink-600 text-white shadow-lg' : 'bg-gray-100 hover:bg-gray-200')}
              >
                🎨 图像API ({imageAPIs.length})
              </button>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              + 添加API
            </button>
          </div>

          <div className="space-y-4">
            {currentAPIs.length === 0 ? (
              <p className="text-center py-8 text-gray-500">暂无API配置</p>
            ) : (
              currentAPIs.map((api) => (
                <div key={api.id} className="p-4 bg-white rounded-xl border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{api.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{api.api_endpoint}</p>
                      <p className="text-xs text-gray-500 mt-1">密钥: {api.api_key_masked}</p>
                      {api.model_name && (
                        <p className="text-xs text-gray-500 mt-1">模型: {api.model_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        优先级: {api.priority} | {api.is_active ? '✅ 已启用' : '❌ 已禁用'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestAPI(api, activeTab)}
                        disabled={testingAPIId === api.id}
                        className="px-3 py-1 text-purple-600 hover:bg-purple-50 rounded disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {testingAPIId === api.id ? '测试中...' : '测试'}
                      </button>
                      <button
                        onClick={() => handleEdit(api)}
                        className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleDelete(api.id!, activeTab)}
                        className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {/* 测试结果显示 */}
                  {testResults[api.id!] && (
                    <div className={`mt-3 p-3 rounded-lg border ${
                      testResults[api.id!].success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <p className={`font-medium text-sm ${
                        testResults[api.id!].success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {testResults[api.id!].success ? '✅ 测试成功' : '❌ 测试失败'}
                      </p>
                      <p className={`text-xs mt-1 ${
                        testResults[api.id!].success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {testResults[api.id!].message}
                      </p>

                      {testResults[api.id!].data && (
                        <div className="mt-2 space-y-1 text-xs">
                          {testResults[api.id!].data.latency && (
                            <p className="text-gray-600">
                              响应时间: {testResults[api.id!].data.latency}ms
                            </p>
                          )}

                          {/* 文字API响应内容 */}
                          {testResults[api.id!].data.response && (
                            <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                              <p className="text-gray-700 font-medium mb-1">AI 回复：</p>
                              <p className="text-gray-600">{testResults[api.id!].data.response}</p>
                            </div>
                          )}

                          {/* 图像API响应内容 */}
                          {testResults[api.id!].data.imageUrl && (
                            <div className="mt-2">
                              <img
                                src={testResults[api.id!].data.imageUrl}
                                alt="测试生成的图片"
                                className="max-w-xs rounded border border-gray-300"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    parent.innerHTML = '<p class="text-red-600 text-xs">图片加载失败</p>';
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {testResults[api.id!].error && (
                        <p className="text-xs text-red-600 mt-1">
                          错误: {typeof testResults[api.id!].error === 'string'
                            ? testResults[api.id!].error
                            : JSON.stringify(testResults[api.id!].error)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* 添加API模态框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              添加 {activeTab === 'ai' ? '文字API' : activeTab === 'diagram' ? '绘图API' : '图像API'}
            </h2>

            {/* 用途说明 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-700">
                <span className="font-semibold">
                  {activeTab === 'ai' && '📝 文字API用途：'}
                  {activeTab === 'diagram' && '📊 绘图API用途：'}
                  {activeTab === 'image' && '🎨 图像API用途：'}
                </span>
                <br />
                {activeTab === 'ai' && '用于文档内容分析、提取关键信息、生成综述等文本处理任务（如GPT、Gemini等）'}
                {activeTab === 'diagram' && '用于生成流程图、架构图等结构化图表（支持Mermaid等格式，使用文字模型）'}
                {activeTab === 'image' && '用于生成学术概念海报和插图（需要DALL-E、Stable Diffusion等图像生成模型）'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: Gemini API"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API端点 *
                </label>
                <input
                  type="text"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API密钥 *
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="请输入API密钥"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* 测试连接按钮 */}
              <div>
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {testingConnection ? '测试中...' : '测试连接并获取模型'}
                </button>
              </div>

              {/* 模型选择 */}
              {availableModels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择模型 *
                  </label>
                  <select
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">请选择模型</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    共 {availableModels.length} 个可用模型
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  启用此API
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAdd}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                确认添加
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', api_endpoint: '', api_key: '', model_name: '', is_active: 1, priority: 0 });
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑API模态框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              编辑 {activeTab === 'ai' ? '文字API' : activeTab === 'diagram' ? '绘图API' : '图像API'}
            </h2>

            {/* 用途说明 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-gray-700">
                <span className="font-semibold">
                  {activeTab === 'ai' && '📝 文字API用途：'}
                  {activeTab === 'diagram' && '📊 绘图API用途：'}
                  {activeTab === 'image' && '🎨 图像API用途：'}
                </span>
                <br />
                {activeTab === 'ai' && '用于文档内容分析、提取关键信息、生成综述等文本处理任务（如GPT、Gemini等）'}
                {activeTab === 'diagram' && '用于生成流程图、架构图等结构化图表（支持Mermaid等格式，使用文字模型）'}
                {activeTab === 'image' && '用于生成学术概念海报和插图（需要DALL-E、Stable Diffusion等图像生成模型）'}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如: Gemini API"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API端点 *
                </label>
                <input
                  type="text"
                  value={formData.api_endpoint}
                  onChange={(e) => setFormData({ ...formData, api_endpoint: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API密钥 (留空则不修改)
                </label>
                <input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="留空则保持原密钥不变"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              {/* 测试连接按钮 */}
              <div>
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {testingConnection ? '测试中...' : '测试连接并获取模型'}
                </button>
              </div>

              {/* 模型选择 */}
              {availableModels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择模型
                  </label>
                  <select
                    value={formData.model_name}
                    onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="">请选择模型</option>
                    {availableModels.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    共 {availableModels.length} 个可用模型
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  优先级
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="mt-1 text-xs text-gray-500">数字越大优先级越高</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active_edit"
                  checked={formData.is_active === 1}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="is_active_edit" className="ml-2 text-sm text-gray-700">
                  启用此API
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdate}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
              >
                保存修改
              </button>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingId(null);
                  setFormData({ name: '', api_endpoint: '', api_key: '', model_name: '', is_active: 1, priority: 0 });
                  setAvailableModels([]);
                }}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-all"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
