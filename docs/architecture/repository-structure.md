# AI Journey - 仓库架构文档

## 项目概述
AI 学习之旅知识图谱网站，以“文件夹视图 + 依赖图视图 + 在线阅读”三模式展示 AI 领域知识点，支持本地 Markdown 编辑、数据库同步与线上只读发布。

## 目录结构

<!-- REPO-TREE-START -->
```
AIJourney/
├── .agents/                                 # Agent Skills 目录（任务型专项技能）
│   └── skills/                              # 各 Skill 定义目录
├── docs/                                    # 项目文档（架构、知识库、开发日志）
│   ├── architecture/                        # 架构文档与仓库元数据
│   ├── dev_logs/                            # 开发日志（按日期归档）
│   └── knowledge/                           # 叶子节点 Markdown 知识库（本地编辑）
├── scripts/                                 # 构建与运维脚本
│   ├── repo-metadata/                       # 仓库元数据管理系统（扫描/CRUD/PG同步/生成架构文档）
│   ├── check_errors.sh                      # 全链路构建检查 (TSC + ESLint + Vite Build)
│   └── restart.sh                           # 一键启动/重启开发服务器
├── web/                                     # 知识图谱前端网站 (Vite + React + TS)
│   ├── src/                                 # 前端源代码
│   ├── tools/                               # 本地开发工具集
│   ├── .gitignore                           # Web 模块 Git 忽略规则
│   ├── eslint.config.js                     # ESLint 配置
│   ├── index.html                           # HTML 入口
│   ├── package.json                         # 依赖管理与 npm 脚本
│   ├── tsconfig.json                        # TypeScript 配置
│   └── vite.config.ts                       # Vite 构建配置
├── .gitignore                               # 仓库级 Git 忽略规则（本地配置/垃圾桶/依赖）
├── .gitattributes                           # Git 属性配置
├── AGENTS.md                                # AI Agent 行为规范（全局自定义指令）
└── LICENSE                                  # 项目许可证
```
<!-- REPO-TREE-END -->

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

# 仓库元数据管理
npm run repo:scan           # 扫描目录结构并报告变化
npm run repo:scan-update    # 扫描并自动更新 repo-metadata.json
npm run repo:crud -- <args> # 元数据 CRUD 操作
npm run repo:generate-md    # 从 JSON 生成 repository-structure.md 目录树
npm run repo:sync-to-db     # JSON → PostgreSQL（需 DATABASE_URL）
npm run repo:sync-from-db   # PostgreSQL → JSON（需 DATABASE_URL）

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
2. 在 `docs/knowledge/` 维护叶子节点 Markdown 正文（删除进入 `docs/knowledge/_trash/`）  
3. 执行 `cd web && npm run knowledge:publish-read` 完成 “MD -> DB -> read-model” 同步链路  
