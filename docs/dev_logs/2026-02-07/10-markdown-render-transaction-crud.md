## 对话记录

> 把“在线阅读”从纯文本升级为真正 Markdown 渲染（标题/列表/代码块样式）。
> 把 CRUD 做成更完整的“节点+文档一致性事务”（创建节点自动建文档、删除节点自动归档文档）。

**LLM**: 已将在线阅读切换为 Markdown 渲染链路，并完成节点 CRUD 的一致性事务能力（创建自动建文档、删除自动归档）。本轮补齐了类型修复、事务实测和全链路质量验证。

**修改时间**: 2026-02-07 13:32:21

## 概述

完成“在线阅读 Markdown 化 + 节点文档一致性事务”收口：用户在线可读体验升级，节点生命周期与文档生命周期自动对齐，降低知识库运维风险。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/components/KnowledgeGraph.tsx` | 修改 | 2026-02-07 13:31:05 | 修复 `react-markdown` 类型问题，改为外层容器承载 Markdown 样式 |
| `web/src/data/read-model.json` | 修改 | 2026-02-07 13:31:38 | 重新发布只读模型，确保在线阅读内容为最新同步结果 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 13:31:57 | 同步 `_archive` 归档目录与 `react-markdown` 依赖说明 |
| `docs/knowledge/_archive/2026-02-07T05-30-47-921Z-30e649/vibe-coding/tx-test-1770442247.md` | 新增 | 2026-02-07 13:30:47 | 事务实测产生的归档文档证据（删除节点后自动归档） |
| `docs/dev_logs/2026-02-07/10-markdown-render-transaction-crud.md` | 新增 | 2026-02-07 13:32:21 | 记录本轮功能收口与验证结论 |

## 具体变更描述

### 问题

- 在线阅读之前为纯文本呈现，管理层视角下“可读性与可审阅性”不足。
- CRUD 如果只改节点不联动文档，容易出现“结构已删、文档遗留”的资产不一致问题。

### 方案

1. 在线阅读升级为 Markdown 渲染
- 前端详情面板使用 `react-markdown` 渲染正文。
- 标题、列表、行内代码、代码块统一纳入 `.knowledge-markdown` 样式体系。

2. 节点+文档一致性事务落地
- 创建节点：自动按 `doc_path` 生成 Markdown 文档模板。
- 删除节点：删除 DB 前先把子树文档整体迁移到 `docs/knowledge/_archive/<txid>/...`，失败则补偿恢复。

3. 工程质量修复
- 修复 `react-markdown@10` 不支持组件 `className` prop 的类型错误，改为外层容器挂载样式类。

### 影响范围

- 业务收益：在线阅读体验从“原始文本”升级为“结构化文档阅读”，便于内容评审与培训。
- 运维收益：节点生命周期与文档生命周期绑定，减少误删与脏数据问题。
- 发布收益：本地编辑/数据库同步/静态只读发布链路保持一致，适合后续线上只读扩展。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run test` 通过（6/6）
- ✔ `cd web && timeout 20s npm run dev -- --host 127.0.0.1 --port 4173` 启动成功
- ✔ `cd web && DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/ai_journey?sslmode=disable' npm run knowledge:sync-md-to-db` 通过（更新 0，跳过 62）
- ✔ `cd web && DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/ai_journey?sslmode=disable' npm run knowledge:publish-read` 通过（节点 80，关系 0）
- ✔ 事务实测通过：
  - 创建：`knowledge:node -- create --id tx-test-1770442247 --parent-id vibe-coding` 自动生成 `docs/knowledge/vibe-coding/tx-test-1770442247.md`
  - 删除：`knowledge:node -- delete --id tx-test-1770442247` 自动归档到 `docs/knowledge/_archive/2026-02-07T05-30-47-921Z-30e649/vibe-coding/tx-test-1770442247.md`
