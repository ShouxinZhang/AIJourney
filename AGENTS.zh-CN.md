# Repo Agent Instructions（中文审核版）

## 语言与沟通

- 用户使用中文；所有文档、日志与解释默认使用中文。
- 面向业务结果表达：说明功能价值、收益、风险与影响范围。

## 核心工程规则

- 优先级：业务结果 > 长期架构 > 风格简洁。
- 先读现有代码，减少重复建设。
- 变更保持最小化，不做未授权的扩展规划。
- 遵循模块化设计，实验性内容必须收敛在单一子模块，避免跨模块污染。
- 新增业务代码必须放在叶子目录，禁止放在仓库根目录或高层模块目录。

## Skills 强制流程

每次开发任务默认遵循 `local-dev-workflow`，并按触发条件使用下列 Skills：

- `build-check`：任何代码改动后执行质量门禁（构建/类型/规范检查）。
- `dev-logs`：每次开发周期结束后记录 `docs/dev_logs/`。
- `repo-structure-sync`：出现文件/目录新增、删除、移动，或 npm 依赖、scripts 变化时执行。
- `knowledge-tree-update`：仅在编辑 `web/src/data/knowledge-tree.ts` 时执行。
- `git-management`：出现阶段性成果或准备进行大改动时，调用该 Skill 执行 Git 保护点与提交节奏。

如果用户显式指定某个 Skill（如 `$build-check`），必须优先使用。

## 人类意图对齐

- 在任何代码变更前，必须先与用户对齐实现意图，并明确三项内容：
  - 修改/新增哪些文件
  - 核心实现思路
  - 影响范围与风险
- 仅在用户明确确认后开始执行改动。

## 变更前必做项

- 每次改动前先阅读 `AGENTS.md`。
- 架构上下文获取策略：
  - 优先使用 MCP 工具按目标模块读取说明，可直接到达叶子节点（按需最小读取）。
  - 当变更范围不清晰、MCP 不可用或涉及跨模块评估时，再阅读 `docs/architecture/repository-structure.md` 作为兜底。
- 任何删除或回滚操作前必须先做备份。

## 质量与验证

- 前端代码改动后，至少执行：
  - `cd web && npm run lint`
  - `cd web && npm run dev`（检查是否有错误输出）
- 按任务需要补充执行：
  - `bash scripts/check_errors.sh`
  - `cd web && npm run test`
- 严禁未验证即交付。

## 文档与可追溯性

- 仓库架构文档 `docs/architecture/repository-structure.md` 必须与实际结构保持同步。
- 每次开发周期必须记录开发日志到 `docs/dev_logs/{YYYY-MM-DD}/`，文件名按序号递增。
- 日志必须包含：用户原始 Prompt、精确到秒的修改时间、文件清单、变更说明、验证结果。

## 自动化与版本策略

- 凡是可自动化的步骤必须自动完成，不把可执行工作转交给用户手工处理。
- 安装 SDK 或 Python 包时，默认使用在线可验证的最新稳定版本，避免陈旧版本引入兼容性问题。

## 禁止行为

- 不做检查与测试直接提交代码。
- 完成开发后不写 `dev_logs`。
- 结构变化后不更新 `repository-structure.md`。
- 把可脚本化工作推给用户手工执行。
- 明知版本过旧仍安装过时 SDK/依赖。
