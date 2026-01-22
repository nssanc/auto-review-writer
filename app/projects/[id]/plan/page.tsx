'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReviewPlan {
  id: number;
  plan_content: string;
  version: number;
  created_at: string;
}

export default function PlanPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [plan, setPlan] = useState<ReviewPlan | null>(null);
  const [planContent, setPlanContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generateProgress, setGenerateProgress] = useState('');

  useEffect(() => {
    fetchPlan();
  }, [projectId]);

  const fetchPlan = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/plan`);
      const data = await response.json();
      if (data.success && data.data) {
        setPlan(data.data);
        setPlanContent(data.data.plan_content);
      }
    } catch (error) {
      console.error('获取撰写计划失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    // 如果已有计划，提示用户确认
    if (plan && !confirm('已有撰写计划，确定要重新生成吗？这将覆盖现有内容。')) {
      return;
    }

    setGenerating(true);
    setGenerateProgress('正在获取写作指南...');

    try {
      const response = await fetch('/api/generate/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId }),
      });

      setGenerateProgress('正在生成撰写计划...');

      const data = await response.json();
      if (data.success) {
        setGenerateProgress('正在整理计划内容...');
        setPlan(data.data);
        setPlanContent(data.data.plan_content);
        setGenerateProgress('计划生成完成！');
        setTimeout(() => setGenerateProgress(''), 2000);
        alert('计划生成成功！');
      } else {
        alert('生成失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('生成计划失败:', error);
      alert('生成计划失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/generate/plan/${plan.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_content: planContent }),
      });

      const data = await response.json();
      if (data.success) {
        alert('保存成功！');
        router.push(`/projects/${projectId}`);
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
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
            href={`/projects/${projectId}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← 返回项目
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">
              综述撰写计划
            </h1>
            {plan && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 bg-white text-purple-600 border border-purple-600 rounded-lg hover:bg-purple-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 transition-colors"
              >
                {generating ? '生成中...' : '🔄 重新生成'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!plan ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="mb-4">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 mb-4">还未生成撰写计划</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? '生成中...' : '生成撰写计划'}
            </button>
            {generating && generateProgress && (
              <div className="mt-4">
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                  <p className="text-sm text-purple-600">{generateProgress}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 左侧：编辑器 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                编辑计划
              </h2>
              <textarea
                value={planContent}
                onChange={(e) => setPlanContent(e.target.value)}
                rows={20}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* 右侧：预览 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                预览
              </h2>
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700">
                  {planContent}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {plan && (
          <div className="mt-6 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div className="flex space-x-3">
                <Link
                  href={`/projects/${projectId}`}
                  className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  取消
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? '保存中...' : '💾 保存计划'}
                </button>
              </div>
            </div>
            {generating && generateProgress && (
              <div className="mt-3 flex items-center justify-center space-x-2 pt-3 border-t border-gray-200">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <p className="text-sm text-purple-600">{generateProgress}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
