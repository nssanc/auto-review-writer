# Literature Review AI - 科研写作工具整合计划

## 文档信息
- **创建时间**: 2026-01-22
- **版本**: 2.0
- **Git初始提交**: 2d85536
- **目的**: 整合科研写作类skills工具，增强现有功能，美化界面

## 一、现有功能分析

### 1.1 核心功能模块
- ✅ 项目管理（创建、编辑、删除项目）
- ✅ 参考文献上传与解析（PDF/DOCX）
- ✅ 风格分析与写作指南生成
- ✅ 文献搜索（PubMed、arXiv）
- ✅ 关键词管理与AI推荐
- ✅ AI智能筛选文献
- ✅ 综述撰写计划生成
- ✅ 流式综述内容生成
- ✅ 文献导出（RIS、BibTeX、CSV）
- ✅ WebDAV云存储同步

### 1.2 技术栈
- **前端**: Next.js 16.1.2 + React + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **AI服务**: OpenAI SDK (支持多种兼容API)
- **云存储**: WebDAV
- **文档解析**: pdf-parse, mammoth

### 1.3 数据库结构
- projects（项目表）
- reference_papers（参考文献表）
- style_analysis（风格分析表）
- review_plans（撰写计划表）
- review_drafts（综述草稿表）
- searched_literature（搜索文献表）
- project_keywords（项目关键词表）
- ai_config（AI配置表）
- diagram_apis（图表API表）
- image_processing_apis（图像API表）
- webdav_config（WebDAV配置表）
- webdav_sync_log（同步日志表）
- webdav_file_cache（文件缓存表）


## 二、科研写作Skills工具分析

### 2.1 可用的科研写作工具
位置: `/Users/fc/.claude/skills/claude-scientific-skills/scientific-skills/`

1. **literature-review** - 系统性文献综述
   - 多数据库搜索（PubMed, arXiv, bioRxiv, Semantic Scholar）
   - 主题综合与引用验证
   - 专业格式化输出（Markdown, PDF）
   - 多种引用格式（APA, Nature, Vancouver）

2. **scientific-writing** - 科研写作辅助
   - 学术写作风格优化
   - 语法和清晰度检查
   - 专业术语建议

3. **citation-management** - 引用管理
   - 引用格式转换
   - 参考文献整理
   - 引用验证

4. **peer-review** - 同行评审
   - 评审意见生成
   - 稿件质量评估

5. **latex-posters** - LaTeX海报制作
   - 学术海报设计
   - LaTeX模板生成

6. **scientific-slides** - 科研演示文稿
   - 学术演讲幻灯片
   - 可视化设计

7. **pptx-posters** - PowerPoint海报
   - PPTX格式海报制作

### 2.2 其他可用工具
- **planning-with-files** - 文件规划工具
- **frontend-design** - 前端设计工具


## 三、整合策略设计

### 3.1 整合原则
1. **完全保留现有功能** - 不删除任何已有功能
2. **增强而非替换** - 在现有基础上添加新功能
3. **模块化设计** - 新功能作为独立模块集成
4. **向后兼容** - 确保现有数据和API不受影响
5. **渐进式增强** - 分阶段实施，每阶段可独立测试

### 3.2 整合优先级

#### 阶段1：核心功能增强（高优先级）
- [ ] 整合 literature-review 的多数据库搜索能力
- [ ] 整合 citation-management 的引用格式转换
- [ ] 整合 scientific-writing 的写作优化建议

#### 阶段2：辅助功能添加（中优先级）
- [ ] 添加 peer-review 的评审功能
- [ ] 添加学术图表生成功能
- [ ] 添加写作模板库

#### 阶段3：界面美化（中优先级）
- [ ] 使用 frontend-design 重新设计主界面
- [ ] 优化用户体验和交互流程
- [ ] 添加数据可视化组件

#### 阶段4：高级功能（低优先级）
- [ ] 整合 latex-posters 海报制作
- [ ] 整合 scientific-slides 演示文稿
- [ ] 添加协作功能


## 四、详细实施计划

### 4.1 数据库扩展

#### 新增表结构

