'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Paper {
  id?: string;
  title: string;
  authors: string;
  abstract: string;
  url: string;
  pdf_url?: string;
  published?: string;
  translatedTitle?: string;
  translatedAbstract?: string;
}

interface Keyword {
  id: number;
  keyword: string;
  category: string | null;
  is_primary: number;
}

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [query, setQuery] = useState('');
  const [source, setSource] = useState<'arxiv' | 'pubmed'>('pubmed');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<Set<number>>(new Set());
  const [translating, setTranslating] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [minImpactFactor, setMinImpactFactor] = useState('');
  const [highImpactOnly, setHighImpactOnly] = useState(false);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<number>>(new Set());
  const [generatingQuery, setGeneratingQuery] = useState(false);
  const [maxResults, setMaxResults] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteringByAI, setFilteringByAI] = useState(false);
  const resultsPerPage = 10;

  // AI筛选配置
  const [showAIFilterSettings, setShowAIFilterSettings] = useState(false);
  const [aiFilterCount, setAiFilterCount] = useState(20);
  const [aiFilterCriteria, setAiFilterCriteria] = useState('');

  // 表格导入
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPapers, setUploadedPapers] = useState<Paper[]>([]);
  const [uploading, setUploading] = useState(false);

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
      setLoadingKeywords(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    setQuery(keyword);
  };

  const toggleKeywordSelection = (keywordId: number) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keywordId)) {
      newSelected.delete(keywordId);
    } else {
      newSelected.add(keywordId);
    }
    setSelectedKeywords(newSelected);
  };

  const handleGenerateSearchQuery = async () => {
    if (selectedKeywords.size === 0) {
      alert('请至少选择一个关键词');
      return;
    }

    setGeneratingQuery(true);
    try {
      const selectedKws = keywords.filter(k => selectedKeywords.has(k.id));
      const response = await fetch('/api/generate/search-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: selectedKws.map(k => ({ keyword: k.keyword, isPrimary: k.is_primary === 1 })),
          source: source
        }),
      });

      const data = await response.json();
      if (data.success) {
        setQuery(data.data.query);
      } else {
        alert('生成检索式失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('生成检索式失败:', error);
      alert('生成检索式失败，请重试');
    } finally {
      setGeneratingQuery(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('请输入搜索关键词');
      return;
    }

    setSearching(true);
    setResults([]);
    setSelectedPapers(new Set());
    setCurrentPage(1);

    try {
      const endpoint = source === 'arxiv' ? '/api/search/arxiv' : '/api/search/pubmed';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          maxResults: maxResults,
          yearFrom: yearFrom || undefined,
          yearTo: yearTo || undefined,
          highImpactOnly: highImpactOnly
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data);
      } else {
        alert(data.error || '搜索失败');
      }
    } catch (error) {
      console.error('搜索失败:', error);
      alert('搜索失败，请重试');
    } finally {
      setSearching(false);
    }
  };

  const handleAIFilter = async () => {
    if (results.length === 0) {
      alert('请先搜索或导入文献');
      return;
    }

    setFilteringByAI(true);
    try {
      const response = await fetch('/api/literature/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          papers: results,
          maxResults: aiFilterCount || results.length, // 如果不设置数量，返回所有符合的
          customCriteria: aiFilterCriteria || undefined
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResults(data.data);
        setSelectedPapers(new Set());
        setCurrentPage(1);
        alert(data.message || 'AI筛选完成');
      } else {
        alert(data.error || 'AI筛选失败');
      }
    } catch (error) {
      console.error('AI筛选失败:', error);
      alert('AI筛选失败，请重试');
    } finally {
      setFilteringByAI(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPapers.size === results.length) {
      setSelectedPapers(new Set());
    } else {
      setSelectedPapers(new Set(results.map((_, index) => index)));
    }
  };

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedPapers);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedPapers(newSelected);
  };

  const translatePaper = async (index: number) => {
    const paper = results[index];
    if (paper.translatedTitle && paper.translatedAbstract) {
      return;
    }

    setTranslating(new Set(translating).add(index));

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: paper.title,
          abstract: paper.abstract,
        }),
      });

      const data = await response.json();
      if (data.success) {
        const newResults = [...results];
        newResults[index] = {
          ...paper,
          translatedTitle: data.data.title,
          translatedAbstract: data.data.abstract,
        };
        setResults(newResults);
      } else {
        alert('翻译失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('翻译失败:', error);
      alert('翻译失败，请重试');
    } finally {
      const newTranslating = new Set(translating);
      newTranslating.delete(index);
      setTranslating(newTranslating);
    }
  };

  const exportToTable = () => {
    if (results.length === 0) {
      alert('没有搜索结果可以导出');
      return;
    }

    let csv = '\uFEFF'; // UTF-8 BOM
    csv += '题目,作者,摘要,发表时间,来源链接\n';

    results.forEach(paper => {
      const title = `"${(paper.title || '').replace(/"/g, '""')}"`;
      const authors = `"${(paper.authors || '').replace(/"/g, '""')}"`;
      const abstract = `"${(paper.abstract || '').replace(/"/g, '""')}"`;
      const published = `"${(paper.published || '').replace(/"/g, '""')}"`;
      const url = `"${(paper.url || '').replace(/"/g, '""')}"`;

      csv += `${title},${authors},${abstract},${published},${url}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `文献搜索结果_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      alert('请上传CSV或Excel文件');
      return;
    }

    setUploadedFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const response = await fetch('/api/literature/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUploadedPapers(data.data);
        setResults(data.data);
        alert(`成功导入 ${data.data.length} 篇文献`);
      } else {
        alert('导入失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('导入文献失败:', error);
      alert('导入文献失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const saveSelectedPapers = async () => {
    if (selectedPapers.size === 0) {
      alert('请至少选择一篇文献');
      return;
    }

    setSaving(true);
    try {
      const selectedData = Array.from(selectedPapers).map(index => results[index]);

      const response = await fetch(`/api/projects/${projectId}/literature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ papers: selectedData }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`成功保存 ${selectedPapers.size} 篇文献到数据库！\n\n文献已保存到项目中，您可以在项目详情页面查看所有已保存的文献。`);
        router.push(`/projects/${projectId}`);
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

  // 导出当前选中的文献
  const exportSelectedLiterature = async (format: 'ris' | 'bibtex') => {
    if (selectedPapers.size === 0) {
      alert('请先选择要导出的文献');
      return;
    }

    try {
      // 获取选中的文献数据
      const selectedPapersData = Array.from(selectedPapers).map(index => results[index]);

      const response = await fetch('/api/literature/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, papers: selectedPapersData }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert('导出失败: ' + (data.error || '未知错误'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'ris' ? 'selected_references.ris' : 'selected_references.bib';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  // 导出已保存的文献
  const exportLiterature = async (format: 'ris' | 'bibtex') => {
    try {
      const response = await fetch('/api/literature/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, format }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert('导出失败: ' + (data.error || '未知错误'));
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'ris' ? 'saved_references.ris' : 'saved_references.bib';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

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
            搜索文献
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 项目关键词快速选择 */}
        {keywords.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                项目关键词（多选后生成检索式）
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    if (selectedKeywords.size === keywords.length) {
                      setSelectedKeywords(new Set());
                    } else {
                      setSelectedKeywords(new Set(keywords.map(k => k.id)));
                    }
                  }}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  {selectedKeywords.size === keywords.length ? '取消全选' : '全选'}
                </button>
                <Link
                  href={`/projects/${projectId}/keywords`}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  管理关键词 →
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {keywords.map((kw) => (
                <label
                  key={kw.id}
                  className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-all border-2 ${
                    selectedKeywords.has(kw.id)
                      ? kw.is_primary === 1
                        ? 'bg-red-100 border-red-500 text-red-800'
                        : 'bg-blue-100 border-blue-500 text-blue-800'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKeywords.has(kw.id)}
                    onChange={() => toggleKeywordSelection(kw.id)}
                    className="mr-2"
                  />
                  {kw.keyword}
                  {kw.is_primary === 1 && ' ⭐'}
                </label>
              ))}
            </div>
            {selectedKeywords.size > 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleGenerateSearchQuery}
                  disabled={generatingQuery}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
                >
                  {generatingQuery ? 'AI生成中...' : `生成检索式 (${selectedKeywords.size}个关键词)`}
                </button>
                <button
                  onClick={() => setSelectedKeywords(new Set())}
                  className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  清除选择
                </button>
              </div>
            )}
          </div>
        )}

        {/* 搜索表单 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据源
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSource('pubmed')}
                  className={`px-4 py-2 rounded-lg ${
                    source === 'pubmed'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  PubMed
                </button>
                <button
                  onClick={() => setSource('arxiv')}
                  className={`px-4 py-2 rounded-lg ${
                    source === 'arxiv'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  arXiv
                </button>
              </div>
            </div>

            {/* 文件导入 */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                或导入文献表格
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer ${
                    uploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {uploading ? '📤 导入中...' : '📁 选择CSV/Excel文件'}
                </label>
                {uploadedFile && (
                  <span className="text-sm text-gray-600">
                    已选择: {uploadedFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                支持CSV和Excel格式，表格应包含：题目、作者、摘要等列
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索关键词
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="输入关键词，如：machine learning, deep learning"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {searching ? '搜索中...' : '搜索'}
                </button>
                <button
                  onClick={handleAIFilter}
                  disabled={filteringByAI || results.length === 0}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  title="使用AI根据相关度筛选最相关的20篇文献"
                >
                  {filteringByAI ? 'AI筛选中...' : '🤖 AI智能筛选'}
                </button>
                <button
                  onClick={() => setShowAIFilterSettings(!showAIFilterSettings)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  ⚙️ 筛选设置
                </button>
              </div>
            </div>

            {/* AI筛选配置面板 */}
            {showAIFilterSettings && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">AI筛选配置</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      筛选数量（留空或填0则返回所有符合的文献）
                    </label>
                    <input
                      type="number"
                      value={aiFilterCount}
                      onChange={(e) => setAiFilterCount(Number(e.target.value))}
                      placeholder="例如：20"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">默认20篇，设为0则不限制数量</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      自定义筛选条件（可选）
                    </label>
                    <textarea
                      value={aiFilterCriteria}
                      onChange={(e) => setAiFilterCriteria(e.target.value)}
                      placeholder="例如：优先选择实验研究，排除综述类文章；或：只要包含临床试验的研究"
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">AI会根据您的条件进行额外筛选</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                年限筛选（可选）
              </label>
              <div className="flex space-x-3 items-center">
                <input
                  type="number"
                  value={yearFrom}
                  onChange={(e) => setYearFrom(e.target.value)}
                  placeholder="起始年份"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">至</span>
                <input
                  type="number"
                  value={yearTo}
                  onChange={(e) => setYearTo(e.target.value)}
                  placeholder="结束年份"
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-500">例如：2020 至 2024</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                搜索数量
              </label>
              <input
                type="number"
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                min="10"
                step="10"
                placeholder="输入数量，如100"
                className="w-40 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">不限制数量，建议100-500篇</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                质量筛选（可选）
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={highImpactOnly}
                    onChange={(e) => setHighImpactOnly(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">仅显示高影响力期刊</span>
                </label>
                <span className="text-xs text-gray-500">
                  （Nature, Science, Cell等顶级期刊及其子刊）
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索结果 */}
        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                搜索结果 ({results.length})
              </h2>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAIFilter}
                  disabled={filteringByAI}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {filteringByAI ? 'AI筛选中...' : 'AI智能筛选'}
                </button>
                <button
                  onClick={exportToTable}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  导出表格
                </button>
                <button
                  onClick={() => exportSelectedLiterature('ris')}
                  disabled={selectedPapers.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  title="导出当前选中的文献为 RIS 格式 (EndNote/Zotero)"
                >
                  导出选中 EndNote ({selectedPapers.size})
                </button>
                <button
                  onClick={() => exportSelectedLiterature('bibtex')}
                  disabled={selectedPapers.size === 0}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  title="导出当前选中的文献为 BibTeX 格式 (Zotero/LaTeX)"
                >
                  导出选中 BibTeX ({selectedPapers.size})
                </button>
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {selectedPapers.size === results.length ? '取消全选' : '全选'}
                </button>
                <button
                  onClick={saveSelectedPapers}
                  disabled={saving || selectedPapers.size === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : `保存选中 (${selectedPapers.size})`}
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {results.map((paper, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPapers.has(index)}
                      onChange={() => toggleSelect(index)}
                      className="mt-1 h-4 w-4 text-blue-600 rounded"
                    />
                    <div className="flex-1">
                      <div className="mb-3">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-medium text-gray-900 flex-1">
                            {paper.translatedTitle || paper.title}
                          </h3>
                          <button
                            onClick={() => translatePaper(index)}
                            disabled={translating.has(index)}
                            className="ml-3 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            {translating.has(index) ? '翻译中...' : paper.translatedTitle ? '已翻译' : '翻译'}
                          </button>
                        </div>
                        {paper.translatedTitle && (
                          <p className="text-sm text-gray-500 italic">
                            原标题: {paper.title}
                          </p>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        作者: {paper.authors}
                      </p>
                      {paper.published && (
                        <p className="text-sm text-gray-500 mb-2">
                          发表时间: {paper.published}
                        </p>
                      )}

                      <div className="mb-3">
                        <p className="text-sm text-gray-700">
                          {paper.translatedAbstract || paper.abstract}
                        </p>
                        {paper.translatedAbstract && (
                          <details className="mt-2">
                            <summary className="text-sm text-gray-500 cursor-pointer">
                              查看原文摘要
                            </summary>
                            <p className="text-sm text-gray-600 mt-1 italic">
                              {paper.abstract}
                            </p>
                          </details>
                        )}
                      </div>

                      <div className="flex items-center space-x-3">
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          查看详情 →
                        </a>
                        {paper.pdf_url ? (
                          <a
                            href={paper.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-green-600 hover:text-green-700 text-sm"
                          >
                            <span>✓</span>
                            <span>PDF可用</span>
                          </a>
                        ) : (
                          <span className="flex items-center space-x-1 text-gray-400 text-sm">
                            <span>✗</span>
                            <span>PDF不可用</span>
                          </span>
                        )}
                      </div>
                    </div>
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
