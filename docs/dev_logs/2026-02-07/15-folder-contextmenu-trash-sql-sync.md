## 对话记录

> 对了，目前web的文件夹管理还没办法右键删除，以及添加什么的
> 对，然后就是添加和删除操作最好是可以同步到SQL的表里
> 此外就是，删除最好是删除到一个垃圾桶里

**LLM**: 提议采用“右键新增/删除 + SQL 同步 + 软删除垃圾桶”方案，并将垃圾桶文件落地到 `docs/knowledge/_trash/<txid>/...`，保障可恢复。

> 垃圾桶是如何设计的？

**LLM**: 给出软删除设计：节点表增加 `is_trashed/trashed_at/trash_tx_id`，read-model 只发布非垃圾桶节点，文档搬迁到 `_trash`。

> 定期清理就不用了吧，我主要关心垃圾桶里的文件储存在哪里

**LLM**: 确认垃圾桶文件存储路径为 `docs/knowledge/_trash/<trash_tx_id>/<原始路径>.md`。

> OK. 仓库里新增加了一些内容. 阅读，然后继续我们的开发

**LLM**: 已阅读新增模块后继续开发，完成前端右键管理、Vite 本地 API、SQL 软删除垃圾桶链路，并完成端到端验证。

**修改时间**: 2026-02-07 14:42:17

## 概述

完成文件夹管理“可运营化”升级：左侧目录支持右键新增/删除，新增与删除同步 SQL，删除改为垃圾桶软删除，避免误删导致知识资产不可恢复。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/features/knowledge/KnowledgeGraphFeature.tsx` | 修改 | 2026-02-07 14:40:01 | 增加右键菜单（新建子节点/删除到垃圾桶）和本地 API 调用逻辑 |
| `web/src/features/knowledge/ui/FolderPanel.tsx` | 修改 | 2026-02-07 14:39:20 | 支持节点右键事件透传 |
| `web/tools/knowledge-sync/dev-api.mjs` | 新增 | 2026-02-07 14:39:03 | 新增 Vite 本地编辑 API：create/delete/restore + 自动刷新 read-model |
| `web/vite.config.ts` | 修改 | 2026-02-07 14:39:10 | 挂载 `knowledgeDevApiPlugin`，开发环境启用 `/api/knowledge/*` |
| `web/tools/knowledge-sync/sql/001_init.sql` | 修改 | 2026-02-07 14:37:15 | 新增垃圾桶字段与索引：`is_trashed/trashed_at/trashed_parent_id/trash_tx_id` |
| `web/tools/knowledge-sync/scripts/crud-node.mjs` | 修改 | 2026-02-07 14:38:28 | `delete` 改为软删除到 `_trash`，新增 `restore`，`list` 支持 `--include-trashed` |
| `web/tools/knowledge-sync/scripts/sync-read-model.mjs` | 修改 | 2026-02-07 14:37:23 | 只导出 `is_trashed=false` 节点，避免垃圾桶内容线上可见 |
| `web/tools/knowledge-sync/scripts/sync-markdown-to-postgres.mjs` | 修改 | 2026-02-07 14:37:32 | 跳过垃圾桶节点，避免同步误报文档缺失 |
| `web/tools/knowledge-sync/scripts/import-read-model-to-postgres.mjs` | 修改 | 2026-02-07 14:37:40 | 导入时兼容垃圾桶字段（默认非垃圾桶） |
| `web/tools/knowledge-sync/README.md` | 修改 | 2026-02-07 14:41:58 | 更新垃圾桶语义、restore 命令与本地 API 说明 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 14:42:09 | 补充“删除进入 `_trash`”架构说明 |
| `web/src/data/read-model.json` | 修改 | 2026-02-07 14:41:10 | 由同步脚本自动刷新（过滤垃圾桶节点） |
| `docs/knowledge/_trash/*` | 新增 | 2026-02-07 14:41:10 | 联调过程产生的垃圾桶样例文档 |
| `docs/dev_logs/2026-02-07/15-folder-contextmenu-trash-sql-sync.md` | 新增 | 2026-02-07 14:42:17 | 记录本轮右键+垃圾桶+SQL 同步开发过程 |

## 具体变更描述

### 问题

- 前端目录管理缺少新增/删除入口，编辑动作无法在 UI 完成。
- 删除动作直接硬删风险高，误删后难以恢复。
- DB 与文档内容缺少统一垃圾桶语义，线上只读存在混入风险。

### 方案

1. 本地编辑 API（开发态）
- 在 Vite 开发服务挂载 `/api/knowledge/*`。
- 新增接口：
  - `POST /api/knowledge/nodes` 创建节点（自动生成 ID，创建节点与文档并刷新 read-model）
  - `DELETE /api/knowledge/nodes/:id` 删除到垃圾桶
  - `POST /api/knowledge/nodes/:id/restore` 从垃圾桶恢复

2. 垃圾桶数据模型
- 节点表新增软删除字段。
- `crud-node delete` 改为软删除，文档迁移到 `docs/knowledge/_trash/<txid>/...`。
- `crud-node restore` 支持子树恢复并回迁文档。

3. 发布链路隔离垃圾桶
- `sync-read-model` 与 `sync-markdown-to-postgres` 默认跳过垃圾桶节点。
- 保障线上只读模型不暴露垃圾桶内容。

### 影响范围

- 业务收益：本地目录管理完整闭环（右键操作即可完成新增/删除）。
- 风险收益：删除可恢复，降低知识资产误删损失。
- 发布收益：线上只读模型自动隔离垃圾桶数据，稳定性更高。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run test` 通过（6/6）
- ✔ `cd web && timeout 20s npm run dev -- --host 127.0.0.1 --port 4173` 启动成功
- ✔ API 健康检查通过：`GET /api/knowledge/health`
- ✔ 新增+删除联调通过：
  - `POST /api/knowledge/nodes` 返回新节点 `id`
  - `DELETE /api/knowledge/nodes/:id` 返回 `mode=trash`
  - 文档落地到 `docs/knowledge/_trash/<txid>/...`
- ✔ 恢复链路联调通过：
  - `POST /api/knowledge/nodes/:id/restore` 返回 `mode=restore`
  - 文档回迁到 `docs/knowledge/<原路径>.md`
