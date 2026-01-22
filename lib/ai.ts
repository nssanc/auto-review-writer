import OpenAI from 'openai';
import db from './db';

export class AIService {
  private client: OpenAI | null = null;
  private currentModel: string = 'gpt-4';

  /**
   * 获取或创建 OpenAI 客户端（按优先级选择配置）
   */
  private getClient(): OpenAI {
    if (this.client) {
      return this.client;
    }

    let config: any = null;

    // 尝试从数据库获取配置（按优先级和激活状态）
    try {
      const stmt = db.prepare('SELECT * FROM ai_config WHERE is_active = 1 ORDER BY priority ASC, id ASC LIMIT 1');
      config = stmt.get();
    } catch (error) {
      // 构建时数据库可能不存在，忽略错误
      console.log('Database not available, using environment variables');
    }

    if (config) {
      // 规范化API端点：移除常见的后缀路径
      let normalizedEndpoint = config.api_endpoint;
      const suffixesToRemove = ['/chat/completions', '/completions', '/models'];
      for (const suffix of suffixesToRemove) {
        if (normalizedEndpoint.endsWith(suffix)) {
          normalizedEndpoint = normalizedEndpoint.slice(0, -suffix.length);
          break;
        }
      }

      this.client = new OpenAI({
        apiKey: config.api_key,
        baseURL: normalizedEndpoint,
      });
      this.currentModel = config.model_name || 'gpt-4';
    } else {
      // 使用环境变量作为后备
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || '',
        baseURL: process.env.OPENAI_API_ENDPOINT || 'https://api.openai.com/v1',
      });
      this.currentModel = process.env.OPENAI_MODEL || 'gpt-4';
    }

    return this.client;
  }

  /**
   * 重置客户端（配置更新后调用）
   */
  resetClient() {
    this.client = null;
  }

  /**
   * 获取可用模型列表
   */
  async listModels(apiEndpoint: string, apiKey: string): Promise<string[]> {
    try {
      // 规范化API端点：移除常见的后缀路径
      let normalizedEndpoint = apiEndpoint;
      const suffixesToRemove = ['/chat/completions', '/completions', '/models'];
      for (const suffix of suffixesToRemove) {
        if (normalizedEndpoint.endsWith(suffix)) {
          normalizedEndpoint = normalizedEndpoint.slice(0, -suffix.length);
          break;
        }
      }

      const tempClient = new OpenAI({
        apiKey: apiKey,
        baseURL: normalizedEndpoint,
      });

      const response = await tempClient.models.list();
      return response.data.map((model: any) => model.id).sort();
    } catch (error: any) {
      console.error('获取模型列表失败:', error);

      // 如果 API 不支持 /v1/models 端点或返回错误，返回常用模型列表
      if (error.status === 404 || error.status === 403 || error.message?.includes('404') || error.message?.includes('403')) {
        console.log('API 不支持 /v1/models 端点或访问被阻止，返回常用模型列表');
        return [
          'gpt-4',
          'gpt-4-turbo',
          'gpt-4o',
          'gpt-3.5-turbo',
          'deepseek-chat',
          'deepseek-coder',
          'moonshot-v1-8k',
          'moonshot-v1-32k',
          'moonshot-v1-128k',
          'gemini-pro',
          'gemini-1.5-pro',
          'gemini-2.0-flash-exp',
          'gemini-3-pro-preview',
          'claude-3-opus',
          'claude-3-sonnet',
          'claude-3-haiku',
        ];
      }

      // 对于其他错误，也返回常用模型列表而不是抛出错误
      console.log('无法获取模型列表，返回常用模型列表供选择');
      return [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4o',
        'gpt-3.5-turbo',
        'deepseek-chat',
        'deepseek-coder',
        'moonshot-v1-8k',
        'moonshot-v1-32k',
        'moonshot-v1-128k',
        'gemini-pro',
        'gemini-1.5-pro',
        'gemini-2.0-flash-exp',
        'gemini-3-pro-preview',
        'claude-3-opus',
        'claude-3-sonnet',
        'claude-3-haiku',
      ];
    }
  }

  /**
   * 测试 AI 功能（发送简单请求）
   */
  async testAIFunction(apiEndpoint: string, apiKey: string, modelName: string): Promise<string> {
    try {
      const tempClient = new OpenAI({
        apiKey: apiKey,
        baseURL: apiEndpoint,
      });

      const response = await tempClient.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'user', content: '请用一句话介绍你自己。' }
        ],
        temperature: 0.7,
        max_tokens: 100,
      });

      return response.choices[0].message.content || '测试成功';
    } catch (error: any) {
      console.error('测试 AI 功能失败:', error);
      throw new Error(`AI 功能测试失败: ${error.message}`);
    }
  }

  /**
   * 通用聊天方法
   */
  async chat(prompt: string, systemPrompt?: string): Promise<string> {
    const client = this.getClient();
    const messages: any[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages,
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 分析文献写作风格
   */
  async analyzeStyle(text: string): Promise<string> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages: [
        {
          role: 'system',
          content: '你是一个学术写作风格分析专家。请分析给定文献的写作特征，包括文章结构、语言风格、引用格式、论证逻辑等方面。'
        },
        {
          role: 'user',
          content: `请分析以下学术文献的写作风格：\n\n${text.substring(0, 8000)}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 生成写作指南
   */
  async generateWritingGuide(styleAnalysis: string): Promise<string> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages: [
        {
          role: 'system',
          content: '你是一个学术写作指导专家。基于风格分析结果，生成详细的写作指南（Markdown格式）。'
        },
        {
          role: 'user',
          content: `基于以下风格分析，生成一份详细的写作指南：\n\n${styleAnalysis}`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 生成综述撰写计划
   */
  async generateReviewPlan(writingGuide: string, topic: string): Promise<string> {
    const client = this.getClient();
    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages: [
        {
          role: 'system',
          content: '你是一个学术综述规划专家。生成详细的综述撰写计划（Markdown格式），包括章节大纲、关键词、预期字数等。'
        },
        {
          role: 'user',
          content: `主题：${topic}\n\n写作指南：\n${writingGuide}\n\n请生成详细的综述撰写计划。`
        }
      ],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }

  /**
   * 流式生成综述内容
   */
  async *streamWriteReview(
    plan: string,
    guide: string,
    references: string,
    language: 'zh' | 'en',
    options?: {
      wordCount?: number;      // 目标字数
      detailLevel?: 'basic' | 'detailed' | 'comprehensive';  // 详细程度
      citationDensity?: 'low' | 'medium' | 'high';  // 引用密度
    }
  ): AsyncGenerator<string> {
    const client = this.getClient();
    const languagePrompt = language === 'zh' ? '中文' : '英文';

    // 设置默认参数
    const wordCount = options?.wordCount || (language === 'zh' ? 10000 : 8000);
    const detailLevel = options?.detailLevel || 'detailed';
    const citationDensity = options?.citationDensity || 'high';

    // 根据详细程度设置段落要求
    const paragraphRequirements = {
      basic: { intro: '2-3段', main: '3-5段', discussion: '2-3段', conclusion: '2段' },
      detailed: { intro: '3-4段', main: '5-8段', discussion: '4-5段', conclusion: '3-4段' },
      comprehensive: { intro: '4-5段', main: '8-12段', discussion: '5-7段', conclusion: '4-5段' }
    }[detailLevel];

    // 根据引用密度设置引用要求
    const citationRequirements = {
      low: '适当引用关键研究',
      medium: '频繁引用相关研究，每个主要观点都有文献支撑',
      high: '大量引用文献，详细对比不同研究，每段至少2-3处引用'
    }[citationDensity];

    const detailedSystemPrompt = language === 'zh'
      ? `你是一个专业的学术综述撰写专家。请严格按照提供的写作指南和撰写计划，用中文撰写高质量、深入详细的文献综述。

**撰写要求：**

1. **内容深度与详细程度**：
   - 每个章节都要充分展开，提供深入的分析和讨论
   - 对每个关键概念、方法、发现都要进行详细阐述
   - 不要只是简单罗列，要深入分析其意义、影响和局限性
   - 每个主要观点都要有充分的论证和支撑

2. **文献引用与整合**：
   - ${citationRequirements}
   - 对比不同研究的方法、结果和结论
   - 分析研究之间的关联、差异和发展脉络
   - **引用格式：使用数字编号 [1], [2], [3] 等，对应参考文献列表中的编号**
   - 例如："研究表明该方法有效[1,2]" 或 "根据最新研究[3]..."
   - 确保引用的编号与提供的参考文献列表一致

3. **批判性分析**：
   - 不仅要描述研究内容，更要进行批判性评价
   - 指出现有研究的优势和不足
   - 讨论方法学的适用性和局限性
   - 识别研究领域的空白和未来方向

4. **结构完整性**：
   - 引言：详细介绍研究背景、重要性、综述范围和目的（${paragraphRequirements.intro}）
   - 主体章节：按照撰写计划的结构，每个章节都要充分展开（每个主要章节${paragraphRequirements.main}）
   - 讨论：综合分析现有研究的整体状况、主要发现、争议点（${paragraphRequirements.discussion}）
   - 结论：总结关键发现、指出研究空白、提出未来研究方向（${paragraphRequirements.conclusion}）

5. **学术规范**：
   - 使用正式的学术语言和专业术语
   - 保持客观、严谨的学术写作风格
   - 逻辑清晰，论证充分
   - 段落之间要有良好的过渡和连贯性

6. **篇幅要求**：
   - 综述总字数应达到约${wordCount}字
   - 根据章节数量合理分配字数
   - 确保内容充实，避免空洞和重复`
      : `You are a professional academic review writing expert. Please write a high-quality, in-depth and detailed literature review in English, strictly following the provided writing guide and outline.

**Writing Requirements:**

1. **Content Depth and Detail**:
   - Fully develop each section with in-depth analysis and discussion
   - Provide detailed elaboration on each key concept, method, and finding
   - Go beyond simple listing - analyze significance, impact, and limitations
   - Support each major point with sufficient evidence and argumentation

2. **Literature Citation and Integration**:
   - ${citationRequirements}
   - Compare methods, results, and conclusions across different studies
   - Analyze connections, differences, and developmental trajectories between studies
   - **Citation format: Use numbered citations [1], [2], [3] etc., corresponding to the reference list**
   - Example: "Studies have shown this method is effective[1,2]" or "According to recent research[3]..."
   - Ensure citation numbers match the provided reference list

3. **Critical Analysis**:
   - Not just describe research content, but provide critical evaluation
   - Point out strengths and weaknesses of existing research
   - Discuss applicability and limitations of methodologies
   - Identify research gaps and future directions

4. **Structural Completeness**:
   - Introduction: Detailed background, significance, scope, and objectives (${paragraphRequirements.intro})
   - Main sections: Follow the outline structure, fully develop each section (${paragraphRequirements.main} per major section)
   - Discussion: Comprehensive analysis of overall research status, key findings, controversies (${paragraphRequirements.discussion})
   - Conclusion: Summarize key findings, identify research gaps, propose future directions (${paragraphRequirements.conclusion})

5. **Academic Standards**:
   - Use formal academic language and professional terminology
   - Maintain objective and rigorous academic writing style
   - Clear logic with sufficient argumentation
   - Good transitions and coherence between paragraphs

6. **Length Requirements**:
   - Total review should be approximately ${wordCount} words
   - Distribute word count reasonably across sections
   - Ensure substantial content, avoid emptiness and repetition`;

    const detailedUserPrompt = `写作指南：
${guide}

撰写计划：
${plan}

参考文献：
${references}

请按照上述要求，开始撰写详细、深入的文献综述。记住：
- 每个章节都要充分展开，提供深入分析
- 频繁引用参考文献，进行对比和批判性分析
- 确保内容充实，达到要求的篇幅和深度
- 使用学术化的语言，保持专业性和严谨性

现在开始撰写：`;

    const stream = await client.chat.completions.create({
      model: this.currentModel,
      messages: [
        {
          role: 'system',
          content: detailedSystemPrompt
        },
        {
          role: 'user',
          content: detailedUserPrompt
        }
      ],
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  /**
   * 按章节流式生成综述内容
   */
  async *streamWriteReviewBySection(
    section: string,
    sectionTitle: string,
    plan: string,
    guide: string,
    references: string,
    previousContent: string,
    language: 'zh' | 'en',
    options?: {
      wordCount?: number;
      detailLevel?: 'basic' | 'detailed' | 'comprehensive';
      citationDensity?: 'low' | 'medium' | 'high';
    }
  ): AsyncGenerator<string> {
    const client = this.getClient();

    // 设置默认参数
    const sectionWordCount = options?.wordCount || (language === 'zh' ? 2000 : 1500);
    const detailLevel = options?.detailLevel || 'detailed';
    const citationDensity = options?.citationDensity || 'high';

    // 根据详细程度设置段落要求
    const paragraphRequirements = {
      basic: '3-5段',
      detailed: '5-8段',
      comprehensive: '8-12段'
    }[detailLevel];

    // 根据引用密度设置引用要求
    const citationRequirements = {
      low: '适当引用关键研究',
      medium: '频繁引用相关研究，每个主要观点都有文献支撑',
      high: '大量引用文献，详细对比不同研究，每段至少2-3处引用'
    }[citationDensity];

    const systemPrompt = language === 'zh'
      ? `你是一个专业的学术综述撰写专家。现在需要撰写综述的"${sectionTitle}"章节。

**章节撰写要求：**

1. **内容深度**：
   - 本章节要充分展开，提供深入的分析和讨论
   - 详细阐述该章节涉及的关键概念、方法和发现
   - 深入分析其意义、影响和局限性

2. **文献引用**：
   - ${citationRequirements}
   - 对比不同研究的方法、结果和结论
   - 引用格式：[作者, 年份]

3. **批判性分析**：
   - 进行批判性评价，指出优势和不足
   - 讨论方法学的适用性和局限性

4. **结构要求**：
   - 本章节应包含${paragraphRequirements}
   - 段落之间要有良好的过渡和连贯性
   - 与前面章节保持逻辑连贯

5. **篇幅要求**：
   - 本章节目标字数约${sectionWordCount}字
   - 确保内容充实，避免空洞和重复`
      : `You are a professional academic review writing expert. Now you need to write the "${sectionTitle}" section of the review.

**Section Writing Requirements:**

1. **Content Depth**:
   - Fully develop this section with in-depth analysis and discussion
   - Provide detailed elaboration on key concepts, methods, and findings
   - Analyze significance, impact, and limitations in depth

2. **Literature Citation**:
   - ${citationRequirements}
   - Compare methods, results, and conclusions across studies
   - Citation format: [Author, Year]

3. **Critical Analysis**:
   - Provide critical evaluation, pointing out strengths and weaknesses
   - Discuss applicability and limitations of methodologies

4. **Structure Requirements**:
   - This section should contain ${paragraphRequirements}
   - Good transitions and coherence between paragraphs
   - Maintain logical coherence with previous sections

5. **Length Requirements**:
   - Target word count for this section: approximately ${sectionWordCount} words
   - Ensure substantial content, avoid emptiness and repetition`;

    const userPrompt = `写作指南：
${guide}

完整撰写计划：
${plan}

当前章节：${sectionTitle}
章节内容要求：
${section}

${previousContent ? `前面已完成的内容：\n${previousContent.substring(0, 1000)}...\n\n` : ''}

参考文献：
${references}

请撰写"${sectionTitle}"章节的详细内容。注意：
- 只撰写本章节内容，不要重复前面的内容
- 确保与前面章节逻辑连贯
- 达到要求的字数和深度
- 充分引用参考文献

现在开始撰写本章节：`;

    const stream = await client.chat.completions.create({
      model: this.currentModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ],
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  }

  /**
   * AI智能筛选文献
   */
  async filterLiterature(
    papers: any[],
    projectKeywords: string[],
    researchTopic: string,
    maxResults: number = 20,
    customCriteria?: string
  ): Promise<any[]> {
    const client = this.getClient();

    // 如果文献数量过多，分批处理
    const BATCH_SIZE = 50; // 每批最多处理50篇文献
    if (papers.length > BATCH_SIZE) {
      const batches = [];
      for (let i = 0; i < papers.length; i += BATCH_SIZE) {
        batches.push(papers.slice(i, i + BATCH_SIZE));
      }

      // 对每批文献进行筛选
      const allSelected: any[] = [];
      for (const batch of batches) {
        const selected = await this.filterLiteratureBatch(
          batch,
          projectKeywords,
          researchTopic,
          Math.ceil(maxResults * (batch.length / papers.length)),
          customCriteria
        );
        allSelected.push(...selected);
      }

      // 如果总数超过maxResults，再进行一次筛选
      if (allSelected.length > maxResults) {
        return this.filterLiteratureBatch(
          allSelected,
          projectKeywords,
          researchTopic,
          maxResults,
          customCriteria
        );
      }

      return allSelected;
    }

    return this.filterLiteratureBatch(
      papers,
      projectKeywords,
      researchTopic,
      maxResults,
      customCriteria
    );
  }

  /**
   * 筛选单批文献（内部方法）
   */
  private async filterLiteratureBatch(
    papers: any[],
    projectKeywords: string[],
    researchTopic: string,
    maxResults: number,
    customCriteria?: string
  ): Promise<any[]> {
    const client = this.getClient();

    // 构建文献列表摘要（限制摘要长度）
    const papersInfo = papers.map((p, i) =>
      `${i + 1}. 标题: ${p.title}\n摘要: ${p.abstract?.substring(0, 200) || '无摘要'}...`
    ).join('\n\n');

    const prompt = `你是一个专业的文献筛选专家。请根据研究主题和关键词，从以下${papers.length}篇文献中筛选出最相关的文献。

研究主题: ${researchTopic}
关键词: ${projectKeywords.join(', ')}
${customCriteria ? `\n额外筛选条件: ${customCriteria}\n` : ''}

文献列表:
${papersInfo}

请按照以下标准进行筛选：
1. 相关度：与研究主题和关键词的匹配程度
2. 研究质量：研究方法的严谨性和创新性
3. 引用价值：对综述写作的参考价值
4. 时效性：优先考虑较新的研究
${customCriteria ? '5. 自定义条件：满足用户指定的额外筛选条件' : ''}

${maxResults < papers.length ? `请筛选出最相关的${maxResults}篇文献。` : '请筛选出所有符合条件的文献。'}

请返回筛选后的文献编号列表（用逗号分隔），例如：1,3,5,7,9
只返回编号，不要其他内容。`;

    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      timeout: 120000, // 120秒超时
    });

    // 清理响应内容
    let content = response.choices[0].message.content || '';

    // 移除 <think> 标签及其内容
    content = content.replace(/<think>[\s\S]*?<\/think>/g, '');

    // 移除其他可能的XML标签
    content = content.replace(/<[^>]+>/g, '');

    // 提取数字列表
    const selectedIndices = content
      .split(',')
      .map(s => parseInt(s.trim()) - 1)
      .filter(i => !isNaN(i) && i >= 0 && i < papers.length) || [];

    return selectedIndices.map(i => papers[i]);
  }

  /**
   * 生成Mermaid图表代码
   */
  async generateDiagram(
    diagramType: 'mechanism' | 'flowchart' | 'mindmap',
    description: string
  ): Promise<string> {
    const client = this.getClient();

    const diagramPrompts = {
      mechanism: `你是一个专业的生物医学机制图绘制专家。请根据用户提供的内容，生成专业的Mermaid格式机制图代码。

**任务说明：**
仔细分析用户提供的内容，提取关键的机制信息：
- 核心分子/蛋白质/受体/细胞器
- 信号通路的完整流程
- 分子间的相互作用关系
- 上游刺激和下游效应
- 正向调控和负向调控
- 细胞内外的空间定位

**机制图设计原则：**
1. **层次化结构**：从上游到下游，从细胞外到细胞内
2. **空间定位**：使用subgraph表示细胞膜、细胞质、细胞核等区域
3. **清晰的因果链**：展示完整的信号传导路径
4. **关键节点突出**：核心分子和关键步骤要明确标注
5. **专业术语**：使用标准的生物医学术语

**Mermaid代码要求：**
1. 使用 graph LR（从左到右）展示信号流，适合展示时间顺序
2. 使用 graph TD（从上到下）展示层级关系，适合展示调控网络
3. 节点命名：使用简洁的中英文，如"TNF-α"、"NF-κB通路"
4. **重要：节点文本保持单行，不使用\\n换行符和特殊符号**
5. 箭头类型：
   - --> 激活/促进/诱导
   - -.-> 抑制/阻断/负调控
   - ==> 直接作用/强相互作用
   - -..- 间接作用/弱相互作用
6. 使用subgraph分组：
   - 细胞外空间
   - 细胞膜
   - 细胞质
   - 细胞核
   - 特定信号通路
7. 节点样式建议：
   - 受体用圆角矩形 [受体名称]
   - 蛋白质用矩形 [蛋白质名称]
   - 基因用圆形 ((基因名称))
   - 效应用六边形 {{效应描述}}
8. 节点数量：15-25个节点，完整展示机制

**专业机制图示例：**
graph LR
    subgraph 细胞外
        A[炎症刺激] --> B[TNF-α]
        B --> C[TNFR1受体]
    end

    subgraph 细胞质
        C --> D[IKK复合物]
        D --> E[IκB降解]
        E --> F[NF-κB释放]
        F --> G[NF-κB入核]
    end

    subgraph 细胞核
        G --> H((炎症基因))
        H --> I[IL-6]
        H --> J[IL-1β]
        H --> K[COX-2]
    end

    subgraph 效应
        I --> L{{炎症反应}}
        J --> L
        K --> L
    end

    M[抗炎药物] -.-> D
    N[天然抑制剂] -.-> F

只返回Mermaid代码，不要添加任何解释文字。`,

      flowchart: `你是一个专业的流程图绘制专家。请根据用户描述，生成Mermaid格式的流程图代码。

流程图通常用于展示：
- 实验步骤
- 研究流程
- 数据处理流程
- 决策过程

请使用Mermaid的flowchart TD或flowchart LR语法，包含：
- 开始和结束节点
- 决策节点（菱形）
- 处理节点（矩形）
- 清晰的流程方向

只返回Mermaid代码，不要其他解释。`,

      mindmap: `你是一个专业的思维导图绘制专家。请根据用户描述，生成Mermaid格式的思维导图代码。

思维导图通常用于展示：
- 概念层次结构
- 知识体系
- 研究主题分类
- 文献综述框架

请使用Mermaid的mindmap语法，包含：
- 中心主题
- 主要分支
- 次级分支
- 清晰的层次结构

只返回Mermaid代码，不要其他解释。`
    };

    const prompt = `${diagramPrompts[diagramType]}

用户描述：
${description}

请生成Mermaid代码：`;

    const response = await client.chat.completions.create({
      model: this.currentModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content || '';
  }
}

const aiServiceInstance = new AIService();

export const aiService = aiServiceInstance;
export default aiServiceInstance;
