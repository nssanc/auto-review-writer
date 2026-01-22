'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface StyleAnalysis {
  id: number;
  analysis_result: string;
  writing_guide: string;
  created_at: string;
}

export default function GuidePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [guide, setGuide] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAnalysis();
  }, [projectId]);

  const fetchAnalysis = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/analysis`);
      const data = await response.json();
      if (data.success && data.data) {
        setAnalysis(data.data);
        setGuide(data.data.writing_guide);
      }
    } catch (error) {
      console.error('获取写作指南失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!analysis) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/analyze/guide/${analysis.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ writing_guide: guide }),
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

  if (!analysis) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">还未进行风格分析</p>
          <Link href={`/projects/${projectId}`} className="text-blue-600 hover:text-blue-700">
            返回项目
          </Link>
        </div>
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
          <h1 className="text-3xl font-bold text-gray-900">
            编辑写作指南
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：编辑器 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              编辑内容
            </h2>
            <textarea
              value={guide}
              onChange={(e) => setGuide(e.target.value)}
              rows={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="在此编辑写作指南..."
            />
          </div>

          {/* 右侧：预览 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              预览
            </h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {guide}
              </pre>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="mt-6 flex justify-end space-x-3">
          <Link
            href={`/projects/${projectId}`}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            取消
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </main>
    </div>
  );
}
