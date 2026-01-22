import { NextRequest, NextResponse } from 'next/server';
import aiService from '@/lib/ai';
import db from '@/lib/db';

// 从数据库获取激活的图像生成API配置（按优先级排序）
function getActiveImageAPIs() {
  const stmt = db.prepare(`
    SELECT * FROM image_processing_apis
    WHERE is_active = 1
    ORDER BY priority DESC, id ASC
  `);
  return stmt.all() as any[];
}

// 提取论文的关键视觉信息
async function extractVisualInfo(
  context: string,
  language: 'zh' | 'en' = 'zh'
): Promise<string> {
  const systemPrompt = `你是一个专业的学术论文分析专家。请阅读提供的论文内容，提取用于生成"学术概念海报"的关键视觉信息。

请确保描述具体、形象，适合画面呈现。`;

  const userPrompt = `请输出如下内容（只输出内容，不要废话），使用${language === 'zh' ? '中文' : '英文'}：
1. 研究问题：提到的核心问题
2. 创新方法：论文提出的主要方法或技术，要找到Aha！的那个点。
3. 工作流程：从输入到输出的处理流程
4. 关键结果：主要实验发现或性能提升
5. 应用价值：该研究的实际意义
---
论文内容如下：
${context.substring(0, 8000)}`;

  try {
    const result = await aiService.chat(userPrompt, systemPrompt);
    return result;
  } catch (error) {
    console.error('提取视觉信息失败:', error);
    return context.substring(0, 1000);
  }
}

// 生成学术概念海报的prompt
async function generateConceptPosterPrompt(
  summaryForImage: string,
  title: string,
  language: 'zh' | 'en'
): Promise<string> {
  const languageText = language === 'zh' ? '中文' : 'English';

  const prompt = `根据"${summaryForImage}"，生成一张学术论文概念图，清晰展示以下内容：

研究问题：提到的核心问题
创新方法：论文提出的主要方法或技术
工作流程：从输入到输出的处理流程
关键结果：主要实验发现或性能提升
应用价值：该研究的实际意义
论文标题：${title}

要求：
**设计要求 (Design Guidelines - STRICTLY FOLLOW):**
1.  **艺术风格 (Style):**
    *   Modern Minimalist Tech Infographic (现代极简科技信息图).
    *   Flat vector illustration with subtle isometric elements (带有微妙等距元素的扁平矢量插画).
    *   High-quality corporate Memphis design style (高质量企业级孟菲斯设计风格).
    *   Clean lines, geometric shapes (线条干净，几何形状).
2.  **构图 (Composition):**
    *   **Layout:** Central composition or Left-to-Right Process Flow (居中构图或从左到右的流程).
    *   **Background:** Clean, solid off-white or very light grey background (#F5F5F7). No clutter. (干净的米白或浅灰背景，无杂乱).
    *   **Structure:** Organize elements logically like a presentation slide or a academic poster.
3.  **配色方案 (Color Palette):**
    *   Primary: Deep Academic Blue (深学术蓝) & Slate Grey (板岩灰).
    *   Accent: Vibrant Orange or Teal for highlights (活力橙或青色用于高亮).
    *   High contrast, professional color grading (高对比度，专业调色).
4.  **文字渲染 (Text Rendering):**
    *   Use Times New Roman font for English.
    *   Use SimSun font for Chinese.
    *   Main text language: ${languageText} (User defined language).
    *   The title does not need to be reflected in the figure.
    *   The text, especially Chinese, needs to be clear and free of garbled characters.
5.  **负面提示 (Negative Prompt - Avoid these):**
    *   No photorealism (不要照片写实风格).
    *   No messy sketches (不要草图).
    *   No blurry text (不要模糊文字).
    *   No chaotic background (不要混乱背景).

**Generation Instructions:**
Generate an academic infographic poster with a width of 16:9.`;

  return prompt;
}

