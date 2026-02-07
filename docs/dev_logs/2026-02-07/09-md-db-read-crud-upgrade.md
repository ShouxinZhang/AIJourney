## 用户 Prompt

> OK. 此外, 目前就是我觉得目前的vibe-coding的框架也挺好的, 你可以尝试填写一些md，然后我review看看
> 此外，目前的文档管理系统，CRUD还不完善

**修改时间**: 2026-02-07 13:18:28

## 概述

完成“本地 Markdown -> PostgreSQL -> 在线阅读”闭环升级，新增文档与节点基础 CRUD 命令，并补充 5 篇 Vibe Coding 高质量示例文档用于业务评审。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/tools/knowledge-sync/sql/001_init.sql` | 修改 | 2026-02-07 13:13:31 | 扩展文档字段：`doc_markdown`、`doc_hash`、`doc_synced_at` |
| `web/tools/knowledge-sync/scripts/sync-markdown-to-postgres.mjs` | 新增 | 2026-02-07 13:14:13 | 新增本地 Markdown 增量同步到 PostgreSQL 脚本 |
| `web/tools/knowledge-sync/scripts/sync-read-model.mjs` | 修改 | 2026-02-07 13:15:03 | read-model 生成时输出 `content`，支持在线阅读正文 |
| `web/tools/knowledge-sync/scripts/import-read-model-to-postgres.mjs` | 修改 | 2026-02-07 13:13:49 | 导入时同步正文与内容哈希，兼容新字段 |
| `web/tools/knowledge-sync/scripts/crud-node.mjs` | 新增 | 2026-02-07 13:14:35 | 节点 CRUD（create/update/delete/list） |
| `web/tools/knowledge-sync/scripts/crud-doc.mjs` | 新增 | 2026-02-07 13:14:46 | 文档 CRUD（create/delete/path），删除前自动备份 |
| `web/package.json` | 修改 | 2026-02-07 13:14:46 | 新增 `knowledge:sync-md-to-db`、`knowledge:publish-read`、`knowledge:node`、`knowledge:doc` 命令 |
| `web/src/data/knowledge-tree.ts` | 修改 | 2026-02-07 13:15:42 | 扩展节点类型，支持 `content` 字段 |
| `web/src/components/KnowledgeGraph.tsx` | 修改 | 2026-02-07 13:15:50 | 右侧详情新增“在线阅读”区域，直接渲染节点正文 |
| `web/src/data/read-model.json` | 修改 | 2026-02-07 13:18:04 | 从 PostgreSQL 同步生成，包含叶子正文内容 |
| `web/tools/knowledge-sync/README.md` | 修改 | 2026-02-07 13:16:03 | 补充 MD->DB->read 发布流程与 CRUD 命令说明 |
| `docs/knowledge/vibe-coding/vc-pe-context.md` | 修改 | 2026-02-07 13:16:36 | 补充业务化上下文设定方法与提示模板 |
| `docs/knowledge/vibe-coding/vc-copilot-agent.md` | 修改 | 2026-02-07 13:16:36 | 补充 Agent Mode 价值与管理策略 |
| `docs/knowledge/vibe-coding/vc-wf-testing.md` | 修改 | 2026-02-07 13:16:36 | 补充测试体系的业务指标与落地流程 |
| `docs/knowledge/vibe-coding/vc-bp-modular.md` | 修改 | 2026-02-07 13:16:36 | 补充模块化治理策略与边界 |
| `docs/knowledge/vibe-coding/vc-as-skillmd.md` | 修改 | 2026-02-07 13:16:36 | 补充 Skill 文档编写框架与组织价值 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 13:17:56 | 同步新增同步脚本、CRUD命令、在线阅读架构与日志编号 |
| `docs/dev_logs/2026-02-07/09-md-db-read-crud-upgrade.md` | 新增 | 2026-02-07 13:18:28 | 记录本轮升级的业务目标、方案与验证结果 |

## 具体变更描述

### 方案

1. 建立内容真源链路
- 本地 Markdown 是编辑源
- `knowledge:sync-md-to-db` 将 Markdown 正文同步进 PostgreSQL
- `knowledge:sync` 从 DB 生成 read-model，前端只读加载

2. 打通在线阅读
- 叶子节点新增 `content` 字段并进入 read-model
- 图谱详情面板新增“在线阅读”，可直接在页面查看正文

3. 提升运维 CRUD 能力
- 节点层：`knowledge:node` 支持 create/update/delete/list
- 文档层：`knowledge:doc` 支持 create/delete/path，并对 delete 做备份保护

4. 丰富示例内容
- 补充 5 篇 `vibe-coding` 文档，覆盖提示工程、Agent、测试、模块化、Skill 规范

### 影响范围

- 受影响模块：知识同步模块、前端详情阅读模块、文档内容模块
- 业务收益：
  - 本地写文档后可自动入库并在线阅读
  - 管理台具备基础 CRUD 工具命令，降低手工维护成本
  - 可直接用补充文档做内容风格评审与后续模板沉淀

## 验证结果

- ✔ `cd web && npm run knowledge:sync-md-to-db` 通过（总计 62，更新 62）
- ✔ `cd web && npm run knowledge:sync` 通过（节点 80，关系 0）
- ✔ `cd web && npm run knowledge:publish-read` 通过（链路命令可复用）
- ✔ `cd web && npm run knowledge:node -- list` 通过（CRUD 命令可执行）
- ✔ `cd web && npm run knowledge:doc -- path --node-id vc-pe-context` 通过
- ✔ `bash scripts/check_errors.sh` 通过
- ✔ `cd web && npm run test` 通过（6/6）
- ✔ `cd web && timeout 20s npm run dev -- --host 127.0.0.1 --port 4173` 启动成功
