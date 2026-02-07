# AI Journey - 仓库架构文档

## 项目概述
AI 学习之旅知识图谱网站，以交互式 Tree/Graph 形式展示 AI 领域知识点，支持节点点击展开探索。

## 目录结构

```
AIJourney/
├── AGENTS.md                          # AI Agent 行为规范（全局自定义指令）
├── LICENSE                            # 许可证
├── .agents/skills/                    # Agent Skills（任务型专项技能）
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
│   └── src/                           # 源代码
│       ├── main.tsx                   # 应用入口
│       ├── App.tsx                    # 根组件
│       ├── index.css                  # 全局样式 (Tailwind + Google Fonts)
│       ├── vite-env.d.ts              # Vite 类型声明
│       ├── components/                # UI 组件
│       │   └── KnowledgeGraph.tsx     # 知识图谱核心组件 (React Flow)
│       ├── data/                      # 数据层
│       │   └── knowledge-tree.ts      # 知识树数据定义
│       └── __tests__/                 # 自动化测试
│           └── knowledge-tree.test.ts # 知识树数据完整性测试
└── docs/                              # 文档
    ├── architecture/
    │   └── repository-structure.md    # 本文件 - 仓库架构说明
    └── dev_logs/                      # 开发日志（含用户 prompt 记录）
        └── 2026-02-07/               # 按日期归档
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.1.0 | UI 框架 |
| TypeScript | ~5.8.3 | 类型安全 |
| Vite | ^6.3.5 | 构建工具 |
| @xyflow/react | ^12.8.2 | 图/节点可视化 |
| Tailwind CSS | ^4.1.4 | 样式方案 |
| ESLint | ^9.22.0 | 代码规范 |
| Vitest | ^4.0.18 | 自动化测试 |

## Agent Skills

项目使用 `.agents/skills/` 目录存放 Agent Skills，Copilot 会根据任务自动加载：

| Skill | 触发场景 |
|-------|----------|
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

编辑 `web/src/data/knowledge-tree.ts`，在对应类别的 `children` 数组中添加节点：

```typescript
{
  id: 'unique-id',
  label: '节点名称',
  description: '节点描述',
  children: [/* 可选子节点 */]
}
```
