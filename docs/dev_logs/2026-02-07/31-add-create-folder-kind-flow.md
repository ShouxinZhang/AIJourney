## 对话记录

> 不对啊，我发现只有新建节点，没有新建文件夹功能

**LLM**: 确认当前实现只有“新建节点”能力，缺少独立的“新建文件夹”类型入口与后端创建语义。

> OK

**LLM**: 已实现“新建文件夹 + 新建节点”双创建链路（前端菜单、对话框、dev-api、CRUD、read-model 同步）并完成构建验证。

**修改时间**: 2026-02-07 17:47:51

## 概述

补齐知识树结构管理能力，新增“新建文件夹”功能并打通类型化创建链路，避免目录节点被错误创建为文档节点。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/features/knowledge/KnowledgeGraphFeature.tsx` | 修改 | 2026-02-07 17:47:11 | 增加 `createKind` 状态，右键菜单支持“新建文件夹/新建节点”双入口 |
| `web/src/features/knowledge/ui/context/FolderContextMenu.tsx` | 修改 | 2026-02-07 17:44:15 | 新增“新建文件夹”菜单项并拆分创建回调 |
| `web/src/features/knowledge/ui/dialogs/CreateNodeDialog.tsx` | 修改 | 2026-02-07 17:44:05 | 对话框支持 `mode`，按文件夹/节点动态文案 |
| `web/src/features/knowledge/ui/FolderPanel.tsx` | 修改 | 2026-02-07 17:43:35 | 图标渲染改为基于 `isFolder`，空文件夹不再显示为文件 |
| `web/src/features/knowledge/model/tree-index.ts` | 修改 | 2026-02-07 17:43:28 | 生成 `FolderRow` 时补充 `isFolder` 判定逻辑 |
| `web/src/features/knowledge/hooks/useKnowledgeGraphState.ts` | 修改 | 2026-02-07 17:43:42 | `isLeafSelected` 排除文件夹节点，避免空文件夹被当作文档叶子节点 |
| `web/src/features/knowledge/types.ts` | 修改 | 2026-02-07 17:43:16 | 新增 `NodeKind` 与 `FolderRow.isFolder` |
| `web/src/data/knowledge-tree.ts` | 修改 | 2026-02-07 17:43:22 | `KnowledgeNode` 新增可选 `kind` 字段 |
| `web/tools/knowledge-sync/dev-api.mjs` | 修改 | 2026-02-07 17:44:41 | 创建接口支持 `kind: folder|node` 参数并传递给 CRUD 脚本 |
| `web/tools/knowledge-sync/scripts/crud-node.mjs` | 修改 | 2026-02-07 17:44:54 | `create` 命令支持 `--kind`；folder 类型不写 `doc_path`、不生成 Markdown |
| `web/tools/knowledge-sync/scripts/sync-read-model.mjs` | 修改 | 2026-02-07 17:45:01 | 生成 read-model 时输出 `kind`（folder/node） |
| `docs/dev_logs/2026-02-07/31-add-create-folder-kind-flow.md` | 新增 | 2026-02-07 17:47:51 | 记录本轮功能补齐与验证结果 |

## 具体变更描述

### 问题

- 右键菜单仅支持“新建子节点”，没有“新建文件夹”能力。
- 创建接口没有节点类型语义，所有新建都按文档节点处理，导致目录管理能力缺失。

### 方案

1. 前端类型化创建
- 菜单新增“新建文件夹”入口。
- 创建弹窗支持 `mode=folder|node`，动态展示标题、字段和按钮文案。

2. 后端创建语义扩展
- `POST /api/knowledge/nodes` 接受 `kind` 参数。
- CRUD `create` 新增 `--kind`，folder 类型强制不生成 `doc_path` 和 Markdown 文件。

3. 读取模型与展示一致化
- `sync-read-model` 生成 `kind` 字段。
- 前端根据 `kind/docPath/children` 识别文件夹，空文件夹显示文件夹图标并参与目录语义。

### 影响范围

- 影响模块：`knowledge` 前端交互层 + 本地同步工具链（dev-api / CRUD / read-model 生成）。
- 业务收益：目录结构可显式建模，知识树管理更准确，后续可扩展“空文件夹占位/批量整理”等能力。
- 风险评估：中低风险；变更跨前后端但向后兼容（默认 `kind=node`）。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（依赖检查 / TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run lint` 通过
- ✔ `cd web && timeout 20s npm run dev` 成功启动（Vite Ready，无运行时报错；端口占用后自动切换到 `http://localhost:5174/`）
- ✔ `node scripts/repo-metadata/scripts/scan.mjs --update` 执行成功
- ✔ `node scripts/repo-metadata/scripts/generate-structure-md.mjs` 执行成功
