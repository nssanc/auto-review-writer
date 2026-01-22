'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface ReviewDraft {
  id: number;
  content: string;
  language: string;
  version: number;
  created_at: string;
}

export default function WritePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [content, setContent] = useState('');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [progress, setProgress] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 写作参数配置
  const [showSettings, setShowSettings] = useState(false);
  const [wordCount, setWordCount] = useState(10000);
  const [detailLevel, setDetailLevel] = useState<'basic' | 'detailed' | 'comprehensive'>('detailed');
  const [citationDensity, setCitationDensity] = useState<'low' | 'medium' | 'high'>('high');

  // 按章节生成模式
  const [writeMode, setWriteMode] = useState<'full' | 'section'>('full');
  const [sections, setSections] = useState<string[]>([]);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  useEffect(() => {
    fetchDraft();
  }, [projectId, language]);

  const fetchDraft = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/draft?language=${language}`);
      const data = await response.json();
      if (data.success && data.data) {
        setDraft(data.data);
        setContent(data.data.content);
      }
    } catch (error) {
      console.error('获取草稿失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/draft`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, language }),
      });

      const data = await response.json();
      if (data.success) {
        alert('保存成功！');
        setIsEditing(false);
        await fetchDraft();
      } else {
        alert('保存失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: 'markdown' | 'word') => {
    setExporting(true);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, language, format }),
      });

      if (!response.ok) {
        throw new Error('导出失败');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `review_${language}_${Date.now()}.${format === 'markdown' ? 'md' : 'docx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  const handleStartWriting = async () => {
    if (draft && !confirm('已有草稿，确定要重新生成吗？这将覆盖现有内容。')) {
      return;
    }

    setWriting(true);
    setProgress('正在启动AI写作...');
    setContent('');

    try {
      const response = await fetch('/api/write/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          language,
          options: {
            wordCount,
            detailLevel,
            citationDensity
          }
        }),
      });

      if (!response.ok) {
        throw new Error('启动写作失败');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          accumulatedContent += chunk;
          setContent(accumulatedContent);
          setProgress('AI正在写作中...');
        }
      }

      setProgress('写作完成！');
      await fetchDraft();
      alert('AI写作完成！');
    } catch (error) {
      console.error('AI写作失败:', error);
      alert('AI写作失败，请重试');
    } finally {
      setWriting(false);
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
              AI自动写作
            </h1>
            {draft && !isEditing && (
              <button
                onClick={handleStartWriting}
                disabled={writing}
                className="px-4 py-2 bg-white text-green-600 border border-green-600 rounded-lg hover:bg-green-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 transition-colors"
              >
                {writing ? '生成中...' : '🔄 重新生成'}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 语言选择和操作 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-4">
              <button
                onClick={() => setLanguage('zh')}
                className={`px-4 py-2 rounded-lg ${
                  language === 'zh'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                中文
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-4 py-2 rounded-lg ${
                  language === 'en'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                English
              </button>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ⚙️ 写作设置
              </button>
            </div>

            <div className="flex space-x-3">
              {!draft && (
                <button
                  onClick={handleStartWriting}
                  disabled={writing}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {writing ? progress : '🚀 开始AI写作'}
                </button>
              )}
              {draft && !isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={() => handleExport('markdown')}
                    disabled={exporting}
                    className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 transition-colors"
                  >
                    📄 导出MD
                  </button>
                  <button
                    onClick={() => handleExport('word')}
                    disabled={exporting}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 transition-colors"
                  >
                    📝 导出Word
                  </button>
                </>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    {saving ? '保存中...' : '💾 保存'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setContent(draft?.content || '');
                    }}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    取消
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 写作设置面板 */}
          {showSettings && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">写作参数配置</h3>

              {/* 写作模式选择 */}
              <div className="mb-4 pb-4 border-b border-gray-300">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  写作模式
                </label>
                <div className="flex space-x-4">
                  <button
                    onClick={() => setWriteMode('full')}
                    className={`px-4 py-2 rounded-lg ${
                      writeMode === 'full'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    完整生成
                  </button>
                  <button
                    onClick={() => setWriteMode('section')}
                    className={`px-4 py-2 rounded-lg ${
                      writeMode === 'section'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    按章节生成（推荐）
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {writeMode === 'full'
                    ? '一次性生成完整综述'
                    : '逐章节生成，每个章节更详细深入'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 目标字数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    目标字数
                  </label>
                  <input
                    type="number"
                    value={wordCount}
                    onChange={(e) => setWordCount(Number(e.target.value))}
                    min="3000"
                    max="20000"
                    step="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {language === 'zh' ? '建议：8000-12000字' : '建议：6000-10000字'}
                  </p>
                </div>

                {/* 详细程度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    详细程度
                  </label>
                  <select
                    value={detailLevel}
                    onChange={(e) => setDetailLevel(e.target.value as 'basic' | 'detailed' | 'comprehensive')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="basic">基础 - 简明扼要</option>
                    <option value="detailed">详细 - 深入分析（推荐）</option>
                    <option value="comprehensive">全面 - 最详尽</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    控制每个章节的段落数量和分析深度
                  </p>
                </div>

                {/* 引用密度 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    引用密度
                  </label>
                  <select
                    value={citationDensity}
                    onChange={(e) => setCitationDensity(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">低 - 适当引用</option>
                    <option value="medium">中 - 频繁引用</option>
                    <option value="high">高 - 大量引用（推荐）</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    控制文献引用的频率和密度
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 内容显示区域 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            综述内容
          </h2>
          {isEditing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-4 min-h-[500px] font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="编辑综述内容..."
            />
          ) : (
            <div className="border border-gray-300 rounded-lg p-4 min-h-[500px]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {content || '点击"开始AI写作"按钮生成综述内容...'}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
