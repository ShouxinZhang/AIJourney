## 对话记录

### 第 1 轮
- 背景: 已有 review 脚本链路与 Skill 编排，用户要求把能力进一步 MCP 化并自动跑通。
- 用户:
  > OK. 添加这些MCP，然后你自主跑一次
- 用户的意图解析: 要求把 review 能力封装为可调用的 MCP tools，并由 Agent 自主完成一次端到端验证。
- LLM思考摘要: 复用现有脚本，新增 `review-pipeline` MCP server，暴露 `review_collect_context / review_dependency_gate / review_validate_llm / review_run`，随后用 MCP client 发起真实调用做 smoke test。

### 第 2 轮
- 背景: 执行过程中发现 `web/src/data/read-model.json` 发生非目标变更（仅 generatedAt 时间戳变化）。
- 用户:
  > 保留这个变更，继续完成本次 MCP 交付
- 用户的意图解析: 明确接受该文件变更，要求继续推进交付，不做回滚。
- LLM思考摘要: 按用户决策保留该变更，继续完成 MCP 接入、架构文档同步、质量验证和开发日志闭环。

**修改时间**: 2026-02-07 17:45:10

## 概述
新增 `review-pipeline` MCP Server，并完成本地配置接入与真实工具调用验证，使 review 链路可被 LLM 以标准 MCP tools 调用；同时保留 `read-model.json` 时间戳更新。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `scripts/review/mcp-server.mjs` | 新增 | 2026-02-07 17:40:24 | 新增 review MCP server，暴露 4 个工具 |
| `.vscode/mcp.json` | 修改（本地） | 2026-02-07 17:40:30 | 新增 `review-pipeline` MCP server 配置 |
| `scripts/review/README.md` | 修改 | 2026-02-07 17:43:30 | 补充 MCP tools 与本地启动方式 |
| `package.json` | 修改 | 2026-02-07 17:39:26 | 新增 root devDependencies（MCP SDK + zod） |
| `package-lock.json` | 修改 | 2026-02-07 17:39:26 | 同步依赖锁文件 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 17:43:14 | 增加 `scripts/review/mcp-server.mjs` 元数据描述 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 17:44:36 | 同步 MCP 技术栈与本地 MCP 启动命令 |
| `web/src/data/read-model.json` | 修改（保留） | 2026-02-07 17:39:09 | `meta.generatedAt` 时间戳更新（用户确认保留） |
| `docs/dev_logs/2026-02-07/30-add-review-mcp-tools.md` | 新增 | 2026-02-07 17:45:10 | 本轮开发日志 |

## 具体变更描述

### 问题
- Review 能力此前仅脚本化，可本地运行，但未 MCP 化，LLM 无法通过标准 Tool 协议直接调用。
- 缺少“工具化调用”验证链路，无法确认在 MCP 客户端上下文中的稳定性。

### 方案
- 新增 `scripts/review/mcp-server.mjs`，基于 `@modelcontextprotocol/sdk` 提供以下 tools：
  - `review_collect_context`
  - `review_dependency_gate`
  - `review_validate_llm`
  - `review_run`
- 在 `.vscode/mcp.json` 注册 `review-pipeline` server（stdio）。
- 通过 Node 版 MCP client 发起真实 `review_run` / `review_validate_llm` 调用，验证返回结果与退出状态。
- 将 MCP 能力同步到架构文档与元数据，保证可追溯。

### 影响范围
- 新增能力集中在 `scripts/review/` 与本地 MCP 配置，不影响业务功能逻辑。
- 评审链路从“脚本可执行”升级为“脚本 + MCP 双入口可执行”，便于后续 Agent 编排。
- `web/src/data/read-model.json` 时间戳变化已按用户指令保留。

## 验证结果
- ✔ MCP server 启动验证：`timeout 3s node scripts/review/mcp-server.mjs` 正常启动
- ✔ MCP client 调用 `review_run`：返回 `status: PASS`，工具调用成功
- ✔ MCP client 调用 `review_validate_llm`：返回 `status: HUMAN_REQUIRED`（无输入报告，符合预期）
- ✔ `bash scripts/check_errors.sh` 通过（TypeScript / ESLint / Vite Build）
- ✔ `cd web && npm run test` 通过（1 文件 / 6 用例）
- ✔ `cd web && timeout 20s npm run dev` 启动成功（端口占用时自动切换到 5174）

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮未执行提交）
- tag: `checkpoint/2026-02-07-review-mcp`
- backup branch: `backup/2026-02-07-review-mcp`
