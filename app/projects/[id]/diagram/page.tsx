'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import mermaid from 'mermaid';

interface Project {
  id: number;
  name: string;
  description: string;
}

export default function DiagramPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [diagramType, setDiagramType] = useState<'mechanism' | 'flowchart' | 'mindmap'>('mechanism');
  const [renderMode, setRenderMode] = useState<'mermaid' | 'illustration'>('illustration');
  const [imageFormat, setImageFormat] = useState<'png' | 'svg' | 'jpg'>('png');
  const [description, setDescription] = useState('');
  const [generating, setGenerating] = useState(false);
  const [diagramCode, setDiagramCode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [useArticleContent, setUseArticleContent] = useState(false);
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedContent, setUploadedContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [useUploadedContent, setUseUploadedContent] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // 顶刊常用机制图类型
  const mechanismTemplates = [
    {
      id: 'signaling_pathway',
      name: '信号转导通路',
      description: 'Nature/Cell常用：展示完整的信号级联反应，包括受体激活、信号转导和基因表达调控',
      example: '例如：配体-受体结合 → 第二信使 → 激酶级联 → 转录因子激活 → 基因表达'
    },
    {
      id: 'molecular_mechanism',
      name: '分子作用机制',
      description: 'Science/PNAS常用：展示分子间相互作用、蛋白质修饰和功能调控',
      example: '例如：蛋白A磷酸化 → 构象变化 → 与蛋白B结合 → 下游效应'
    },
    {
      id: 'disease_pathogenesis',
      name: '疾病发病机制',
      description: 'Lancet/NEJM常用：展示从病因到病理变化的完整过程',
      example: '例如：致病因素 → 细胞损伤 → 炎症反应 → 组织重塑 → 临床表现'
    },
    {
      id: 'drug_mechanism',
      name: '药物作用机制',
      description: 'Nature Medicine常用：展示药物靶点、作用途径和治疗效应',
      example: '例如：药物 → 靶点结合 → 信号阻断 → 病理改善 → 症状缓解'
    },
    {
      id: 'metabolic_pathway',
      name: '代谢调控网络',
      description: 'Cell Metabolism常用：展示代谢物转化、酶促反应和能量流动',
      example: '例如：底物 → 酶1 → 中间产物 → 酶2 → 最终产物 + 能量'
    },
    {
      id: 'gene_regulation',
      name: '基因调控网络',
      description: 'Nature Genetics常用：展示转录调控、表观遗传修饰和基因表达',
      example: '例如：转录因子 → 启动子结合 → 染色质重塑 → mRNA转录 → 蛋白表达'
    },
    {
      id: 'immune_response',
      name: '免疫应答机制',
      description: 'Immunity常用：展示免疫细胞激活、细胞因子网络和效应功能',
      example: '例如：抗原呈递 → T细胞激活 → 细胞因子释放 → B细胞活化 → 抗体产生'
    },
    {
      id: 'cell_death',
      name: '细胞死亡通路',
      description: 'Cell Death & Disease常用：展示凋亡、坏死、焦亡等细胞死亡机制',
      example: '例如：死亡信号 → Caspase激活 → 线粒体损伤 → 细胞凋亡'
    },
    {
      id: 'autophagy',
      name: '自噬调控机制',
      description: 'Autophagy常用：展示自噬体形成、货物识别和降解过程',
      example: '例如：营养缺乏 → mTOR抑制 → ULK1激活 → 自噬体形成 → 溶酶体降解'
    },
    {
      id: 'epigenetic',
      name: '表观遗传调控',
      description: 'Nature Reviews Genetics常用：展示DNA甲基化、组蛋白修饰和染色质重塑',
      example: '例如：DNMT → DNA甲基化 → 基因沉默 / HAT → 组蛋白乙酰化 → 基因激活'
    },
    {
      id: 'custom',
      name: '自定义机制',
      description: '根据您的具体研究需求自由描述机制',
      example: ''
    }
  ];

  // 初始化 Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
    });
  }, []);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  // 渲染 Mermaid 图表
  useEffect(() => {
    if (diagramCode && mermaidRef.current && !showCode) {
      const renderDiagram = async () => {
        try {
          console.log('开始渲染 Mermaid 图表...');
          console.log('代码:', diagramCode);

          mermaidRef.current!.innerHTML = '';

          // 验证代码
          const isValid = await mermaid.parse(diagramCode);
          console.log('代码验证:', isValid);

          const { svg } = await mermaid.render('mermaid-diagram', diagramCode);
          mermaidRef.current!.innerHTML = svg;
          setImageLoadError(false);
          console.log('渲染成功！');
        } catch (error: any) {
          console.error('Mermaid 渲染失败:', error);
          console.error('错误详情:', error.message);
          console.error('错误代码:', diagramCode);
          setImageLoadError(true);
          setShowCode(true);
        }
      };
      renderDiagram();
    }
  }, [diagramCode, showCode]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      const data = await response.json();
      if (data.success) {
        setProject(data.data);
      }
    } catch (error) {
      console.error('获取项目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/diagram/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        setUploadedContent(data.data.content);
        setUseUploadedContent(true);
        alert(`✅ 文件上传成功！已读取 ${Math.round(data.data.size / 1024)}KB 内容`);
      } else {
        alert('❌ ' + data.error);
        setUploadedFile(null);
      }
    } catch (error) {
      console.error('上传文件失败:', error);
      alert('上传文件失败，请重试');
      setUploadedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateDiagram = async () => {
    if (!useArticleContent && !useUploadedContent && !description.trim()) {
      alert('请输入图表描述、上传Word文件或选择使用文章内容');
      return;
    }

    setGenerating(true);
    setDiagramCode('');
    setImageUrl('');
    setImageLoadError(false);

    try {
      let finalDescription = description;
      if (useUploadedContent && uploadedContent) {
        finalDescription = uploadedContent.substring(0, 8000);
      }

      // 根据渲染模式选择不同的API
      const apiEndpoint = renderMode === 'illustration'
        ? '/api/diagram/generate-illustration'
        : '/api/diagram/generate';

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          diagramType,
          description: useArticleContent ? '' : finalDescription,
          format: imageFormat,
          useArticleContent,
          language,
          renderMode,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDiagramCode(data.data.code);
        setImageUrl(data.data.imageUrl);
      } else {
        alert('生成失败: ' + (data.error || '未知错误'));
      }
    } catch (error) {
      console.error('生成图表失败:', error);
      alert('生成图表失败，请重试');
    } finally {
      setGenerating(false);
    }
  };

  const downloadImage = async () => {
    try {
      // 如果有图片URL（illustration模式），直接下载图片
      if (imageUrl) {
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `illustration_${diagramType}_${Date.now()}.png`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      }

      // 否则下载SVG（mermaid模式）
      if (!mermaidRef.current) return;

      const svgElement = mermaidRef.current.querySelector('svg');
      if (!svgElement) {
        alert('没有可下载的图表');
        return;
      }

      // 获取 SVG 字符串
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `diagram_${diagramType}_${Date.now()}.svg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载图片失败:', error);
      alert('下载图片失败，请重试');
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
          <h1 className="text-3xl font-bold text-gray-900">
            🎨 AI绘制图表
          </h1>
          {project && (
            <p className="text-gray-600 mt-2">{project.name}</p>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：配置区 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              图表配置
            </h2>

            <div className="space-y-4">
              {/* 渲染模式选择 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  生成模式
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRenderMode('illustration')}
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      renderMode === 'illustration'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🎨 科研插图
                  </button>
                  <button
                    onClick={() => setRenderMode('mermaid')}
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      renderMode === 'mermaid'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📐 流程图
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {renderMode === 'illustration'
                    ? '使用AI生成专业的医学/生物学插图，适合发表论文'
                    : '生成Mermaid流程图，适合展示逻辑关系'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图表类型
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setDiagramType('mechanism')}
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      diagramType === 'mechanism'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🧬 机制图
                  </button>
                  <button
                    onClick={() => setDiagramType('flowchart')}
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      diagramType === 'flowchart'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    📊 流程图
                  </button>
                  <button
                    onClick={() => setDiagramType('mindmap')}
                    className={`px-4 py-3 rounded-lg text-sm font-medium ${
                      diagramType === 'mindmap'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    🗺️ 思维导图
                  </button>
                </div>
              </div>

              {/* 机制图模板选择 */}
              {diagramType === 'mechanism' && (
                <div className="border-t border-gray-200 pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    🎯 选择机制图类型（可选）
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {mechanismTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template.id);
                          if (template.id !== 'custom' && !useArticleContent) {
                            setDescription(
                              `请生成${template.name}的机制图。\n\n${template.description}\n\n${template.example}`
                            );
                          }
                        }}
                        className={`px-3 py-2 rounded-lg text-sm text-left ${
                          selectedTemplate === template.id
                            ? 'bg-purple-100 border-2 border-purple-500 text-purple-900'
                            : 'bg-gray-50 border border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {template.description}
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 选择模板后，系统会自动填充描述，您可以根据需要修改
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图片格式
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setImageFormat('png')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      imageFormat === 'png'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    PNG
                  </button>
                  <button
                    onClick={() => setImageFormat('svg')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      imageFormat === 'svg'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    SVG
                  </button>
                  <button
                    onClick={() => setImageFormat('jpg')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      imageFormat === 'jpg'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    JPG
                  </button>
                </div>
              </div>

              {/* Word文件上传选项 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useUploadedContent"
                    checked={useUploadedContent}
                    onChange={(e) => {
                      setUseUploadedContent(e.target.checked);
                      if (!e.target.checked) {
                        setUploadedFile(null);
                        setUploadedContent('');
                      }
                    }}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="useUploadedContent" className="ml-2 text-sm font-medium text-gray-700">
                    📎 上传Word文件生成机制图
                  </label>
                </div>

                {useUploadedContent && (
                  <div className="ml-6 space-y-3">
                    <p className="text-xs text-gray-600">
                      上传Word文档（.doc/.docx），AI将自动读取内容并生成图表
                    </p>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? '上传中...' : uploadedFile ? `✅ ${uploadedFile.name}` : '📁 选择Word文件'}
                      </button>
                      {uploadedFile && (
                        <p className="mt-2 text-xs text-green-600">
                          已读取 {Math.round(uploadedContent.length / 1024)}KB 内容
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 新增：使用文章内容选项 */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="useArticleContent"
                    checked={useArticleContent}
                    onChange={(e) => setUseArticleContent(e.target.checked)}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <label htmlFor="useArticleContent" className="ml-2 text-sm font-medium text-gray-700">
                    📄 基于文章内容生成机制图
                  </label>
                </div>

                {useArticleContent && (
                  <div className="ml-6 space-y-3">
                    <p className="text-xs text-gray-600">
                      AI将自动读取您生成的文章内容，提取关键机制信息并生成图表
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        文章语言
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => setLanguage('zh')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            language === 'zh'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          中文
                        </button>
                        <button
                          onClick={() => setLanguage('en')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium ${
                            language === 'en'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  图表描述 {useArticleContent && <span className="text-gray-500">(可选)</span>}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请详细描述您想要绘制的图表内容，例如：&#10;- 机制图：描述生物学过程、信号通路等&#10;- 流程图：描述实验步骤、研究流程等&#10;- 思维导图：描述概念关系、知识结构等"
                  rows={10}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  提示：描述越详细，生成的图表越准确
                </p>
              </div>

              <button
                onClick={handleGenerateDiagram}
                disabled={generating}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {generating ? '🤖 AI生成中...' : '🎨 生成图表'}
              </button>
            </div>
          </div>

          {/* 右侧：预览区 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                图表预览
              </h2>
              {imageUrl && (
                <button
                  onClick={() => setShowCode(!showCode)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  {showCode ? '📊 查看图片' : '💻 查看代码'}
                </button>
              )}
            </div>

            {diagramCode ? (
              <div className="space-y-4">
                {!showCode ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    {imageUrl ? (
                      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                        <img
                          ref={imageRef}
                          src={imageUrl}
                          alt="Generated illustration"
                          className="w-full h-auto"
                          onLoad={(e) => {
                            setImageLoadError(false);
                            const img = e.target as HTMLImageElement;
                            console.log('图片尺寸:', img.naturalWidth, 'x', img.naturalHeight);
                          }}
                          onError={() => setImageLoadError(true)}
                        />
                      </div>
                    ) : (
                      <div ref={mermaidRef} className="w-full overflow-x-auto"></div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {imageLoadError && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ 图片加载失败。您可以：
                        </p>
                        <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc">
                          <li>复制下方的 Mermaid 代码</li>
                          <li>在 <a href="https://mermaid.live" target="_blank" className="text-blue-600 underline">Mermaid Live Editor</a> 中粘贴并查看</li>
                          <li>或者重新生成图表</li>
                        </ul>
                      </div>
                    )}
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                        <code>{diagramCode}</code>
                      </pre>
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={downloadImage}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    💾 下载图片
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(diagramCode);
                      alert('代码已复制到剪贴板');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    📋 复制代码
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p className="mb-2">还没有生成图表</p>
                <p className="text-sm">请在左侧配置并生成图表</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

