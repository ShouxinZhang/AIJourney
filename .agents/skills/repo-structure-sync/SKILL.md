---
name: repo-structure-sync
description: 仓库架构文档同步。当文件结构发生变化（新增/删除/移动文件或目录）时，必须使用此技能更新 docs/architecture/repository-structure.md。
---

# 仓库架构文档同步规范

`docs/architecture/repository-structure.md` 是仓库的架构说明文件，必须与实际文件结构保持一致。

## 触发条件

以下操作后必须更新架构文档：
- 新增文件或目录
- 删除文件或目录
- 移动或重命名文件
- 新增 npm 依赖（更新技术栈表格）
- 新增 npm scripts（更新命令列表）

## 需要更新的章节

### 1. 目录结构树

用 ASCII 树形图展示完整的项目结构，注释说明每个文件/目录的用途。

```
AIJourney/
├── AGENTS.md                          # AI Agent 行为规范
├── .agents/skills/                    # Agent Skills
│   ├── dev-logs/SKILL.md             # 开发日志记录技能
│   └── ...
├── scripts/                           # 构建与运维脚本
└── web/                               # 前端网站
```

### 2. 技术栈表格

新增依赖时更新版本和用途。

### 3. 开发命令

新增 npm scripts 时更新命令列表。

## 执行流程

1. 完成代码变更后，检查是否涉及文件结构变化
2. 如有变化，打开 `docs/architecture/repository-structure.md`
3. 对照实际结构更新目录树、技术栈和命令章节
4. 确保注释准确描述每个文件的用途
5. 此步骤在开发日志记录之前完成

## 注意事项

- 不要在架构文档中记录 `node_modules/`、`dist/`、`.vite/` 等构建产物
- 保持注释简洁，一个文件一句话说明
- 新增模块目录时，说明该模块的业务定位
