# Knowledge Sync（Postgres + Markdown -> Read Model）

## 业务目标

- 本地：用 PostgreSQL 做结构化 CRUD，便于批量维护与关系查询。
- 本地：叶子节点正文落地到 `docs/knowledge/**/*.md`，便于编辑与版本管理。
- 线上：仅发布 `read-model.json`，实现静态只读上线，降低运维复杂度。

## 目录说明

- `sql/001_init.sql`：PostgreSQL 初始化脚本（节点表 + 依赖表）
- `scripts/bootstrap-read-model-from-legacy-tree.mjs`：从旧版 `knowledge-tree.ts` 生成初始 `read-model.json`
- `scripts/export-leaf-markdown.mjs`：把 `read-model.json` 的叶子节点导出为本地 Markdown
- `scripts/sync-markdown-to-postgres.mjs`：把本地 Markdown 增量同步到 PostgreSQL
- `scripts/import-read-model-to-postgres.mjs`：把 `read-model.json` 导入 PostgreSQL（初始化/回填）
- `scripts/sync-read-model.mjs`：从 `PostgreSQL + Markdown` 生成最新 `read-model.json`
- `scripts/crud-node.mjs`：节点元数据 CRUD（create / update / delete / list）
- `scripts/crud-doc.mjs`：文档 CRUD（create / delete / path）

## 表结构（简版）

- `knowledge_nodes`
  - `id`：节点主键
  - `label`：显示名称
  - `summary`：简要说明（用于图谱摘要）
  - `parent_id`：父节点
  - `color`：节点色
  - `doc_path`：叶子文档路径（相对 `docs/knowledge/`）
  - `sort_order`：同层排序
- `knowledge_dependencies`
  - `source_id -> target_id`：依赖关系（可选，支持未来增强）

## 使用流程

1. 初始化数据库表

```bash
psql "$DATABASE_URL" -f web/tools/knowledge-sync/sql/001_init.sql
```

2. 从旧数据生成一次初始 read model

```bash
cd web
npm run knowledge:bootstrap
```

3. 生成叶子 Markdown（首次建档）

```bash
cd web
npm run knowledge:export-md
```

4. 日常同步（本地 DB/MD 变更后）

```bash
cd web
DATABASE_URL='postgres://<user>:<pass>@<host>:<port>/<db>' npm run knowledge:sync
```

5. 先把本地 Markdown 同步到数据库，再发布 read model（推荐）

```bash
cd web
DATABASE_URL='postgres://<user>:<pass>@<host>:<port>/<db>' npm run knowledge:publish-read
```

6. 从现有 `read-model.json` 回填数据库（首次接入或重建库）

```bash
cd web
DATABASE_URL='postgres://<user>:<pass>@<host>:<port>/<db>' npm run knowledge:import-db
```

7. 节点与文档 CRUD（本地管理）

```bash
# 节点
cd web
DATABASE_URL='postgres://<user>:<pass>@<host>:<port>/<db>' npm run knowledge:node -- create --id demo-node --label Demo --parent-id vibe-coding --doc-path vibe-coding/demo-node.md

# 文档
cd web
DATABASE_URL='postgres://<user>:<pass>@<host>:<port>/<db>' npm run knowledge:doc -- create --node-id demo-node
```

## 一致性策略

- 节点创建：`knowledge:node create` 默认自动生成文档（同事务链路，失败会回滚并清理文件）
- 节点删除：`knowledge:node delete` 自动归档子树文档到 `docs/knowledge/_archive/<txid>/`（数据库失败会恢复文档）
- 文档删除：`knowledge:doc delete` 会先创建 `.bak-时间戳` 备份再删除

## 约束说明

- 当前版本采用单向同步：`Postgres + Markdown -> read-model.json`
- `read-model.json` 是线上只读产物，不作为编辑入口
- 后续做双向同步时，建议先加冲突检测与幂等校验
