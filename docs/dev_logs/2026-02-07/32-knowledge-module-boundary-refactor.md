## 对话记录

### 第 1 轮
- 背景: 用户先要求评估仓库模块化可优化点，已输出按收益排序的改造建议。
- 用户:
  > 分析仓库代码，模块化方面，是否还可以做的更好？
- 用户的意图解析: 需要从架构边界与耦合风险角度识别可落地的模块化优化项。
- LLM思考摘要: 基于目录结构、依赖关系和实现细节识别高价值改造点，并给出优先级。

### 第 2 轮
- 背景: 优化建议已确认，进入实际落地阶段。
- 用户:
  > OK. Build these
- 用户的意图解析: 要求将已给出的模块化建议直接实现到代码。
- LLM思考摘要: 按“前端边界重构 -> 脚本去重 -> 质量验证 -> 文档同步”执行全链路落地。

**修改时间**: 2026-02-07 18:08:53

## 概述
完成知识图谱模块边界重构与脚本公共能力抽取，降低前端与数据层耦合、移除页面强制刷新依赖，并统一仓库工具脚本重复逻辑。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/data/knowledge-node.ts` | 新增 | 2026-02-07 18:01:33 | 抽离知识节点领域类型契约 |
| `web/src/data/knowledge-tree.ts` | 修改 | 2026-02-07 18:01:41 | 改为复用独立类型定义并导出类型 |
| `web/src/features/knowledge/types.ts` | 修改 | 2026-02-07 18:01:46 | 去除对 read-model 实现文件的类型依赖 |
| `web/src/features/knowledge/constants.ts` | 修改 | 2026-02-07 18:01:51 | 移除视觉图标常量，保持常量层更纯粹 |
| `web/src/features/knowledge/model/graph-layout.ts` | 修改 | 2026-02-07 18:02:07 | model 层仅保留布局计算，移除图标语义函数 |
| `web/src/features/knowledge/ui/fruit-icon.ts` | 新增 | 2026-02-07 18:01:58 | 新增 UI 层图标规则函数 |
| `web/src/features/knowledge/ui/KnowledgeFlowNode.tsx` | 修改 | 2026-02-07 18:02:12 | 节点图标来源切换到 UI 语义模块 |
| `web/src/features/knowledge/api/knowledge-api.ts` | 新增 | 2026-02-07 18:07:03 | 抽取知识节点创建/删除 API 客户端 |
| `web/src/features/knowledge/model/tree-mutations.ts` | 新增 | 2026-02-07 18:02:32 | 抽取树结构本地增删变更逻辑 |
| `web/src/features/knowledge/KnowledgeGraphFeature.tsx` | 修改 | 2026-02-07 18:02:48 | 改为本地树状态 + API/命令分层，移除 `window.location.reload()` |
| `web/src/App.tsx` | 修改 | 2026-02-07 18:02:54 | 直接使用 feature 入口组件 |
| `web/src/components/KnowledgeGraph.tsx` | 删除 | 2026-02-07 18:02:54 | 移除空转包装组件，减少无效入口层 |
| `web/tools/knowledge-sync/scripts/_shared.mjs` | 新增 | 2026-02-07 18:03:18 | 抽取脚本共享能力（参数解析/路径校验/列补齐/摘要提取） |
| `web/tools/knowledge-sync/scripts/crud-node.mjs` | 修改 | 2026-02-07 18:03:35 | 复用共享模块，删除重复逻辑 |
| `web/tools/knowledge-sync/scripts/crud-doc.mjs` | 修改 | 2026-02-07 18:03:44 | 复用共享模块，删除重复逻辑 |
| `web/tools/knowledge-sync/scripts/sync-read-model.mjs` | 修改 | 2026-02-07 18:03:54 | 复用共享模块，删除重复逻辑 |
| `web/tools/knowledge-sync/scripts/sync-markdown-to-postgres.mjs` | 修改 | 2026-02-07 18:04:04 | 复用共享模块，删除重复逻辑 |
| `scripts/repo-metadata/lib/shared.mjs` | 新增 | 2026-02-07 18:06:32 | 抽取 repo-metadata 公共工具函数 |
| `scripts/repo-metadata/scripts/scan.mjs` | 修改 | 2026-02-07 18:04:49 | 复用公共工具，去除重复实现 |
| `scripts/repo-metadata/scripts/generate-structure-md.mjs` | 修改 | 2026-02-07 18:05:14 | 复用公共工具，去除重复实现 |
| `scripts/repo-metadata/mcp-server.mjs` | 修改 | 2026-02-07 18:06:04 | 复用公共工具，统一 MCP/CLI 逻辑来源 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 18:08:52 | 结构扫描后元数据同步 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 18:08:57 | 目录树重新生成同步 |

## 具体变更描述

### 1. 前端模块边界重构
- 问题: `features` 类型依赖 `data/knowledge-tree`，且 Feature 组件混合 UI 编排、API 调用和页面刷新策略。
- 方案:
  - 抽离 `KnowledgeNode` 到独立类型文件 `web/src/data/knowledge-node.ts`。
  - 新增 `knowledge-api` 作为接口调用层；新增 `tree-mutations` 作为本地树操作层。
  - `KnowledgeGraphFeature` 改为以本地树状态驱动 UI，创建/删除后做局部状态更新，移除 `window.location.reload()`。
  - 删除 `web/src/components/KnowledgeGraph.tsx` 空转封装层。
- 影响范围: 知识图谱 feature 交互链路与入口层，提升可测试性与扩展性，减少粗粒度刷新。

### 2. model 与 ui 职责解耦
- 问题: 图标视觉语义位于 `model/graph-layout.ts`，导致布局层掺杂展示策略。
- 方案: 将图标生成逻辑迁移到 `ui/fruit-icon.ts`，`model` 仅保留图布局计算。
- 影响范围: 图布局层复用性提升，UI 主题调整不影响模型计算。

### 3. 脚本公共能力去重
- 问题: `knowledge-sync` 与 `repo-metadata` 存在大量重复函数（参数解析、路径校验、元数据读写、树渲染等）。
- 方案:
  - 新增 `web/tools/knowledge-sync/scripts/_shared.mjs`，统一共享工具。
  - 新增 `scripts/repo-metadata/lib/shared.mjs`，统一 CLI 与 MCP 共享逻辑。
- 影响范围: 降低脚本维护成本，减少规则漂移风险，后续变更只需改一处核心实现。

## 验证结果
- ✔ `cd web && npm run lint`
- ✔ `bash scripts/check_errors.sh`（依赖检查、TypeScript、ESLint、Vite 构建全部通过）
- ✔ `cd web && npm run test`（6/6 通过）
- ✔ `cd web && npm run dev -- --host 127.0.0.1 --port 4173`（服务正常启动，`VITE v7.3.1 ready`）
- ✔ `cd web && npx madge src --extensions ts,tsx --circular --warning --no-spinner`（无循环依赖）
- ✔ `node scripts/repo-metadata/scripts/scan.mjs --update`
- ✔ `node scripts/repo-metadata/scripts/generate-structure-md.mjs`
- ✔ `node scripts/repo-metadata/scripts/scan.mjs`（0 新增/0 删除/0 未描述）

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮未执行提交，按用户要求先完成实现与验证）
- tag/backup: `N/A`
