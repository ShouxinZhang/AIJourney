# 14 - repo-metadata MCP Server

## 对话记录

> 对对，那么目前所有叶子节点都有说明了吗？你能读取吗？对了，我们是否开发了方便的MCP工具方便LLM CRUD?

**LLM**: 确认 72 条全部有描述可正常读取。当前没有 MCP 工具，只有 CLI 脚本。提议开发包含 8 个 Tools 的 MCP Server。

> 嗯，开发一个MCP脚本工具，以及Skills

**LLM**: 实现了完整的 repo-metadata MCP Server，包含 8 个 Tools，配置了 VS Code MCP 连接，升级 Skill 到 v3。

## 修改时间

**修改时间**: 2026-02-07 14:27:24

## 概述

构建了 repo-metadata MCP Server，让 LLM 可以直接通过结构化 MCP Tools 操作仓库元数据，无需拼终端命令。同时升级 repo-structure-sync Skill 到 v3（MCP 优先，CLI 后备）。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `scripts/repo-metadata/mcp-server.mjs` | 新增 | 2026-02-07 14:25:00 | MCP Server 主文件（8 个 Tools, stdio） |
| `scripts/repo-metadata/package.json` | 修改 | 2026-02-07 14:24:30 | 新增 @modelcontextprotocol/sdk + zod 依赖 |
| `.vscode/mcp.json` | 新增 | 2026-02-07 14:25:30 | VS Code MCP 连接配置 |
| `.agents/skills/repo-structure-sync/SKILL.md` | 修改 | 2026-02-07 14:26:00 | 升级到 v3，MCP 优先，CLI 后备 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 14:27:00 | 新增 mcp-server.mjs 条目（73 节点） |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 14:27:10 | 重新生成目录树 |

## 具体变更描述

### 新增: MCP Server (`mcp-server.mjs`)

基于 `@modelcontextprotocol/sdk` v1.26.0 构建，使用 stdio 传输协议（VS Code Copilot 标准集成方式）。

**8 个 MCP Tools:**

| Tool | 功能 |
|------|------|
| `repo_metadata_scan` | 扫描目录变化，可选自动更新 JSON |
| `repo_metadata_get` | 获取单条元数据详情 |
| `repo_metadata_set` | 设置/更新描述、标签等 |
| `repo_metadata_batch_set` | 批量补写描述（LLM 核心使用场景） |
| `repo_metadata_list` | 列出/查询条目（支持类型/标签/深度/未描述过滤） |
| `repo_metadata_delete` | 删除条目（级联删除子路径） |
| `repo_metadata_generate_md` | 生成/更新 repository-structure.md |
| `repo_metadata_sync_db` | JSON ⇄ PG 双向同步 |

**技术实现:**
- 所有核心逻辑（scan、tree building、MD generation）内联在 server 文件中，不依赖外部 CLI 脚本
- PG 连接使用动态 import，scan/crud/generate 功能无需 PG 也能工作
- Zod schema 定义所有入参，提供类型安全和参数描述

### VS Code 集成

创建 `.vscode/mcp.json` 配置 stdio 连接，DATABASE_URL 直接内置。VS Code 重启后 Copilot 即可发现并调用这些 MCP Tools。

### Skill 升级 v2 → v3

`repo-structure-sync` Skill 从 CLI 命令模式升级为 MCP Tools 优先模式，保留 CLI 作为后备方案。

## 验证结果

- ✔ TypeScript 类型检查通过
- ✔ ESLint 代码规范通过
- ✔ Vite 生产构建通过
- ✔ MCP Server initialize 握手成功
- ✔ PG 同步成功（73 条记录）
- ✔ 架构文档已更新