// 顶刊级别机制图模板定义
const MECHANISM_TEMPLATES: Record<string, any> = {
  signaling_pathway: {
    name: "信号转导通路",
    guidelines: `Nature Cell Biology standard signaling pathway illustration:
- Vertical layout: Extracellular (top) → Membrane → Cytoplasm → Nucleus (bottom)
- Ligand-receptor binding with molecular detail
- Transmembrane receptor with conformational change indicators
- Intracellular cascade: protein complexes, phosphorylation sites marked with 'P'
- Nuclear translocation with directional arrows
- Gene expression visualization
- Color scheme: Membrane (#E8F4F8 light cyan), Cytoplasm (#FFF9E6 cream), Nucleus (#F0E6FF light purple), Active proteins (#FF6B6B coral), Inactive (#95A5A6 gray)
- 2px line weight, 10% transparency for membranes, subtle shadows for depth
- Clear labels with leader lines, professional typography`
  },
  molecular_mechanism: {
    name: "分子作用机制",
    guidelines: `Cell journal standard molecular mechanism diagram:
- Central focus on molecular interaction site
- Detailed protein structures with domains labeled
- Binding sites highlighted with zoom-in insets
- Conformational changes shown with before/after states
- Key residues and binding pockets emphasized
- Color scheme: Protein A (#4A90E2 blue), Protein B (#E94B3C red), Binding site (#F5A623 amber), Cofactors (#7ED321 green)
- Dotted lines for hydrogen bonds, solid for covalent
- Distance measurements in Angstroms where relevant
- Semi-transparent surfaces showing electrostatic potential`
  },
  cellular_process: {
    name: "细胞过程示意图",
    guidelines: `Science journal standard cellular process illustration:
- Cross-section view of cell showing relevant organelles
- Sequential steps numbered 1-5 with circular badges
- Organelles: Nucleus, ER, Golgi, mitochondria, lysosomes with accurate morphology
- Vesicle trafficking with directional arrows
- Protein synthesis and modification stages clearly marked
- Color scheme: Nucleus (#C8A2C8 lavender), ER (#B4D7E8 sky blue), Golgi (#FFD700 gold), Mitochondria (#FF6B9D pink), Cytoplasm (#F0F0F0 light gray)
- Time progression indicated with clock icons or timeline
- Molecular cargo shown as colored spheres with labels`
  },
  disease_mechanism: {
    name: "疾病发病机制",
    guidelines: `Nature Medicine standard disease pathogenesis diagram:
- Split comparison: Normal (left) vs Disease (right) state
- Tissue/organ level view with cellular detail insets
- Pathological changes highlighted in red/orange
- Inflammatory markers and immune cells clearly shown
- Progression timeline from healthy → early stage → advanced disease
- Color scheme: Healthy tissue (#90EE90 light green), Diseased (#FF6B6B coral), Inflammation (#FFA500 orange), Immune cells (#4169E1 royal blue)
- Causal arrows showing disease progression
- Key biomarkers labeled with concentration changes (↑↓)
- Clinical symptoms correlated with molecular changes`
  },
  drug_mechanism: {
    name: "药物作用机制",
    guidelines: `Nature Reviews Drug Discovery standard:
- Drug molecule structure shown prominently
- Target protein/receptor with binding site detail
- Pharmacological cascade: Drug binding → Conformational change → Downstream effects
- On-target and off-target effects differentiated
- Therapeutic window and dose-response relationship
- Color scheme: Drug (#9B59B6 purple), Target (#3498DB blue), Therapeutic effect (#27AE60 green), Side effects (#E74C3C red)
- Molecular docking visualization with key interactions
- Cellular and systemic level effects connected with arrows`
  },
  metabolic_pathway: {
    name: "代谢通路图",
    guidelines: `Cell Metabolism standard pathway diagram:
- Circular or linear pathway layout depending on cycle vs linear pathway
- Metabolites shown as chemical structures or simplified icons
- Enzymes labeled with EC numbers and gene names
- Cofactors (ATP, NADH, etc.) clearly indicated
- Rate-limiting steps highlighted with thicker arrows
- Regulatory points marked with feedback loops
- Color scheme: Substrates (#E8F8F5), Products (#FADBD8), Enzymes (#D6EAF8), Cofactors (#FCF3CF)
- Energy changes (ΔG) noted for key reactions
- Compartmentalization (cytoplasm, mitochondria) shown with background shading`
  }
};

