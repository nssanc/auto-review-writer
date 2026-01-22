'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
  id: number;
  name: string;
  description: string;
  structure: string;
  is_default: number;
  created_at: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<Template | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    structure: '',
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      if (data.success) {
        setTemplates(data.data);
      }
    } catch (error) {
      console.error('获取模板失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('获取项目列表失败:', error);
    }
  };

  const handlePreview = (template: Template) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = async (template: Template) => {
    setSelectedTemplateForApply(template);
    await fetchProjects();
    setShowApplyModal(true);
  };

  const applyTemplateToProject = async (projectId: number) => {
    if (!selectedTemplateForApply) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/apply-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedTemplateForApply.id }),
      });

      const data = await response.json();
      if (data.success) {
        alert('模板应用成功！');
        setShowApplyModal(false);
        setSelectedTemplateForApply(null);
      } else {
        alert('应用失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('应用模板失败:', error);
      alert('应用模板失败，请重试');
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.name || !newTemplate.structure) {
      alert('请填写模板名称和结构');
      return;
    }

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTemplate),
      });

      const data = await response.json();
      if (data.success) {
        alert('模板创建成功！');
        setShowCreateModal(false);
        setNewTemplate({ name: '', description: '', structure: '' });
        fetchTemplates();
      } else {
        alert('创建失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('创建模板失败:', error);
      alert('创建模板失败，请重试');
    }
  };

  const handleDelete = async (templateId: number) => {
    if (!confirm('确定要删除这个模板吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        fetchTemplates();
        alert('模板删除成功');
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      alert('删除模板失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← 返回首页
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">综述模板管理</h1>
          <p className="text-gray-600 mt-2">
            选择或自定义综述结构模板
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + 创建新模板
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  {template.name}
                </h3>
                {template.is_default === 1 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    默认
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {template.description}
              </p>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePreview(template)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    预览
                  </button>
                  <button
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    应用
                  </button>
                </div>
                {template.is_default === 0 && (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 预览模态框 */}
        {showPreview && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedTemplate.name}
                  </h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-600 mt-2">{selectedTemplate.description}</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {selectedTemplate.structure}
                </pre>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 创建模板模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">创建新模板</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewTemplate({ name: '', description: '', structure: '' });
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模板名称 *
                    </label>
                    <input
                      type="text"
                      value={newTemplate.name}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入模板名称"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模板描述
                    </label>
                    <textarea
                      value={newTemplate.description}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入模板描述（可选）"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模板结构 *
                    </label>
                    <textarea
                      value={newTemplate.structure}
                      onChange={(e) =>
                        setNewTemplate({ ...newTemplate, structure: e.target.value })
                      }
                      rows={12}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      placeholder="输入模板结构，例如：&#10;# 标题&#10;## 1. 引言&#10;## 2. 研究方法&#10;## 3. 结果与讨论&#10;## 4. 结论"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTemplate({ name: '', description: '', structure: '' });
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateTemplate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 应用模板模态框 */}
        {showApplyModal && selectedTemplateForApply && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">
                    应用模板: {selectedTemplateForApply.name}
                  </h2>
                  <button
                    onClick={() => {
                      setShowApplyModal(false);
                      setSelectedTemplateForApply(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-600 mt-2">选择要应用此模板的项目</p>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                {projects.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    暂无项目，请先创建项目
                  </p>
                ) : (
                  <div className="space-y-3">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition-colors"
                        onClick={() => applyTemplateToProject(project.id)}
                      >
                        <h3 className="font-semibold text-gray-900">{project.name}</h3>
                        {project.description && (
                          <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowApplyModal(false);
                    setSelectedTemplateForApply(null);
                  }}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
