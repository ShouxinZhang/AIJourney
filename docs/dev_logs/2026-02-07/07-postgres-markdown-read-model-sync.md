## 用户 Prompt

> 嗯... 作为叶子节点的文档储存在哪里呢？
>
> 我觉得这个不对啊
> 理论上最好是可以挂载到本地的数据库里，当然，文件保存我觉得轻量级的时候也可以吧
> 除此之外就是叶子节点的md文件确实应该本地保存一下
> 后续可能确实要上线，不过上线以read为主，对, edit工作全都是在本地
>
> SQLite上线要弄subspace, 我感觉这个比较麻烦，所以也是在考虑是否本地弄一下就可以
> 当然麻烦与否并不是主要的，嗯，再想想
>
> 嗯... 让我想想，有个很简单的办法, 本地数据库和json文件之间创建一个同步模块，这样，静态上线很方便，然后本地CRUD也方便
>
> 用Postgres SQL
>
> 让我想想，最好是可以双向同步，而且我觉得这完全可以做到啊。到时候做的时候尽量单向就可以了
>
> OK

**修改时间**: 2026-02-07 12:33:26

## 概述

落地“本地 PostgreSQL + 本地 Markdown + 静态 read-model.json 发布”基础架构，先实现单向同步闭环，并为后续双向同步预留数据结构与脚本接口。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/package.json` | 修改 | 2026-02-07 12:28:35 | 增加知识库同步脚本命令（bootstrap / export-md / sync） |
| `web/package-lock.json` | 修改 | 2026-02-07 12:26:49 | 新增 `pg` 依赖锁定 |
| `web/tsconfig.json` | 修改 | 2026-02-07 12:28:40 | 启用 `resolveJsonModule` 支持读取 read-model JSON |
| `web/src/data/knowledge-tree.ts` | 修改 | 2026-02-07 12:28:55 | 从静态只读 `read-model.json` 读取知识树 |
| `web/src/data/read-model.json` | 新增 | 2026-02-07 12:32:28 | 初始只读发布模型（由旧树数据 bootstrap） |
| `web/src/components/KnowledgeGraph.tsx` | 修改 | 2026-02-07 12:29:13 | 详情面板展示叶子节点 `docPath`，便于本地编辑定位 |
| `web/tools/knowledge-sync/sql/001_init.sql` | 新增 | 2026-02-07 12:27:23 | PostgreSQL 节点/依赖表初始化脚本 |
| `web/tools/knowledge-sync/scripts/bootstrap-read-model-from-legacy-tree.mjs` | 新增 | 2026-02-07 12:32:23 | 从旧版数据或既有 read-model 生成初始 `read-model.json` |
| `web/tools/knowledge-sync/scripts/export-leaf-markdown.mjs` | 新增 | 2026-02-07 12:27:50 | 叶子节点 Markdown 批量初始化脚本 |
| `web/tools/knowledge-sync/scripts/sync-read-model.mjs` | 新增 | 2026-02-07 12:28:17 | `PostgreSQL + Markdown -> read-model.json` 同步脚本 |
| `web/tools/knowledge-sync/README.md` | 新增 | 2026-02-07 12:28:29 | 同步模块的业务说明与使用流程 |
| `docs/knowledge/**/*.md` (62 files) | 新增 | 2026-02-07 12:28:48 | 叶子节点本地 Markdown 文档落盘 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 12:31:41 | 同步新增模块、目录、依赖与命令 |
| `docs/dev_logs/2026-02-07/07-postgres-markdown-read-model-sync.md` | 新增 | 2026-02-07 12:33:26 | 记录本轮开发内容与验证结果 |

## 具体变更描述

### 方案

1. 数据分层
- 本地编辑层：PostgreSQL（结构）+ Markdown（叶子正文）
- 发布层：`web/src/data/read-model.json`（线上只读）

2. 同步能力
- `knowledge:bootstrap`：从旧数据一次性迁移到 `read-model.json`
- `knowledge:export-md`：批量生成叶子 Markdown 档案
- `knowledge:sync`：从 PostgreSQL + Markdown 生成最新 read-model

3. 兼容与迁移
- 前端读取层切换为 `read-model.json`，保持现有 UI 与测试行为不变
- 叶子节点补充 `docPath` 字段，建立图节点到本地文档的可追溯路径

### 影响范围

- 受影响模块：数据读取层、知识图谱详情层、知识同步工具链
- 业务收益：
  - 本地 CRUD 效率提升（结构化库 + 文档化正文）
  - 上线发布成本降低（静态只读 JSON）
  - 后续双向同步具备落地基础（表结构 + 脚本框架）

## 验证结果

- ✔ `cd web && npm run knowledge:bootstrap` 通过（生成 `read-model.json`，叶子 62）
- ✔ `cd web && npm run knowledge:export-md` 通过（新增 62 个 Markdown）
- ✔ `bash scripts/check_errors.sh` 通过（依赖 / TypeScript / ESLint / Vite build）
- ✔ `cd web && npm run test` 通过（6/6）
- ✔ `cd web && timeout 20s npm run dev -- --host 127.0.0.1 --port 4173` 启动成功（Vite ready）
- ℹ `knowledge:sync` 依赖本地 `DATABASE_URL`，本次未连接实际 PostgreSQL 实例进行线上数据回归