// 生成专业的科研插图prompt
async function generateIllustrationPrompt(
  diagramType: string,
  description: string
): Promise<string> {
  // 检查是否有预定义模板
  const template = MECHANISM_TEMPLATES[diagramType];

  const systemPrompt = `你是一个专业的科研插图描述生成专家。根据用户提供的机制描述，生成适合AI图像生成的详细prompt。

要求：
1. 使用专业的医学/生物学术语
2. 描述要具体、详细，包含颜色、布局、风格
3. 适合Nature、Cell、Science等顶级期刊的插图风格
4. 包含必要的标注和箭头说明
5. 使用英文描述，因为图像生成AI对英文理解更好

${template ? `\n特定模板指南 (${template.name}):\n${template.guidelines}\n` : ''}

示例风格：
"Scientific illustration showing gut-brain axis mechanism, professional medical diagram style,
featuring: intestinal epithelium with microbiota, vagus nerve pathway highlighted in green,
immune cells and cytokines in red, brain cross-section showing hippocampus,
arrows indicating signal flow, clean layout with labels, Nature journal quality,
high detail, professional color scheme with pastels, white background"`;

  const userPrompt = `机制类型：${diagramType}
描述：${description}

请生成一个详细的英文图像生成prompt：`;

  try {
    const prompt = await aiService.chat(userPrompt, systemPrompt);
    return prompt;
  } catch (error) {
    console.error('生成prompt失败:', error);
    // 返回基础prompt
    return `Scientific illustration of ${diagramType}: ${description}, professional medical diagram, Nature journal style, detailed, clean layout, white background`;
  }
}

