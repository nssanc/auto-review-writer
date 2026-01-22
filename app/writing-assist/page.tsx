'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Phrase {
  id: number;
  category: string;
  phrase: string;
  usage: string;
  example: string;
}

export default function WritingAssistPage() {
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchPhrases();
  }, []);

  const fetchPhrases = async () => {
    try {
      const response = await fetch('/api/writing/phrases');
      const data = await response.json();
      if (data.success) {
        setPhrases(data.data);
      }
    } catch (error) {
      console.error('获取学术用语失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', ...Array.from(new Set(phrases.map(p => p.category)))];

  const filteredPhrases = selectedCategory === 'all'
    ? phrases
    : phrases.filter(p => p.category === selectedCategory);

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
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block">
            ← 返回首页
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">写作辅助</h1>
          <p className="text-gray-600 mt-2">学术用语库和写作建议</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            筛选分类
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部</option>
            {categories.filter(c => c !== 'all').map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredPhrases.map((phrase) => (
            <div key={phrase.id} className="bg-white rounded-lg shadow p-6">
              <div className="mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                  {phrase.category}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {phrase.phrase}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{phrase.usage}</p>
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm text-gray-700 italic">{phrase.example}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
