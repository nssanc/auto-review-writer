# AI辅助文献综述写作系统

一个基于Next.js和AI的智能文献综述写作系统，帮助研究人员快速完成高质量的文献综述。

## 功能特点

- 📄 **文献上传与解析** - 支持PDF和Word文档自动解析
- 🎨 **智能风格分析** - AI分析参考文献的写作风格
- 📝 **自动生成写作指南** - 基于风格分析生成个性化写作指南
- 📋 **综述撰写计划** - 自动生成详细的章节大纲和撰写计划
- 🔍 **文献搜索** - 集成arXiv和PubMed搜索
- 🤖 **AI自动写作** - 流式生成综述初稿
- 🌐 **双语支持** - 自动生成中英文版本
- 📤 **多格式导出** - 支持Markdown和Word格式导出

## 技术栈

- **前端**: Next.js 14 + React + TypeScript + Tailwind CSS
- **后端**: Next.js API Routes
- **数据库**: SQLite (better-sqlite3)
- **AI**: OpenAI兼容API
- **文档解析**: pdf-parse, mammoth
- **部署**: Docker + GitHub Actions


## 快速开始

### 方式1：使用 Docker Compose（推荐）

1. **克隆项目**
```bash
git clone https://github.com/nssanc/ai-writer.git
cd ai-writer
```

2. **配置环境变量**

创建 `.env` 文件：
```bash
cat > .env << 'EOF'
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
EOF
```

3. **启动服务**
```bash
docker-compose up -d
```

4. **访问应用**

打开浏览器访问 [http://localhost:3333](http://localhost:3333)

### 方式2：使用 GitHub Container Registry 镜像

支持多架构镜像（amd64, arm64, arm/v7），无需配置任何密码：

```bash
# 拉取镜像
docker pull ghcr.io/nssanc/ai-writer:latest

# 运行容器
docker run -d \
  -p 3333:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/outputs:/app/outputs \
  -e OPENAI_API_ENDPOINT=https://api.openai.com/v1 \
  -e OPENAI_API_KEY=your_api_key_here \
  -e OPENAI_MODEL=gpt-4 \
  ghcr.io/nssanc/ai-writer:latest
```

或者直接使用 docker-compose（推荐）：
```bash
# docker-compose.yml 已配置好镜像地址
docker-compose up -d
```

### 方式3：本地开发

**环境要求**
- Node.js >= 20.0.0
- npm 或 yarn

**安装步骤**

1. **克隆项目**
```bash
git clone https://github.com/nssanc/ai-writer.git
cd ai-writer
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入您的API配置：
```env
OPENAI_API_ENDPOINT=https://api.openai.com/v1
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4
```

4. **初始化数据库**
```bash
npm run db:init
```

5. **启动开发服务器**
```bash
npm run dev
```

6. **访问应用**

打开浏览器访问 [http://localhost:3000](http://localhost:3000)

## API接口

### 项目管理
- `POST /api/projects` - 创建新项目
- `GET /api/projects` - 获取项目列表

### 文件上传
- `POST /api/upload` - 上传参考文献（PDF/Word）

### 风格分析
- `POST /api/analyze/style` - 分析文献风格并生成写作指南

### 文献搜索
- `POST /api/search/arxiv` - 搜索arXiv论文
- `POST /api/search/pubmed` - 搜索PubMed文献

## 使用流程

1. **创建项目** - 输入项目名称和描述
2. **上传参考文献** - 上传1-2篇参考期刊文献
3. **风格分析** - AI自动分析写作风格
4. **查看写作指南** - 查看并编辑生成的写作指南
5. **搜索文献** - 使用arXiv和PubMed搜索相关文献
6. **AI写作** - 启动AI自动撰写综述
7. **在线编辑** - 审阅和修改综述内容
8. **导出文档** - 导出Markdown或Word格式

## 环境变量说明

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `OPENAI_API_ENDPOINT` | OpenAI API 端点 | `https://api.openai.com/v1` | 是 |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - | 是 |
| `OPENAI_MODEL` | 使用的模型 | `gpt-4` | 否 |
| `NODE_ENV` | 运行环境 | `production` | 否 |
| `PORT` | 服务端口（容器内） | `3000` | 否 |

## 数据持久化

应用使用以下目录存储数据：

- `/app/data` - SQLite 数据库文件
- `/app/uploads` - 上传的文献文件
- `/app/outputs` - 生成的导出文件

这些目录已在 docker-compose.yml 中映射到宿主机，确保数据不会因容器重启而丢失。

## GitHub Actions 自动构建

项目配置了自动构建多架构 Docker 镜像并推送到 GitHub Container Registry 的 CI/CD 流程。

### 特点

- ✅ **无需配置密码** - 使用 GitHub 内置的 GITHUB_TOKEN
- ✅ **自动推送到 ghcr.io** - GitHub Container Registry
- ✅ **多架构支持** - amd64, arm64, arm/v7
- ✅ **公开访问** - 任何人都可以拉取镜像

### 自动构建触发条件

- 推送到 `main` 分支
- 创建新的 tag（如 `v1.0.0`）
- 创建 Pull Request（仅构建，不推送）

### 支持的架构

- `linux/amd64` - x86_64 架构（Intel/AMD）
- `linux/arm64` - ARM 64位架构（Apple Silicon, 树莓派4等）
- `linux/arm/v7` - ARM 32位架构（树莓派3等）

### 镜像标签

- `ghcr.io/nssanc/ai-writer:latest` - 最新的 main 分支构建
- `ghcr.io/nssanc/ai-writer:main` - main 分支构建
- `ghcr.io/nssanc/ai-writer:v1.0.0` - 版本标签构建

### 查看构建状态

访问：https://github.com/nssanc/ai-writer/actions

### 查看已发布的镜像

访问：https://github.com/nssanc/ai-writer/pkgs/container/ai-writer

## 项目结构

```
literature-review-ai/
├── app/
│   ├── api/              # API路由
│   │   ├── projects/     # 项目管理
│   │   ├── upload/       # 文件上传
│   │   ├── analyze/      # 风格分析
│   │   └── search/       # 文献搜索
│   └── page.tsx          # 主页
├── lib/
│   ├── db.ts            # 数据库操作
│   ├── ai.ts            # AI服务
│   ├── parser.ts        # 文档解析
│   ├── arxiv.ts         # arXiv API
│   ├── pubmed.ts        # PubMed API
│   └── types.ts         # 类型定义
├── data/                # SQLite数据库
├── uploads/             # 上传文件
└── outputs/             # 导出文件
```

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！
