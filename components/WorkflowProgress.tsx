'use client';

import Link from 'next/link';

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  link?: string;
}

interface WorkflowProgressProps {
  projectId: string;
  hasPapers: boolean;
  hasAnalysis: boolean;
  hasPlan: boolean;
  hasSearchedLiterature: boolean;
  hasDraft: boolean;
}

export default function WorkflowProgress({
  projectId,
  hasPapers,
  hasAnalysis,
  hasPlan,
  hasSearchedLiterature,
  hasDraft,
}: WorkflowProgressProps) {
  const steps: WorkflowStep[] = [
    {
      id: 1,
      name: '项目初始化',
      description: '创建项目，设置关键词',
      status: 'completed',
      link: `/projects/${projectId}/keywords`,
    },
    {
      id: 2,
      name: '文献收集',
      description: '上传参考文献，搜索相关文献',
      status: hasPapers ? 'completed' : 'pending',
      link: `/projects/${projectId}/upload`,
    },
    {
      id: 3,
      name: '风格分析',
      description: 'AI分析写作风格，生成写作指南',
      status: hasAnalysis ? 'completed' : 'pending',
      link: `/projects/${projectId}`,
    },
    {
      id: 4,
      name: '撰写计划',
      description: '生成综述撰写计划',
      status: hasPlan ? 'completed' : 'pending',
      link: `/projects/${projectId}/plan`,
    },
    {
      id: 5,
      name: '文献搜索',
      description: '搜索和筛选相关文献',
      status: hasSearchedLiterature ? 'completed' : 'pending',
      link: `/projects/${projectId}/search`,
    },
    {
      id: 6,
      name: 'AI写作',
      description: 'AI自动生成综述初稿',
      status: hasDraft ? 'completed' : 'pending',
      link: `/projects/${projectId}/write`,
    },
    {
      id: 7,
      name: '审阅导出',
      description: '编辑审阅，导出文档',
      status: hasDraft ? 'completed' : 'pending',
      link: `/projects/${projectId}/write`,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">工作流程</h2>
      <div className="space-y-3">
        {steps.map((step, index) => (
          <Link
            key={step.id}
            href={step.link || '#'}
            className="flex items-start p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-blue-200"
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold">
              {step.id}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">{step.name}</h3>
                <span className={`px-2 py-1 text-xs rounded border ${getStatusColor(step.status)}`}>
                  {step.status === 'completed' ? '已完成' : step.status === 'in_progress' ? '进行中' : '待开始'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{step.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
