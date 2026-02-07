## 对话记录

> 我个人觉得其实差不多到模块化拆分的阶段了

**LLM**: 认同进入模块化拆分窗口，并给出“功能不变、先拆结构”的低风险方案，先分离 model/hooks/ui，再保持入口兼容。

> 拆

**LLM**: 已完成 KnowledgeGraph 的模块化重构，迁移到 `features/knowledge` 分层结构，并通过构建、测试、启动验证。

**修改时间**: 2026-02-07 13:50:27

## 概述

完成知识图谱核心页面的模块化拆分，在不改变用户可见行为的前提下，将单文件实现升级为“模型逻辑、状态逻辑、UI 组件”分层架构，降低后续功能迭代风险。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/components/KnowledgeGraph.tsx` | 修改 | 2026-02-07 13:48:12 | 改为兼容入口薄封装，转发到 features 模块 |
| `web/src/features/knowledge/KnowledgeGraphFeature.tsx` | 新增 | 2026-02-07 13:49:33 | 页面级组合组件，组装 header + 三栏布局 |
| `web/src/features/knowledge/constants.ts` | 新增 | 2026-02-07 13:45:34 | 抽离图布局与节点渲染常量 |
| `web/src/features/knowledge/types.ts` | 新增 | 2026-02-07 13:45:34 | 抽离特性模块类型定义 |
| `web/src/features/knowledge/model/tree-index.ts` | 新增 | 2026-02-07 13:45:59 | 抽离树索引、路径、可见行、后代计数纯函数 |
| `web/src/features/knowledge/model/graph-layout.ts` | 新增 | 2026-02-07 13:48:21 | 抽离 React Flow 节点与边布局纯函数 |
| `web/src/features/knowledge/hooks/useKnowledgeGraphState.ts` | 新增 | 2026-02-07 13:46:22 | 抽离页面状态和交互事件 Hook |
| `web/src/features/knowledge/ui/FolderPanel.tsx` | 新增 | 2026-02-07 13:46:53 | 左侧文件夹面板组件 |
| `web/src/features/knowledge/ui/CenterPanel.tsx` | 新增 | 2026-02-07 13:48:56 | 中间主内容/依赖图双模式组件 |
| `web/src/features/knowledge/ui/DetailPanel.tsx` | 新增 | 2026-02-07 13:47:43 | 右侧业务详情组件 |
| `web/src/features/knowledge/ui/KnowledgeFlowNode.tsx` | 新增 | 2026-02-07 13:49:19 | 自定义图节点组件 |
| `web/src/features/knowledge/ui/nodeTypes.ts` | 新增 | 2026-02-07 13:49:26 | 图节点类型映射文件（满足 fast-refresh 规则） |
| `web/src/features/knowledge/index.ts` | 新增 | 2026-02-07 13:48:05 | features/knowledge 模块导出入口 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 13:50:19 | 同步 features 模块目录和本轮日志编号 |
| `docs/dev_logs/2026-02-07/12-knowledgegraph-modular-refactor.md` | 新增 | 2026-02-07 13:50:27 | 记录本轮模块化拆分与验证结果 |

## 具体变更描述

### 问题

- `KnowledgeGraph.tsx` 原先承担数据建模、状态管理、三栏 UI、图布局和节点渲染，职责过载。
- 后续继续叠加 CRUD 与在线阅读能力，单文件改动范围会扩大，回归风险上升。

### 方案

1. 模块分层
- `model/`：只保留纯函数（树索引、图布局），提升可测试性。
- `hooks/`：统一管理 view mode、选中节点、展开状态和图交互状态。
- `ui/`：三栏拆分成独立可维护组件。

2. 兼容迁移
- 保留 `web/src/components/KnowledgeGraph.tsx` 作为稳定入口，避免上层调用断裂。

3. 规范修复
- 将 `nodeTypes` 常量从组件文件拆出到 `ui/nodeTypes.ts`，消除 eslint fast-refresh 警告。

### 影响范围

- 业务收益：后续新增节点操作、阅读能力和样式迭代时，定位与改动成本更低。
- 稳定性收益：拆分后每个模块边界清晰，回归问题更容易隔离和修复。
- 交付收益：功能演进可并行推进（模型、交互、视图），减少相互阻塞。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run test` 通过（6/6）
- ✔ `cd web && timeout 20s npm run dev -- --host 127.0.0.1 --port 4173` 启动成功