**1. literature_sources（文献来源表）**
```sql
CREATE TABLE literature_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  api_endpoint TEXT,
  enabled INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**2. citations（引用管理表）**
```sql
CREATE TABLE citations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  literature_id INTEGER,
  citation_key TEXT,
  citation_format TEXT,
  citation_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (literature_id) REFERENCES searched_literature(id)
);
```


**3. writing_suggestions（写作建议表）**
```sql
CREATE TABLE writing_suggestions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  draft_id INTEGER,
  suggestion_type TEXT NOT NULL,
  original_text TEXT,
  suggested_text TEXT,
  reason TEXT,
  applied INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (draft_id) REFERENCES review_drafts(id)
);
```

**4. peer_reviews（同行评审表）**
```sql
CREATE TABLE peer_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL,
  draft_id INTEGER,
  review_type TEXT,
  review_content TEXT,
  rating INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (draft_id) REFERENCES review_drafts(id)
);
```


### 4.2 API端点设计

#### 新增API路由

**1. 多数据库搜索**
- `POST /api/search/semantic-scholar` - Semantic Scholar搜索
- `POST /api/search/biorxiv` - bioRxiv搜索
- `POST /api/search/multi` - 多数据库联合搜索

**2. 引用管理**
- `GET /api/citations/:projectId` - 获取项目引用
- `POST /api/citations/format` - 格式化引用
- `POST /api/citations/convert` - 转换引用格式

**3. 写作优化**
- `POST /api/writing/analyze` - 分析写作质量
- `POST /api/writing/suggest` - 生成改进建议
- `POST /api/writing/apply` - 应用建议

**4. 同行评审**
- `POST /api/peer-review/generate` - 生成评审意见
- `GET /api/peer-review/:projectId` - 获取评审历史


### 4.3 前端界面设计

#### 新增页面
1. **多数据库搜索页面** - `/projects/[id]/search-advanced`
2. **引用管理页面** - `/projects/[id]/citations`
3. **写作优化页面** - `/projects/[id]/writing-assist`
4. **同行评审页面** - `/projects/[id]/peer-review`

#### 界面美化方案
使用 frontend-design skill 重新设计：
- 主页面布局优化
- 配色方案升级
- 交互动画增强
- 响应式设计改进


## 五、版本控制与回滚策略

### 5.1 Git分支策略
- `main` - 稳定版本（当前初始状态）
- `feature/scientific-writing` - 科研写作功能分支
- `feature/citation-management` - 引用管理功能分支
- `feature/ui-redesign` - 界面美化分支
- `develop` - 开发集成分支

### 5.2 关键提交点
1. ✅ `2d85536` - 初始状态（2026-01-22）
2. [ ] 数据库扩展完成
3. [ ] 多数据库搜索集成完成
4. [ ] 引用管理功能完成
5. [ ] 写作优化功能完成
6. [ ] 界面美化完成
7. [ ] 全功能测试通过

### 5.3 回滚方案
```bash
# 回滚到初始状态
git reset --hard 2d85536

# 回滚到特定功能点
git reset --hard <commit-hash>

# 创建备份分支
git branch backup-$(date +%Y%m%d-%H%M%S)
```


## 六、测试计划

### 6.1 功能测试清单
- [ ] 现有功能回归测试
  - [ ] 项目创建/编辑/删除
  - [ ] 文献上传与解析
  - [ ] 文献搜索（PubMed/arXiv）
  - [ ] 关键词管理
  - [ ] AI筛选
  - [ ] 综述生成
  - [ ] 文献导出

- [ ] 新功能测试
  - [ ] 多数据库搜索
  - [ ] 引用格式转换
  - [ ] 写作优化建议
  - [ ] 同行评审生成

### 6.2 性能测试
- [ ] 大量文献处理（100+篇）
- [ ] 并发请求测试
- [ ] 数据库查询优化验证

### 6.3 兼容性测试
- [ ] 浏览器兼容性（Chrome, Firefox, Safari）
- [ ] 响应式设计测试（桌面/平板/手机）
- [ ] 数据迁移测试


## 七、实施时间线

### 第1周：准备与设计
- ✅ Day 1: 分析现有功能和skills工具
- ✅ Day 1: 创建Git仓库和初始提交
- ✅ Day 1: 编写整合计划文档
- [ ] Day 2: 设计数据库扩展方案
- [ ] Day 2: 设计API接口规范

### 第2周：核心功能整合
- [ ] Day 3-4: 扩展数据库结构
- [ ] Day 5-6: 实现多数据库搜索
- [ ] Day 7: 实现引用管理功能

### 第3周：辅助功能与优化
- [ ] Day 8-9: 实现写作优化功能
- [ ] Day 10: 实现同行评审功能
- [ ] Day 11: 功能测试与bug修复

### 第4周：界面美化与测试
- [ ] Day 12-13: 使用frontend-design美化界面
- [ ] Day 14: 全面测试
- [ ] Day 15: 文档编写与部署准备


## 八、风险管理

### 8.1 潜在风险
1. **数据兼容性风险** - 新旧数据结构冲突
   - 缓解措施：数据库迁移脚本 + 备份恢复机制

2. **功能冲突风险** - 新旧功能逻辑冲突
   - 缓解措施：模块化设计 + 独立命名空间

3. **性能下降风险** - 新功能影响系统性能
   - 缓解措施：性能测试 + 异步处理 + 缓存优化

4. **用户体验风险** - 界面改动影响用户习惯
   - 缓解措施：保留经典模式 + 渐进式引导

### 8.2 应急预案
- 每个功能模块独立开关
- 快速回滚机制（Git + 数据库备份）
- 详细的错误日志记录
- 用户反馈收集机制


## 九、成功标准

### 9.1 功能完整性
- ✅ 所有现有功能正常运行
- [ ] 新增多数据库搜索功能可用
- [ ] 引用管理功能完整
- [ ] 写作优化建议准确
- [ ] 界面美观且易用

### 9.2 性能指标
- [ ] 页面加载时间 < 2秒
- [ ] API响应时间 < 1秒
- [ ] 支持100+篇文献处理
- [ ] 数据库查询优化完成

### 9.3 质量标准
- [ ] 代码测试覆盖率 > 80%
- [ ] 无严重bug
- [ ] 文档完整清晰
- [ ] 用户反馈积极

## 十、后续维护

### 10.1 文档维护
- 保持INTEGRATION_PLAN_V2.md更新
- 记录所有重要变更
- 维护API文档
- 更新用户手册

### 10.2 代码维护
- 定期代码审查
- 性能优化
- 安全更新
- 依赖包更新

---

**文档结束**

