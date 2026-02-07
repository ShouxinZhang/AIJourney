## 对话记录

### 第 1 轮
- 背景: 用户正在规划“LLM 主导、人工兜底”的 Review 体系，希望强调依赖关系治理。
- 用户:
  > 专职Agent用Skills落地，就是，到时候放在一个大的依赖关系Skills模块里的子Skills就可以了
  > 然后机械门禁用脚本实现
  > 其余的话考虑MCP
  > 对，然后就是最好还是流程尽可能比较简单吧，但是机械review的部分，越是严格越好
  > 再想想
- 用户的意图解析: 要求把评审方案从概念转成工程实现，流程保持简洁，但机械规则必须严格可阻断。
- LLM思考摘要: 采用“父 Skill + 子 Skill 文档 + 一键脚本门禁 + 结构化结果文件”的最小可运行方案，并保留 MCP 对接位。

### 第 2 轮
- 背景: 方案达成一致，进入实施确认。
- 用户:
  > OK. Build this
- 用户的意图解析: 明确授权立即编码落地，不再停留在讨论。
- LLM思考摘要: 按本仓库 SOP 执行：先做 Git 保护点，再新增 review 基建、跑质量门禁、同步架构文档、补开发日志。

**修改时间**: 2026-02-07 16:31:25

## 概述
新增“依赖关系优先”的自动化 Review 基建：通过一个父 Skill 组织 5 个子 Skill，并用脚本实现严格机械门禁（构建/测试/依赖规则）+ LLM 报告校验，输出统一 `PASS/BLOCK/HUMAN` 结论。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/dependency-review-system/SKILL.md` | 新增 | 2026-02-07 16:27:13 | 依赖评审总 Skill 定义与执行入口 |
| `.agents/skills/dependency-review-system/subskills/collect-context.md` | 新增 | 2026-02-07 16:27:13 | 上下文采集子 Skill |
| `.agents/skills/dependency-review-system/subskills/dependency-guard.md` | 新增 | 2026-02-07 16:27:13 | 依赖门禁子 Skill |
| `.agents/skills/dependency-review-system/subskills/risk-analyzer.md` | 新增 | 2026-02-07 16:27:13 | LLM 风险分析子 Skill |
| `.agents/skills/dependency-review-system/subskills/test-gap-mapper.md` | 新增 | 2026-02-07 16:27:13 | 测试缺口映射子 Skill |
| `.agents/skills/dependency-review-system/subskills/decision-gate.md` | 新增 | 2026-02-07 16:27:13 | 统一裁决子 Skill |
| `scripts/review/README.md` | 新增 | 2026-02-07 16:27:13 | Review 流水线使用说明 |
| `scripts/review/config/policy.json` | 新增 | 2026-02-07 16:27:13 | 门禁阈值与分层依赖策略 |
| `scripts/review/input/.gitkeep` | 新增 | 2026-02-07 16:27:13 | LLM 报告输入目录占位 |
| `scripts/review/run.sh` | 新增 | 2026-02-07 16:27:13 | 一键执行入口 |
| `scripts/review/scripts/collect-context.mjs` | 新增 | 2026-02-07 16:27:13 | 变更上下文采集脚本 |
| `scripts/review/scripts/dependency-gate.mjs` | 新增 | 2026-02-07 16:27:13 | 基于 madge 的依赖门禁脚本 |
| `scripts/review/scripts/validate-llm-report.mjs` | 新增 | 2026-02-07 16:27:13 | LLM 风险报告校验脚本 |
| `scripts/review/scripts/run-review.mjs` | 新增 | 2026-02-07 16:32:44 | Review 总编排脚本（支持 `--allow-human` 放行） |
| `scripts/review/templates/llm-review.template.json` | 新增 | 2026-02-07 16:27:13 | LLM 风险报告模板 |
| `.gitignore` | 修改 | 2026-02-07 16:27:29 | 忽略 review artifacts 产物 |
| `package.json` | 修改 | 2026-02-07 16:27:24 | 新增 `npm run review` 入口 |
| `package-lock.json` | 修改 | 2026-02-07 16:28:04 | 同步 workspace 依赖锁文件 |
| `web/package.json` | 修改 | 2026-02-07 16:24:29 | 新增 `madge` 开发依赖 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 16:30:34 | 新增 review 基建路径元数据描述 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 16:30:49 | 同步目录树、技能列表、命令与技术栈 |
| `docs/dev_logs/2026-02-07/29-build-dependency-review-system.md` | 新增 | 2026-02-07 16:31:25 | 本轮开发日志 |

## 具体变更描述

### 问题
- 现有评审链路缺少“可执行依赖关系门禁”，无法稳定阻断“修这边坏那边”的跨模块回归。
- LLM 输出缺乏统一结构与可机读结果，不利于接入 CI 和人工裁决分流。

### 方案
- 新增 `dependency-review-system` 父 Skill，内部定义 5 个子 Skill 职责边界。
- 新增 `scripts/review/` 评审脚本链路：
  - `collect-context` 收集改动上下文
  - `dependency-gate` 检查循环依赖 + 分层禁边 + 跨 feature 规则
  - `validate-llm-report` 校验结构化 LLM 报告
  - `run-review` 统一编排并产出 `review-result.json`
- 策略文件 `policy.json` 设定严格阈值：循环依赖与禁边均为 0。
- 默认严格返回码：`PASS=0`，`BLOCK/HUMAN=非0`，可直接做 CI 阻断。
- 增加 `--allow-human` 选项，便于在“仅人工复核”场景下临时放行流水线。

### 影响范围
- 新增基建集中在 `.agents/skills/dependency-review-system/` 与 `scripts/review/`，不修改业务功能代码。
- 影响开发流程：新增统一命令 `npm run review`，可在本地或 CI 直接执行。
- 风险: 当前未提供 LLM 报告时会返回 `HUMAN`（严格模式下退出非 0），需要在 CI 上配置 LLM 报告输入或人工裁决分支。

## 验证结果
- ✔ `bash scripts/check_errors.sh` 通过（TSC + ESLint + Vite Build）
- ✔ `cd web && npm run test` 通过（1 文件 / 6 用例）
- ✔ `cd web && npm run lint` 通过
- ✔ `cd web && timeout 20s npm run dev` 成功启动（Vite ready，未见 runtime error）
- ✔ `bash scripts/review/run.sh` 在无 LLM 报告时输出 `HUMAN`（符合严格策略）
- ✔ `bash scripts/review/run.sh --llm-report /tmp/llm-pass.json` 输出 `PASS`
- ✔ `bash scripts/review/run.sh --allow-human` 在 `HUMAN` 状态下返回 0（用于人工复核放行）

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮未执行提交）
- tag: `checkpoint/2026-02-07-review-orchestrator`
- backup branch: `backup/2026-02-07-review-orchestrator`
