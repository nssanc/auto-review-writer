import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';
import db from '@/lib/db';

// 从数据库获取激活的API配置（按优先级排序）
function getActiveAPIs(type: 'diagram' | 'image') {
  const table = type === 'diagram' ? 'diagram_apis' : 'image_processing_apis';
  const stmt = db.prepare(`
    SELECT * FROM ${table}
    WHERE is_active = 1
    ORDER BY priority DESC, id ASC
  `);
  return stmt.all() as any[];
}

// 尝试使用绘图API生成图片
async function tryGenerateDiagramImage(code: string, format: string, apis: any[]): Promise<string | null> {
  for (const api of apis) {
    try {
      console.log(`尝试使用绘图API: ${api.name} (${api.api_endpoint})`);

      // 根据不同的API端点类型调用
      if (api.api_endpoint.includes('mermaid.ink')) {
        // Mermaid Ink API
        const encodedCode = Buffer.from(code).toString('base64');
        const imageUrl = `${api.api_endpoint}/img/${encodedCode}?type=${format}`;

        // 验证URL是否可访问
        const response = await fetch(imageUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ 成功使用 ${api.name}`);
          return imageUrl;
        }
      } else {
        // 自定义API端点 - 发送POST请求
        const response = await fetch(api.api_endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${api.api_key}`,
          },
          body: JSON.stringify({
            code: code,
            format: format,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ 成功使用 ${api.name}`);
          return data.imageUrl || data.url;
        }
      }
    } catch (error) {
      console.error(`❌ ${api.name} 失败:`, error);
      // 继续尝试下一个API
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, diagramType, description, format = 'png', useArticleContent = false, language = 'zh' } = body;

    if (!projectId || !diagramType) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 如果使用文章内容，从数据库读取
    let finalDescription = description || '';
    if (useArticleContent) {
      const stmt = db.prepare(`
        SELECT content FROM review_drafts
        WHERE project_id = ? AND language = ?
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const draft = stmt.get(projectId, language) as any;

      if (!draft) {
        return NextResponse.json(
          { error: '未找到文章内容，请先生成文章' },
          { status: 404 }
        );
      }

      // 使用文章内容作为上下文
      finalDescription = `基于以下文章内容生成机制图：\n\n${draft.content.substring(0, 8000)}`;
    }

    if (!finalDescription) {
      return NextResponse.json(
        { error: '缺少描述或文章内容' },
        { status: 400 }
      );
    }

    // 验证图表类型
    const validTypes = ['mechanism', 'flowchart', 'mindmap'];
    if (!validTypes.includes(diagramType)) {
      return NextResponse.json(
        { error: '无效的图表类型' },
        { status: 400 }
      );
    }

    // 验证图片格式
    const validFormats = ['png', 'svg', 'jpg'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: '无效的图片格式' },
        { status: 400 }
      );
    }

    // 调用AI生成图表代码
    const diagramCode = await aiService.generateDiagram(
      diagramType as 'mechanism' | 'flowchart' | 'mindmap',
      finalDescription
    );

    // 清理代码（移除可能的markdown代码块标记）
    let cleanCode = diagramCode.trim();
    cleanCode = cleanCode.replace(/^```mermaid\n?/i, '');
    cleanCode = cleanCode.replace(/^```\n?/i, '');
    cleanCode = cleanCode.replace(/\n?```$/i, '');
    cleanCode = cleanCode.trim();

    // 获取配置的绘图API
    const diagramAPIs = getActiveAPIs('diagram');

    let imageUrl = '';

    if (diagramAPIs.length > 0) {
      // 尝试使用配置的API生成图片
      const generatedUrl = await tryGenerateDiagramImage(cleanCode, format, diagramAPIs);
      if (generatedUrl) {
        imageUrl = generatedUrl;
      } else {
        console.warn('所有配置的绘图API都失败，使用默认方案');
      }
    }

    // 如果没有配置API或所有API都失败，使用默认的Mermaid Ink
    if (!imageUrl) {
      const encodedCode = Buffer.from(cleanCode).toString('base64');
      imageUrl = `https://mermaid.ink/img/${encodedCode}?type=${format}`;
      console.log('使用默认 Mermaid Ink API');
    }

    return NextResponse.json({
      success: true,
      data: {
        code: cleanCode,
        type: diagramType,
        imageUrl: imageUrl,
        format: format,
      },
    });
  } catch (error) {
    console.error('生成图表失败:', error);
    return NextResponse.json(
      { error: '生成图表失败' },
      { status: 500 }
    );
  }
}
