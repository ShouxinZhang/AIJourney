## 对话记录

### 第 1 轮
- 背景: review-pipeline MCP 已落地，但 Skill 文档仍偏脚本导向。
- 用户:
  > MCP工具的使用没有写入SKills文档里似乎
- 用户的意图解析: 用户指出文档缺口，要求把 MCP 工具使用方式正式写入 Skills，确保后续可执行。
- LLM思考摘要: 先确认缺口范围，再给出精确改动清单（总 Skill + 子 Skill），补齐 MCP 映射、参数与 fallback 规范。

### 第 2 轮
- 背景: 方案对齐完成。
- 用户:
  > OK
- 用户的意图解析: 用户确认按提案执行文档修复。
- LLM思考摘要: 直接编辑 6 个 Skill 文档并做一致性校验，最后补开发日志闭环。

**修改时间**: 2026-02-07 17:54:30

## 概述
为 `dependency-review-system` Skill 体系补齐 MCP 使用规范，明确“优先 MCP、脚本 fallback”的执行策略，并把每个子 Skill 对应到具体 `review_*` 工具与参数。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/dependency-review-system/SKILL.md` | 修改 | 2026-02-07 17:53:32 | 新增 MCP 映射表、调用顺序、最小调用示例与执行策略 |
| `.agents/skills/dependency-review-system/subskills/collect-context.md` | 修改 | 2026-02-07 17:53:40 | 新增 `review_collect_context` 使用说明与参数 |
| `.agents/skills/dependency-review-system/subskills/dependency-guard.md` | 修改 | 2026-02-07 17:53:47 | 新增 `review_dependency_gate` 使用说明与判定字段 |
| `.agents/skills/dependency-review-system/subskills/risk-analyzer.md` | 修改 | 2026-02-07 17:53:56 | 新增 `review_validate_llm` 使用说明与关键输出 |
| `.agents/skills/dependency-review-system/subskills/test-gap-mapper.md` | 修改 | 2026-02-07 17:54:04 | 明确由 `review_validate_llm` 输出的 `parsed.advisories` 驱动补测 |
| `.agents/skills/dependency-review-system/subskills/decision-gate.md` | 修改 | 2026-02-07 17:54:11 | 新增 `review_run` 参数、退出语义与 fallback |
| `docs/dev_logs/2026-02-07/31-add-mcp-usage-to-review-skills.md` | 新增 | 2026-02-07 17:54:30 | 本轮开发日志 |

## 具体变更描述

### 问题
- Skill 文档缺少 MCP tools 的映射和调用规范，执行层容易回落到“只知道脚本，不知道工具”的状态。

### 方案
- 在总 Skill 中补齐：
  - MCP 优先策略
  - 子 Skill -> MCP Tool 映射表
  - 推荐调用顺序与最简调用模式
  - 最小调用示例
- 在子 Skill 中补齐：
  - 对应 MCP tool 名称
  - 关键参数
  - 关键输出字段（适用时）
  - fallback 脚本

### 影响范围
- 仅文档层改动，无业务逻辑和脚本行为变化。
- 直接提升后续 Agent 执行一致性，减少“工具存在但文档不可操作”的偏差。

## 验证结果
- ✔ `rg -n "review_collect_context|review_dependency_gate|review_validate_llm|review_run" .agents/skills/dependency-review-system -S` 命中全部目标文档
- ✔ 人工检查 `SKILL.md`：已包含 MCP 映射表、推荐顺序与最小示例
- ✔ 各子 Skill 文档已包含 MCP tool 与 fallback 说明

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮未执行提交）
- tag: `checkpoint/2026-02-07-review-mcp`
- backup branch: `backup/2026-02-07-review-mcp`
