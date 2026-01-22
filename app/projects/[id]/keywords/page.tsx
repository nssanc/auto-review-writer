'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Keyword {
  id: number;
  keyword: string;
  category: string | null;
  is_primary: number;
  created_at: string;
}

interface SuggestedKeyword {
  keyword: string;
  category: string;
  relevance: string;
}

export default function KeywordsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedKeyword[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    fetchKeywords();
  }, [projectId]);

  const fetchKeywords = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/keywords`);
      const data = await response.json();
      if (data.success) {
        setKeywords(data.data);
      }
    } catch (error) {
      console.error('获取关键词失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      alert('请输入关键词');
      return;
    }

    setAdding(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: newKeyword.trim(),
          category: newCategory || null,
          is_primary: isPrimary,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNewKeyword('');
        setNewCategory('');
        setIsPrimary(false);
        fetchKeywords();
      } else {
        alert('添加失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('添加关键词失败:', error);
      alert('添加关键词失败，请重试');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: number) => {
    if (!confirm('确定要删除这个关键词吗？')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/projects/${projectId}/keywords?keywordId=${keywordId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      if (data.success) {
        fetchKeywords();
      } else {
        alert('删除失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('删除关键词失败:', error);
      alert('删除关键词失败，请重试');
    }
  };

  const handleGetSuggestions = async () => {
    if (keywords.length === 0) {
      alert('请先添加至少一个关键词');
      return;
    }

    setSuggesting(true);
    try {
      const userKeywords = keywords.map(k => k.keyword);
      const response = await fetch(`/api/projects/${projectId}/keywords/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userKeywords }),
      });

      const data = await response.json();
      if (data.success) {
        setSuggestions(data.data);
        setShowSuggestions(true);
      } else {
        alert('获取推荐失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('获取推荐失败:', error);
      alert('获取推荐失败，请重试');
    } finally {
      setSuggesting(false);
    }
  };

  const handleAddSuggestion = async (suggestion: SuggestedKeyword) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyword: suggestion.keyword,
          category: suggestion.category,
          is_primary: false,
        }),
      });

      const data = await response.json();
      if (data.success) {
        fetchKeywords();
        setSuggestions(suggestions.filter(s => s.keyword !== suggestion.keyword));
      }
    } catch (error) {
      console.error('添加关键词失败:', error);
      alert('添加关键词失败，请重试');
    }
  };

  const getCategoryColor = (category: string | null) => {
    const colorMap: Record<string, string> = {
      '方法类': 'bg-blue-100 text-blue-800',
      '应用类': 'bg-green-100 text-green-800',
      '理论类': 'bg-purple-100 text-purple-800',
      '数据类': 'bg-yellow-100 text-yellow-800',
    };
    return category ? colorMap[category] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800';
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
          <h1 className="text-3xl font-bold text-gray-900">关键词管理</h1>
          <p className="text-gray-600 mt-2">
            管理项目关键词，AI将基于这些关键词推荐相关文献和生成综述内容
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：添加关键词 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">添加关键词</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  关键词
                </label>
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="输入关键词"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分类（可选）
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">未分类</option>
                  <option value="方法类">方法类</option>
                  <option value="应用类">应用类</option>
                  <option value="理论类">理论类</option>
                  <option value="数据类">数据类</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="isPrimary" className="ml-2 text-sm text-gray-700">
                  核心关键词
                </label>
              </div>

              <button
                onClick={handleAddKeyword}
                disabled={adding}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {adding ? '添加中...' : '添加关键词'}
              </button>
            </div>
          </div>

          {/* 右侧：已有关键词 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                已有关键词 ({keywords.length})
              </h2>
              <button
                onClick={handleGetSuggestions}
                disabled={suggesting || keywords.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                {suggesting ? 'AI推荐中...' : 'AI推荐关键词'}
              </button>
            </div>

            {keywords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>还没有添加关键词</p>
                <p className="text-sm mt-2">请先添加至少一个关键词</p>
              </div>
            ) : (
              <div className="space-y-2">
                {keywords.map((keyword) => (
                  <div
                    key={keyword.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900">
                        {keyword.keyword}
                      </span>
                      {keyword.category && (
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(keyword.category)}`}>
                          {keyword.category}
                        </span>
                      )}
                      {keyword.is_primary === 1 && (
                        <span className="px-2 py-1 rounded text-xs bg-red-100 text-red-800">
                          核心
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteKeyword(keyword.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      删除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* AI推荐关键词 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                AI推荐关键词 ({suggestions.length})
              </h2>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                关闭
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {suggestion.keyword}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(suggestion.category)}`}>
                          {suggestion.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{suggestion.relevance}</p>
                    </div>
                    <button
                      onClick={() => handleAddSuggestion(suggestion)}
                      className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      添加
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
