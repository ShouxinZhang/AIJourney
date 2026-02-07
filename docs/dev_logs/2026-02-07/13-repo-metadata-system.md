# 13 - 仓库元数据管理系统 (repo-metadata)

## 对话记录

> 关于目前的仓库架构，其实我觉得这种目录结构不太科学。就是，我个人很早就有规范的文档目录结构管理系统的开发想法，不过开发了一段时间，又搁置了。新的想法是，应该有一个方便的CRUD系统用于管理目录以及其说明，还有一个扫描脚本，用于扫描要进行说明的文件夹。对，这个想法还是比较模糊，我也还没有太想好

**LLM**: 提出了 4 个关键设计问题：描述数据存放位置、粒度、输出形式、交互方式，请用户确认方向。

> 1. 应该是集中管理，每个目录下都存放我觉得还是不太可能
> 2. 粒度应该是BFS或者DFS自适应的，嗯，对，其实是优先看用户想法，如果用户不说的话，我个人认为默认到叶子节点
> 3. 最终我认为repository-structure.md只需要到第二层就可以了，这个和数据库其实类似类似, 而更为核心的数据，储存在json文件里 (抱歉，我觉得有一个workspace级别的数据库或许也很好？)
> 4. 交互方式，显然文档这种东西不可能由人手动来写，我认为应该是MCP + Skills，然后让LLM来写。当然，最好是人也有精细修改的办法

**LLM**: 设计了完整方案：repo-metadata 系统，包含 scan（扫描器）、crud（CRUD）、sync（PG双向同步）、generate（生成MD），JSON 为主、PG 可选。先 JSON 起步，PG 做可选同步。

> JSON和PostgreSQL同步就可以了，这个我们仓库已经有类似实现了，你看看研究一下

**LLM**: 研究了现有 knowledge-sync 模块的完整架构（PG + MD → JSON read-model 单向同步），提出复用同一模式、区别仅在业务领域的方案。

> OK, Build it

**LLM**: 实现了完整的 repo-metadata 系统。

## 修改时间

**修改时间**: 2026-02-07 14:12:21

## 概述

构建了仓库元数据管理系统 (repo-metadata)，实现自动扫描目录结构、CRUD 描述信息、PG 双向同步、自动生成架构文档，取代原来手工维护 repository-structure.md 的方式。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `scripts/repo-metadata/package.json` | 新增 | 2026-02-07 14:08:00 | repo-metadata 模块依赖管理（pg） |
| `scripts/repo-metadata/README.md` | 新增 | 2026-02-07 14:08:30 | 使用说明文档 |
| `scripts/repo-metadata/sql/001_init.sql` | 新增 | 2026-02-07 14:08:00 | PostgreSQL repo_metadata_nodes 表初始化脚本 |
| `scripts/repo-metadata/scripts/scan.mjs` | 新增 | 2026-02-07 14:08:10 | 目录结构扫描器（git ls-files + JSON 对比） |
| `scripts/repo-metadata/scripts/crud.mjs` | 新增 | 2026-02-07 14:08:15 | 元数据 CRUD（get/set/delete/list/batch-set） |
| `scripts/repo-metadata/scripts/sync-json-to-postgres.mjs` | 新增 | 2026-02-07 14:08:20 | JSON → PG 全量 upsert 同步 |
| `scripts/repo-metadata/scripts/sync-to-json.mjs` | 新增 | 2026-02-07 14:08:25 | PG → JSON 同步 |
| `scripts/repo-metadata/scripts/generate-structure-md.mjs` | 新增 | 2026-02-07 14:08:30 | JSON → repository-structure.md 目录树自动生成 |
| `docs/architecture/repo-metadata.json` | 新增 | 2026-02-07 14:09:00 | 仓库结构元数据文件（72 个节点，全部已描述） |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 14:11:00 | 添加 REPO-TREE-START/END 标记，目录树自动生成，新增 repo: 命令 |
| `web/package.json` | 修改 | 2026-02-07 14:10:00 | 添加 6 个 repo: npm scripts |
| `.agents/skills/repo-structure-sync/SKILL.md` | 修改 | 2026-02-07 14:10:30 | 升级为 v2，基于 repo-metadata 自动化流程 |

## 具体变更描述

### 新模块: scripts/repo-metadata/

基于已有 `knowledge-sync` 模块的架构模式（PG + 本地文件 → JSON），构建了仓库级别的元数据管理系统：

**核心脚本:**
- `scan.mjs` — 使用 `git ls-files` 扫描所有已跟踪文件，对比 `repo-metadata.json` 报告新增/删除/未描述条目。支持 `--max-depth` 深度限制和 `--update` 自动更新。内置 glob ignore 引擎，通过 JSON config 配置忽略规则。
- `crud.mjs` — 对 JSON 直接操作的 CRUD，支持 `get/set/delete/list/batch-set`。`batch-set` 通过 stdin 接收 JSON 数组，方便 LLM 批量补写描述。
- `generate-structure-md.mjs` — 从 JSON 构建嵌套树，渲染 ASCII 目录树（默认 2 层），替换 `repository-structure.md` 中标记区域的内容。

**PG 同步脚本（可选）:**
- `sync-json-to-postgres.mjs` — JSON → PG 全量 upsert，按路径深度排序确保父路径先插入
- `sync-to-json.mjs` — PG → JSON，保留现有 config

**数据模型:**
- JSON 扁平结构: `{ path → { type, description, detail, tags, updatedBy, updatedAt } }`
- PG 表: `repo_metadata_nodes`，支持 parent_path FK 级联删除

### 配置系统

`repo-metadata.json` 的 `config.scanIgnore` 字段控制忽略规则，当前配置忽略:
- `docs/dev_logs/**` — 开发日志（由 dev-logs skill 管理）
- `docs/knowledge/**/*.md` — 知识文档（由 knowledge-sync 管理）
- `.vite`, `.vscode` — IDE/构建缓存
- `web/package-lock.json` — 生成文件

### Skill 升级

`repo-structure-sync` skill 从 v1（手动编辑 MD）升级为 v2（scan → batch-set → generate-md 自动化链路）。

## 验证结果

- ✔ TypeScript 类型检查通过
- ✔ ESLint 代码规范通过
- ✔ Vite 生产构建通过
- ✔ scan.mjs 首次扫描成功（131 → 72 节点，过滤噪音路径）
- ✔ batch-set 批量写入 72 条描述成功
- ✔ generate-structure-md 自动生成目录树成功
- ✔ 最终 scan 验证: 0 new, 0 removed, 0 undescribed
