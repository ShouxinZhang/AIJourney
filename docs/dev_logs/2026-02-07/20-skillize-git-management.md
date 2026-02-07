## 对话记录

> 嗯，挺好的，不过这个有点太占Token了，储存到Skills里面吧。然后agents里添加一句就可以了

**LLM**: 已将 Git 管理细则下沉为独立 `git-management` Skill，并在 `AGENTS` 中仅保留一条触发说明，降低主规范 token 占用。

**修改时间**: 2026-02-07 15:08:32

## 概述

将高频但篇幅较长的 Git 规则模块化到 Skill，保留 AGENTS 轻量入口，提升指令执行效率与可维护性。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/git-management/SKILL.md` | 新增 | 2026-02-07 15:06:50 | 新增 Git 管理 Skill（阶段成果提交、大改动保护点、提交节奏、质量门禁） |
| `AGENTS.md` | 修改 | 2026-02-07 15:06:55 | 在 Skill 流程中新增一句 `git-management` 触发说明 |
| `AGENTS.zh-CN.md` | 修改 | 2026-02-07 15:07:01 | 中文审核版同步新增同一句触发说明 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 15:07:16 | 补录 `git-management` Skill 与中文版 AGENTS 元数据 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 15:08:24 | 重新生成目录树并在 Agent Skills 表补充 `git-management` 条目 |
| `docs/dev_logs/2026-02-07/20-skillize-git-management.md` | 新增 | 2026-02-07 15:08:32 | 记录本轮 Skill 下沉与验证结果 |

## 具体变更描述

### 问题

- 将完整 Git 管理细则直接放在 `AGENTS` 会增加上下文负担，不利于高频调用。

### 方案

1. 新建 `git-management` Skill
- 把完整 Git 规则集中到 `.agents/skills/git-management/SKILL.md`。

2. AGENTS 只保留入口句
- 在 Skill 列表增加一条触发语句：阶段性成果或大改动时调用 `git-management`。

3. 同步审核与架构元数据
- 中文版 `AGENTS.zh-CN.md` 同步一句规则。
- 更新元数据与目录树，保证结构文档一致。
- 在 `repository-structure.md` 的 Agent Skills 表增加 `git-management` 说明，便于后续发现与调用。

### 影响范围

- 业务收益：AGENTS 更轻量，执行链路更快；Git 管理规则仍完整可用。
- 管理收益：规则职责分层清晰，后续只需维护 Skill 文件。
- 风险：文档变更，不影响运行时功能。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（依赖检查 / TypeScript / ESLint / Vite Build 全通过）
