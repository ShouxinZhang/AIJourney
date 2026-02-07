## 对话记录

> 3,4需要修改
> 关于1，我还没想好应该怎么办，我个人认为应该维护一个被gitignore的隐私信息模块，然后开发日志指向隐私信息模块，由于隐私信息比较少，这也方便后续使用的时候快速定位
>
> Skills需要修改一下

**LLM**: 已按你的要求完成 Skill 层改造：修复流程口径不一致（MCP 优先 + Git 管理接管）、补齐日志 Git 锚点规范，并新增本地隐私信息模块 `docs/private_context/`（日志使用 `privacy_ref` 引用，不写明文敏感信息）。

**修改时间**: 2026-02-07 15:28:43

## 概述

将日志与流程规范升级为“可追溯 + 隐私隔离”模式，提升后续 LLM 快速定位关键事实的效率，同时降低敏感信息外泄风险。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/local-dev-workflow/SKILL.md` | 修改 | 2026-02-07 15:28:11 | Step1 改为 MCP 叶子节点优先读取；Step8 改为调用 `git-management`；要求日志回写 Git 锚点 |
| `.agents/skills/dev-logs/SKILL.md` | 修改 | 2026-02-07 15:26:50 | 新增“Git 锚点”与“隐私信息引用”必填规范，禁止日志写明文敏感信息 |
| `.agents/skills/git-management/SKILL.md` | 修改 | 2026-02-07 15:26:59 | 新增提交后提取 branch/commit 以及回写开发日志的强制步骤 |
| `docs/private_context/.gitignore` | 新增 | 2026-02-07 15:27:08 | 隐私模块默认忽略全部，仅保留规范文件 |
| `docs/private_context/README.md` | 新增 | 2026-02-07 15:27:08 | 定义 `privacy_ref` 使用方式与本地隐私文件存放规则 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 15:28:06 | 同步 Skill 与 `docs/private_context` 元数据描述 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 15:28:06 | 目录树新增 `docs/private_context/` 模块说明 |
| `docs/dev_logs/2026-02-07/23-skill-sync-git-anchor-and-privacy-ref.md` | 新增 | 2026-02-07 15:28:43 | 记录本轮流程与隐私规范升级 |

## 具体变更描述

### 问题

- `local-dev-workflow` 与 `AGENTS` 在“架构上下文读取”和“Git 管理策略”口径不一致。
- 开发日志缺少统一的 Git 锚点字段，不利于快速定位到对应代码版本。
- 日志中可能出现敏感连接信息明文，存在泄露与复用风险。

### 方案

1. Skill 口径对齐
- `local-dev-workflow`：将 Step1 改为“AGENTS 必读 + MCP 目标模块优先读取 + 架构文档兜底”。
- 将 Step8 从“Git 提交”升级为“Git 管理”，统一调用 `git-management`。

2. 追溯锚点增强
- `dev-logs` 增加 `## Git 锚点` 要求（branch / commit / tag）。
- `git-management` 强制提交后提取并回写 Git 锚点。

3. 隐私隔离机制
- 新增 `docs/private_context/` 本地隐私模块。
- 日志只允许写 `privacy_ref`，敏感明文写入本地私有文件并被忽略。

### 影响范围

- 业务收益：后续 LLM 可更快定位“日志 -> 代码版本 -> 变更原因”链路。
- 风险控制：敏感信息不再直接出现在开发日志，降低泄露风险。
- 管理收益：流程规则统一，减少执行偏差。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（依赖检查 / TypeScript / ESLint / Vite Build 全通过）

## Git 锚点

- branch: `N/A`
- commit: `N/A`
- tag: `N/A`
- 说明: 本轮按你的要求仅修改 Skills 与文档规范，未执行提交流程。
