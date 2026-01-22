import { db } from '../lib/db';

// 初始化默认模板
export function initDefaultTemplates() {
  const templates = [
    {
      name: '经典综述结构',
      description: '适用于传统文献综述，按主题组织内容',
      structure: `# 1. 引言
## 1.1 研究背景
## 1.2 研究问题
## 1.3 综述范围和目标

# 2. 方法
## 2.1 文献检索策略
## 2.2 纳入和排除标准
## 2.3 文献筛选流程

# 3. 主体内容
## 3.1 [主题一]
## 3.2 [主题二]
## 3.3 [主题三]

# 4. 讨论
## 4.1 主要发现
## 4.2 研究趋势
## 4.3 挑战与局限
## 4.4 未来研究方向

# 5. 结论`,
      is_default: 1,
    },
    {
      name: '系统综述结构',
      description: '适用于系统性文献综述，强调方法学严谨性',
      structure: `# 摘要
- 背景
- 目的
- 方法
- 结果
- 结论

# 1. 引言
## 1.1 研究背景
## 1.2 研究目的和问题

# 2. 方法学
## 2.1 检索策略
## 2.2 纳入排除标准
## 2.3 质量评估
## 2.4 数据提取

# 3. 结果
## 3.1 文献筛选结果
## 3.2 文献质量评估
## 3.3 综合分析

# 4. 讨论
## 4.1 主要发现
## 4.2 证据质量
## 4.3 局限性

# 5. 结论
## 5.1 研究意义
## 5.2 实践建议`,
      is_default: 1,
    },
    {
      name: '叙事综述结构',
      description: '适用于探索性综述，按时间或主题叙述',
      structure: `# 1. 引言
## 1.1 研究背景和意义
## 1.2 综述目的

# 2. 历史发展
## 2.1 早期研究（时间段）
## 2.2 发展阶段（时间段）
## 2.3 近期进展（时间段）

# 3. 当前研究现状
## 3.1 主流方法和技术
## 3.2 典型应用
## 3.3 研究热点

# 4. 关键问题与挑战
## 4.1 技术挑战
## 4.2 应用挑战
## 4.3 理论挑战

# 5. 未来展望
## 5.1 发展趋势
## 5.2 潜在方向
## 5.3 研究机会

# 6. 结论`,
      is_default: 1,
    },
    {
      name: '医学影像AI综述结构',
      description: '专门用于医学影像AI领域的综述',
      structure: `# 1. 引言
## 1.1 医学影像AI背景
## 1.2 研究动机和目标
## 1.3 综述范围

# 2. 方法
## 2.1 文献检索策略
## 2.2 纳入排除标准

# 3. 深度学习方法
## 3.1 卷积神经网络（CNN）
## 3.2 Transformer架构
## 3.3 生成对抗网络（GAN）
## 3.4 其他方法

# 4. 应用领域
## 4.1 图像分割
## 4.2 病灶检测
## 4.3 疾病分类
## 4.4 图像重建

# 5. 数据集和评估
## 5.1 公开数据集
## 5.2 评估指标
## 5.3 性能对比

# 6. 挑战与未来方向
## 6.1 数据质量和标注
## 6.2 模型可解释性
## 6.3 临床转化
## 6.4 未来研究方向

# 7. 结论`,
      is_default: 0,
    },
  ];

  // 检查是否已有模板
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM review_templates');
  const result = checkStmt.get() as { count: number };

  if (result.count > 0) {
    console.log('模板已存在，跳过初始化');
    return;
  }

  // 插入默认模板
  const insertStmt = db.prepare(`
    INSERT INTO review_templates (name, description, structure, is_default)
    VALUES (?, ?, ?, ?)
  `);

  for (const template of templates) {
    insertStmt.run(
      template.name,
      template.description,
      template.structure,
      template.is_default
    );
  }

  console.log(`成功初始化 ${templates.length} 个默认模板`);
}