// 尝试使用图像生成API生成插图
async function tryGenerateImage(prompt: string, apis: any[]): Promise<string | null> {
  for (const api of apis) {
    try {
      console.log(`尝试使用图像生成API: ${api.name} (${api.api_endpoint}), 模型: ${api.model_name}`);

      // 根据模型类型构建不同的请求体
      let requestBody: any;
      let endpoint = api.api_endpoint;

      if (api.model_name?.includes('gemini')) {
        // Gemini API (通过 gemini-business2api 代理)
        // 所有 Gemini 模型都使用 /v1/chat/completions 端点
        if (!endpoint.includes('/chat/completions')) {
          endpoint = endpoint.replace(/\/v1\/?$/, '/v1/chat/completions');
        }

        // 尝试多种方式触发图像生成
        // 方式1: 在prompt前添加明确的图像生成指令
        const imagePrompt = `请根据以下描述生成一张科研插图图片：

${prompt}

请直接生成图片，不要只是描述。`;

        requestBody = {
          model: api.model_name,
          messages: [
            {
              role: 'user',
              content: imagePrompt
            }
          ],
          stream: false
        };
      } else {
        // OpenAI DALL-E 格式
        if (!endpoint.includes('/images/generations')) {
          endpoint = endpoint.replace(/\/v1\/?$/, '/v1/images/generations');
        }
        requestBody = {
          model: api.model_name || 'dall-e-3',
          prompt: prompt,
          size: '1024x1024',
          quality: 'standard',
          n: 1,
        };
      }

      console.log(`请求端点: ${endpoint}`);
      console.log(`请求体:`, JSON.stringify(requestBody, null, 2));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.api_key}`,
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log(`响应状态: ${response.status}`);
      console.log(`响应内容:`, responseText.substring(0, 500));

      if (response.ok) {
        const data = JSON.parse(responseText);
        console.log(`✅ 成功使用 ${api.name}`);

        // 不同API返回格式可能不同，尝试多种可能的字段
        let imageUrl = null;

        if (api.model_name?.includes('gemini')) {
          // Gemini 返回格式: choices[0].message.content 可能包含图片URL、markdown图片链接或base64
          const content = data.choices?.[0]?.message?.content || '';

          console.log('完整响应内容长度:', content.length);
          console.log('内容前500字符:', content.substring(0, 500));

          // 方式1: 提取markdown格式的图片 ![](url)
          const markdownMatch = content.match(/!\[.*?\]\((https?:\/\/[^\)]+)\)/);
          if (markdownMatch) {
            imageUrl = markdownMatch[1];
            console.log('✅ 从markdown提取到URL:', imageUrl);
          }
          // 方式2: 提取Base64格式的图片 data:image/...
          else if (content.includes('data:image')) {
            const base64Match = content.match(/(data:image\/[^;]+;base64,[^\s\)\"]+)/);
            if (base64Match) {
              imageUrl = base64Match[1];
              console.log('✅ 提取到Base64图片，长度:', imageUrl.length);
            }
          }
          // 方式3: 直接是URL
          else if (content.trim().startsWith('http://') || content.trim().startsWith('https://')) {
            imageUrl = content.trim().split(/\s/)[0]; // 取第一个URL
            console.log('✅ 提取到直接URL:', imageUrl);
          }
          // 方式4: 尝试其他可能的字段
          else {
            imageUrl = data.data?.[0]?.url || data.url || data.image_url;
            if (imageUrl) {
              console.log('✅ 从其他字段提取到URL:', imageUrl);
            }
          }
        } else {
          // DALL-E 返回格式
          imageUrl = data.data?.[0]?.url ||
                     data.url ||
                     data.image_url ||
                     data.imageUrl;
        }

        if (imageUrl) {
          return imageUrl;
        } else {
          console.error(`❌ 无法从响应中提取图片URL:`, data);
        }
      } else {
        console.error(`❌ ${api.name} 请求失败: ${response.status} ${responseText}`);
      }
    } catch (error) {
      console.error(`❌ ${api.name} 失败:`, error);
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, diagramType, description, useArticleContent = false, language = 'zh' } = body;

    if (!projectId || !diagramType) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
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
          { success: false, error: '未找到文章内容，请先生成文章' },
          { status: 404 }
        );
      }

      finalDescription = draft.content.substring(0, 8000);
    }

    if (!finalDescription) {
      return NextResponse.json(
        { success: false, error: '缺少描述或文章内容' },
        { status: 400 }
      );
    }

    // 先提取视觉信息
    console.log('提取视觉信息...');
    const visualInfo = await extractVisualInfo(finalDescription, language);
    console.log('提取的视觉信息:', visualInfo.substring(0, 500));

    // 根据图表类型选择prompt生成方式
    let imagePrompt: string;
    console.log('生成图像prompt...');

    // 如果是学术概念海报类型，使用专门的海报prompt
    if (diagramType.includes('概念') || diagramType.includes('海报') || diagramType.includes('poster')) {
      // 获取项目标题
      const projectStmt = db.prepare('SELECT name FROM projects WHERE id = ?');
      const project = projectStmt.get(projectId) as any;
      const title = project?.name || '学术研究';

      imagePrompt = await generateConceptPosterPrompt(visualInfo, title, language);
    } else {
      // 使用科研插图prompt
      imagePrompt = await generateIllustrationPrompt(diagramType, visualInfo);
    }

    console.log('生成的prompt:', imagePrompt);

    // 获取配置的图像生成API
    const imageAPIs = getActiveImageAPIs();

    let imageUrl = '';

    if (imageAPIs.length > 0) {
      // 尝试使用配置的API生成图像
      const generatedUrl = await tryGenerateImage(imagePrompt, imageAPIs);
      if (generatedUrl) {
        imageUrl = generatedUrl;
      } else {
        return NextResponse.json(
          { success: false, error: '所有图像生成API都失败，请检查API配置' },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { success: false, error: '未配置图像生成API，请先在配置页面添加' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code: imagePrompt,
        type: diagramType,
        imageUrl: imageUrl,
        format: 'png',
      },
    });
  } catch (error) {
    console.error('生成科研插图失败:', error);
    return NextResponse.json(
      { success: false, error: '生成科研插图失败' },
      { status: 500 }
    );
  }
}
