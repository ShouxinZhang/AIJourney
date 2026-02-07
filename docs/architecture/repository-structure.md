# AI Journey - 仓库架构文档

## 项目概述
AI 学习之旅知识图谱网站，以“文件夹视图 + 依赖图视图 + 在线阅读”三模式展示 AI 领域知识点，支持本地 Markdown 编辑、数据库同步与线上只读发布。

## 目录结构

```
AIJourney/
├── AGENTS.md                          # AI Agent 行为规范（全局自定义指令）
├── LICENSE                            # 许可证
├── .agents/skills/                    # Agent Skills（任务型专项技能）
│   ├── local-dev-workflow/SKILL.md   # 本地开发全链路 SOP（总调度）
│   ├── dev-logs/SKILL.md             # 开发日志记录规范（含用户 prompt 记录）
│   ├── build-check/SKILL.md          # 代码构建全链路质量门禁
│   ├── knowledge-tree-update/SKILL.md # 知识图谱数据维护规范
│   └── repo-structure-sync/SKILL.md  # 仓库架构文档同步规范
├── scripts/                           # 构建与运维脚本
│   ├── check_errors.sh               # 全链路构建检查 (TSC + ESLint + Vite Build)
│   └── restart.sh                    # 一键启动/重启开发服务器
├── web/                               # 知识图谱前端网站 (Vite + React + TS)
│   ├── index.html                     # HTML 入口
│   ├── package.json                   # 依赖管理
│   ├── vite.config.ts                 # Vite 构建配置
│   ├── tsconfig.json                  # TypeScript 配置
│   ├── eslint.config.js               # ESLint 配置
│   ├── public/                        # 静态资源
│   ├── tools/
│   │   └── knowledge-sync/            # 本地知识同步模块（PG+MD -> read-model）
│   │       ├── README.md              # 同步模块使用说明
│   │       ├── sql/
│   │       │   └── 001_init.sql       # PostgreSQL 知识库初始化脚本
│   │       └── scripts/
│   │           ├── bootstrap-read-model-from-legacy-tree.mjs # 从旧树数据生成初始 read-model
│   │           ├── crud-doc.mjs      # 文档 CRUD（create/delete/path）
│   │           ├── crud-node.mjs     # 节点 CRUD（create/update/delete/list）
│   │           ├── export-leaf-markdown.mjs # 生成叶子节点 Markdown 文档
│   │           ├── import-read-model-to-postgres.mjs # 从 read-model 回填 PostgreSQL
│   │           ├── sync-markdown-to-postgres.mjs # 将本地 Markdown 增量同步到 PostgreSQL
│   │           └── sync-read-model.mjs # 从 PostgreSQL 与 Markdown 同步 read-model
│   └── src/                           # 源代码
│       ├── main.tsx                   # 应用入口
│       ├── App.tsx                    # 根组件
│       ├── index.css                  # 全局样式 (Tailwind + Google Fonts)
│       ├── vite-env.d.ts              # Vite 类型声明
│       ├── components/                # UI 组件
│       │   └── KnowledgeGraph.tsx     # 知识中枢组件（文件夹/依赖图双视图，含详情联动）
│       ├── data/                      # 数据层
│       │   ├── knowledge-tree.ts      # 知识树读取层（读取 read-model）
│       │   └── read-model.json        # 线上只读发布模型（同步产物）
│       └── __tests__/                 # 自动化测试
│           └── knowledge-tree.test.ts # 知识树数据完整性测试
└── docs/                              # 文档
    ├── architecture/
    │   └── repository-structure.md    # 本文件 - 仓库架构说明
    ├── knowledge/                     # 叶子节点 Markdown 知识库（本地编辑）
    │   ├── _archive/                  # 节点删除后的文档归档目录（事务补偿）
    │   ├── vibe-coding/               # Vibe Coding 叶子知识文档
    │   ├── agent-dev/                 # Agent Dev 叶子知识文档
    │   └── llm-fundamental/           # LLM Fundamental 叶子知识文档
    └── dev_logs/                      # 开发日志（含用户 prompt 记录）
        └── 2026-02-07/               # 按日期归档
            ├── 01-init-knowledge-graph.md
            ├── 02-bugfix-five-issues.md
            ├── 03-create-agent-skills.md
            ├── 04-folder-graph-dual-view.md
            ├── 05-fix-graph-edge-rendering.md
            ├── 06-local-dev-workflow-skill.md
            ├── 07-postgres-markdown-read-model-sync.md
            ├── 08-complete-postgres-sync-runtime.md
            ├── 09-md-db-read-crud-upgrade.md
            ├── 10-markdown-render-transaction-crud.md
            └── image/                 # 日志配图素材目录
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.1.0 | UI 框架 |
| react-markdown | ^10.1.0 | 在线阅读 Markdown 渲染 |
| TypeScript | ~5.8.3 | 类型安全 |
| Vite | ^6.3.5 | 构建工具 |
| @xyflow/react | ^12.8.2 | 图/节点可视化 |
| pg | ^8.18.0 | 本地 PostgreSQL 连接驱动（知识同步） |
| Tailwind CSS | ^4.1.4 | 样式方案 |
| ESLint | ^9.22.0 | 代码规范 |
| Vitest | ^4.0.18 | 自动化测试 |

## Agent Skills

项目使用 `.agents/skills/` 目录存放 Agent Skills，Copilot 会根据任务自动加载：

| Skill | 触发场景 |
|-------|----------|
| `local-dev-workflow` | 本地开发全链路 SOP，串联所有子 Skills 形成闭环（总调度） |
| `dev-logs` | 完成代码变更后，记录开发日志（含用户原始 prompt） |
| `build-check` | 代码修改后，运行全链路构建检查 |
| `knowledge-tree-update` | 添加/修改知识节点时的数据规范 |
| `repo-structure-sync` | 文件结构变化后，同步架构文档 |

## 知识图谱类别

1. **Vibe Coding Skills** (🍊 橘橙 #f97316) — AI辅助编程技能
2. **Agent Dev** (🥝 猕猴桃绿 #22c55e) — AI Agent 开发
3. **LLM Fundamental** (🫐 蓝莓紫 #a855f7) — 大语言模型基础

## 开发命令

```bash
cd web
npm run dev       # 启动开发服务器
npm run build     # 生产构建 (tsc + vite build)
npm run lint      # ESLint 检查
npm run check     # 全链路检查 (调用 check_errors.sh)
npm run test      # 运行自动化测试
npm run test:watch # 测试监听模式
npm run knowledge:bootstrap # 从旧树数据生成初始 read-model.json
npm run knowledge:export-md # 生成叶子节点 Markdown 文档
npm run knowledge:sync-md-to-db # 将本地 Markdown 增量同步到 PostgreSQL
npm run knowledge:import-db # 从 read-model.json 回填 PostgreSQL
npm run knowledge:sync # 从 PostgreSQL + Markdown 同步 read-model.json
npm run knowledge:publish-read # 先同步 Markdown 到 DB，再生成 read-model.json
npm run knowledge:node -- <args> # 节点 CRUD 命令
npm run knowledge:doc -- <args> # 文档 CRUD 命令

# 或直接运行检查脚本
bash scripts/restart.sh               # 一键启动开发服务器
bash scripts/restart.sh --check       # 先检查再启动
bash scripts/restart.sh --build       # 构建生产版本并预览

bash scripts/check_errors.sh          # 全部检查
bash scripts/check_errors.sh --tsc    # 仅 TypeScript
bash scripts/check_errors.sh --lint   # 仅 ESLint
bash scripts/check_errors.sh --build  # 仅构建
```

## 添加知识点

当前采用“本地可编辑 + 线上只读”模式：

1. 在 PostgreSQL 的 `knowledge_nodes` / `knowledge_dependencies` 维护结构与关系  
2. 在 `docs/knowledge/` 维护叶子节点 Markdown 正文  
3. 执行 `cd web && npm run knowledge:publish-read` 完成 “MD -> DB -> read-model” 同步链路  
