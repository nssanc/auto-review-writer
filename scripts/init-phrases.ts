import { db } from '../lib/db';

// 初始化学术用语库
export function initWritingPhrases() {
  // 检查是否已有数据
  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM writing_phrases');
  const result = checkStmt.get() as { count: number };

  if (result.count > 0) {
    console.log('学术用语库已存在，跳过初始化');
    return;
  }

  const phrases = [
    // 引言部分
    {
      category: '引言-背景介绍',
      phrase: 'In recent years, there has been growing interest in...',
      usage: '介绍研究背景和趋势',
      example: 'In recent years, there has been growing interest in artificial intelligence applications in medical imaging.',
    },
    {
      category: '引言-研究问题',
      phrase: 'However, little is known about...',
      usage: '指出研究空白',
      example: 'However, little is known about the long-term effects of these interventions.',
    },
    {
      category: '引言-研究目的',
      phrase: 'The aim of this review is to...',
      usage: '说明综述目的',
      example: 'The aim of this review is to synthesize current evidence on deep learning methods.',
    },
    {
      category: '方法-文献检索',
      phrase: 'A comprehensive literature search was conducted...',
      usage: '描述文献检索过程',
      example: 'A comprehensive literature search was conducted in PubMed and arXiv databases.',
    },
    {
      category: '结果-主要发现',
      phrase: 'The findings suggest that...',
      usage: '总结主要发现',
      example: 'The findings suggest that deep learning models outperform traditional methods.',
    },
    {
      category: '讨论-未来方向',
      phrase: 'Future research should focus on...',
      usage: '提出未来研究方向',
      example: 'Future research should focus on improving model interpretability.',
    },
  ];

  // 插入学术用语
  const insertStmt = db.prepare(`
    INSERT INTO writing_phrases (category, phrase, usage, example)
    VALUES (?, ?, ?, ?)
  `);

  for (const phrase of phrases) {
    insertStmt.run(phrase.category, phrase.phrase, phrase.usage, phrase.example);
  }

  console.log(`成功初始化 ${phrases.length} 条学术用语`);
}
