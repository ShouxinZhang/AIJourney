## 用户 Prompt

> 对对，关于项目开发的全链路，对于个人开发来说，可以分为哪几个步骤呢？
> 对，其实是区分为本地开发链路和线上开发链路，对，再想想
> 对，先写一个本地开发的skills，上线我觉得还不用着急
> 目前看来是这样，write

**修改时间**: 2026-02-07 12:02:33

## 概述

新增 `local-dev-workflow` Skill，定义本地开发全链路 SOP，将现有零散的 Skills（build-check、dev-logs、repo-structure-sync、knowledge-tree-update）串联为一条完整的开发流水线，从需求理解到 Git 提交形成闭环。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/local-dev-workflow/SKILL.md` | 新增 | 2026-02-07 12:02:10 | 本地开发全链路 SOP（总调度技能） |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 12:02:18 | 目录树和 Skills 表格中添加 local-dev-workflow |

## 具体变更描述

### 新增 `local-dev-workflow` Skill

作为"总调度"技能，定义了 8 个步骤的完整本地开发流程：

1. **需求理解** — 读取 AGENTS.md 和架构文档
2. **方案对齐** — 向用户描述方案，确认后再动手（不可跳过）
3. **编码实现** — 按规范编码，按需调用 knowledge-tree-update
4. **本地预览** — `npm run dev` 检查效果（非前端变更可跳过）
5. **质量门禁** — 调用 build-check skill（不可跳过）
6. **架构文档同步** — 调用 repo-structure-sync skill（无结构变化可跳过）
7. **开发日志** — 调用 dev-logs skill（不可跳过）
8. **Git 提交** — 规范化 commit message（只 commit，push 由用户决定）

包含步骤速查表和异常处理指引。

## 验证结果

- ✔ TypeScript 类型检查通过
- ✔ ESLint 代码规范通过
- ✔ Vite 生产构建通过
