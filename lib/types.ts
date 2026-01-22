// 项目相关类型
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'draft' | 'analyzing' | 'writing' | 'completed';
  created_at: string;
  updated_at: string;
}

// 参考文献类型
export interface ReferencePaper {
  id: number;
  project_id: number;
  filename: string;
  file_path: string;
  file_type: 'pdf' | 'docx';
  extracted_text?: string;
  created_at: string;
}

// 风格分析类型
export interface StyleAnalysis {
  id: number;
  project_id: number;
  analysis_result?: string;
  writing_guide?: string;
  created_at: string;
}

// 综述计划类型
export interface ReviewPlan {
  id: number;
  project_id: number;
  plan_content?: string;
  version: number;
  created_at: string;
}

// 搜索文献类型
export interface SearchedLiterature {
  id: number;
  project_id: number;
  source: 'arxiv' | 'pubmed';
  title?: string;
  authors?: string;
  abstract?: string;
  doi?: string;
  url?: string;
  pdf_url?: string;
  metadata?: string;
  is_selected: boolean;
  created_at: string;
}

// 综述草稿类型
export interface ReviewDraft {
  id: number;
  project_id: number;
  content?: string;
  language: 'zh' | 'en';
  version: number;
  created_at: string;
}

// AI配置类型
export interface AIConfig {
  id: number;
  api_endpoint: string;
  api_key: string;
  model_name: string;
  created_at: string;
  updated_at: string;
}
