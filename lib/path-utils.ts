/**
 * 路径工具类
 * 用于生成和管理 WebDAV 文件路径
 */

import db from './db';

/**
 * 清理项目名称，移除非法字符
 * @param name 原始项目名称
 * @returns 清理后的项目名称
 */
export function sanitizeProjectName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '') // 移除文件系统非法字符
    .replace(/\s+/g, '_')          // 空格替换为下划线
    .replace(/_{2,}/g, '_')        // 多个下划线替换为单个
    .replace(/^_|_$/g, '')         // 移除首尾下划线
    .substring(0, 100);            // 限制长度
}

/**
 * 获取项目信息
 * @param projectId 项目ID
 * @returns 项目信息
 */
export function getProjectById(projectId: number): { id: number; name: string } | null {
  try {
    const stmt = db.prepare('SELECT id, name FROM projects WHERE id = ?');
    const project = stmt.get(projectId) as { id: number; name: string } | undefined;
    return project || null;
  } catch (error) {
    console.error('Failed to get project:', error);
    return null;
  }
}

/**
 * 获取项目的远程根路径
 * @param projectId 项目ID
 * @returns 远程路径，如 /literature-review-ai/projects/My_Project
 */
export function getProjectRemotePath(projectId: number): string {
  const project = getProjectById(projectId);
  if (!project) {
    return `/literature-review-ai/projects/project_${projectId}`;
  }

  const sanitizedName = sanitizeProjectName(project.name);
  return `/literature-review-ai/projects/${sanitizedName}`;
}

/**
 * 获取项目子文件夹路径
 * @param projectId 项目ID
 * @param subfolder 子文件夹名称
 * @returns 完整的远程路径
 */
export function getSubfolderPath(projectId: number, subfolder: string): string {
  return `${getProjectRemotePath(projectId)}/${subfolder}`;
}

/**
 * 生成带时间戳的文件名
 * @param prefix 文件名前缀
 * @param extension 文件扩展名（不含点）
 * @returns 文件名，如 plan_v1_2024-01-22_10-30-00.md
 */
export function generateTimestampedFilename(prefix: string, extension: string): string {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  return `${prefix}_${timestamp}.${extension}`;
}

/**
 * 生成版本化文件名
 * @param prefix 文件名前缀
 * @param version 版本号
 * @param extension 文件扩展名（不含点）
 * @returns 文件名，如 plan_v1_2024-01-22.md
 */
export function generateVersionedFilename(prefix: string, version: number, extension: string): string {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_v${version}_${date}.${extension}`;
}

/**
 * 获取 PDF 文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemotePdfPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'pdfs')}/${filename}`;
}

/**
 * 获取文章文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteArticlePath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'articles')}/${filename}`;
}

/**
 * 获取图片文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteImagePath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'images')}/${filename}`;
}

/**
 * 获取计划文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemotePlanPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'plans')}/${filename}`;
}

/**
 * 获取分析文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteAnalysisPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'analysis')}/${filename}`;
}

/**
 * 获取关键词文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteKeywordsPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'keywords')}/${filename}`;
}

/**
 * 获取搜索结果文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteSearchPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'search')}/${filename}`;
}

/**
 * 获取导出文件的远程路径
 * @param projectId 项目ID
 * @param filename 文件名
 * @returns 完整的远程路径
 */
export function getRemoteExportPath(projectId: number, filename: string): string {
  return `${getSubfolderPath(projectId, 'exports')}/${filename}`;
}
