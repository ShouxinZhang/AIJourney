# AIJourney

[English Home](README.md) | [中文版本](README.zh-CN.md)

面向 AI 领域的交互式知识图谱网站，以**文件夹视图 + 依赖图视图 + 在线阅读**三模式展示 AI 知识体系，帮助团队高效构建、浏览和共享结构化的 AI 学习路径。

## 我们的核心价值

将零散的 AI 知识沉淀为**可交互、可导航的知识图谱**，让团队以更低的沟通成本、更清晰的学习路径，快速掌握从基础原理到生产实践的 AI 全链路知识。

## 我们的核心竞争力

- **结构化知识可视化**：AI 知识以交互式图谱呈现，支持文件夹视图和依赖关系视图双模式切换，让复杂主题直观可导航。
- **本地编辑 + 线上只读架构**：Markdown 文件本地编辑，同步至 PostgreSQL，发布为静态只读模型——兼顾开发者友好的创作体验与零成本部署。
- **Agent 驱动的开发工作流**：内置 Copilot Agent Skills，自动化构建检查、开发日志、架构文档和知识同步——以最小人工介入保障质量和可追溯性。
- **模块化可扩展设计**：每个知识类别独立维护，新增主题即插即用，不影响现有结构。

## 仓库结构

```
AIJourney/
├── .agents/skills/        # Copilot Agent Skills（自动化工作流）
├── docs/
│   ├── architecture/      # 架构文档与仓库元数据
│   ├── dev_logs/          # 开发日志（按日期归档）
│   └── knowledge/         # 叶子节点 Markdown 知识库
├── scripts/               # 构建与运维脚本
│   ├── repo-metadata/     # 仓库元数据管理（扫描/CRUD/PG同步）
│   ├── check_errors.sh    # 全链路构建检查（TSC + ESLint + Vite）
│   └── restart.sh         # 一键启动/重启开发服务器
├── web/                   # 知识图谱前端网站（Vite + React + TS）
│   ├── src/               # 前端源代码
│   └── tools/             # 本地开发工具集
├── AGENTS.md              # AI Agent 行为规范（全局指令）
└── LICENSE                # MIT 许可证
```

## 技术栈

| 技术 | 用途 |
|---|---|
| React 19 + TypeScript | UI 框架与类型安全 |
| @xyflow/react | 交互式图/节点可视化 |
| react-markdown | 在线 Markdown 渲染 |
| Vite | 构建工具与开发服务器 |
| Tailwind CSS | 样式方案 |
| PostgreSQL | 知识结构与同步后端 |
| Vitest | 自动化测试 |
| ESLint | 代码规范 |

## 知识图谱类别

| 类别 | 色标 | 说明 |
|---|---|---|
| Vibe Coding Skills | 🍊 橘橙 | AI 辅助编程技能 |
| Agent Dev | 🥝 猕猴桃绿 | AI Agent 开发模式 |
| LLM Fundamental | 🫐 蓝莓紫 | 大语言模型基础 |

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/ShouxinZhang/AIJourney.git
cd AIJourney

# 安装依赖
cd web && npm install

# 启动开发服务器
npm run dev
```

## 使用方式

- **浏览知识图谱**：打开 Web 应用，通过文件夹视图或依赖图视图探索 AI 主题
- **阅读知识文章**：点击任意叶子节点，在线阅读完整 Markdown 内容
- **添加新知识**：在 `docs/knowledge/` 下创建 Markdown 文件，然后执行 `npm run knowledge:publish-read` 同步

## 贡献方式

- 新内容放在 `docs/knowledge/` 下最合适的叶子模块目录
- 保持模块隔离——每个功能限定在其子模块内
- 变更前查看并遵守 `docs/architecture/repository-structure.md`
- 变更后更新架构文档，并在 `docs/dev_logs/` 记录开发日志

## 许可证

[MIT](LICENSE)
