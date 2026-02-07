# 创建 Agent Skills 体系

## 用户 Prompt

> https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
>
> 阅读上述内容，更新dev-logs skills
> 除了agents.md原本的内容之外
> 还要求记录用户提问的完整的prompts
>
> 【还需要哪些？】

**修改时间**: 2026-02-07 11:50:00

## 概述
参考 GitHub Agent Skills 规范，为项目创建 4 个 Agent Skills，建立标准化的 AI 辅助开发流程。同时补录历史开发日志中缺失的用户原始 prompt。

## 新增文件

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/dev-logs/SKILL.md` | 新增 | 2026-02-07 11:47:00 | 开发日志记录技能：含用户 prompt 原文记录、文件变更表、构建验证 |
| `.agents/skills/build-check/SKILL.md` | 新增 | 2026-02-07 11:48:00 | 构建检查技能：全链路门禁流程和错误处理指引 |
| `.agents/skills/knowledge-tree-update/SKILL.md` | 新增 | 2026-02-07 11:48:30 | 知识树维护技能：ID 命名规范、颜色体系、操作流程 |
| `.agents/skills/repo-structure-sync/SKILL.md` | 新增 | 2026-02-07 11:49:00 | 架构同步技能：触发条件和更新章节规范 |

## 修改文件

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `docs/dev_logs/2026-02-07/01-init-knowledge-graph.md` | 修改 | 2026-02-07 11:49:30 | 补录 4 条用户原始 prompt |
| `docs/dev_logs/2026-02-07/02-bugfix-five-issues.md` | 修改 | 2026-02-07 11:49:40 | 补录用户完整问题清单 prompt |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 11:50:00 | 添加 .agents/skills 目录、__tests__ 目录、Agent Skills 文档、更新颜色信息 |

## 4 个 Skills 的设计

| Skill | description 关键词 | 触发时机 |
|-------|-------------------|----------|
| `dev-logs` | "完成代码修改后" | 每次变更后 |
| `build-check` | "完成代码修改后" | 代码变更后验证 |
| `knowledge-tree-update` | "添加、修改或删除知识树节点" | 编辑数据文件时 |
| `repo-structure-sync` | "文件结构发生变化" | 新增/删除文件时 |

## 验证结果
- ✔ 4 个 SKILL.md 文件均按 GitHub 规范格式（YAML frontmatter + Markdown body）
- ✔ 历史日志已补录用户 prompt
- ✔ repository-structure.md 已同步更新
