# 27 - workspace 统一依赖安装与重复 node_modules 收敛

## 对话记录

> 仓库里有多套node_modules, 我觉得这个比较浪费啊

**LLM**: 先盘点了当前依赖目录与体积，确认重复安装成本主要来自 `web` 与 `scripts/repo-metadata` 两套依赖。

> 奇怪了，为什么repo-metadata需要node_modules呢

**LLM**: 基于代码 import 说明了 `repo-metadata` 需要 `@modelcontextprotocol/sdk`、`zod`、`pg` 以支持 MCP 服务与 PG 同步能力。

> 按 workspace 改
> 对，其实应该有一个前端开发的Skills，这个node_modules的安装不要重复就算一条

**LLM**: 按最小改动落地 npm workspace，改造检查/启动脚本为根依赖优先，并将“避免重复安装 node_modules”写入前端相关 Skill 规则。

> OK

**LLM**: 开始实施并完成验证、架构文档同步与开发日志回写。

**修改时间**: 2026-02-07 16:11:59

## 概述

将仓库依赖安装模式升级为 npm workspace 根目录统一安装，减少重复依赖安装和维护成本，同时保持现有前端与仓库元数据工具链可用。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `package.json` | 新增 | 2026-02-07 16:07:49 | 新增 workspace 根配置（`web` + `scripts/repo-metadata`）与根脚本入口 |
| `package-lock.json` | 新增 | 2026-02-07 16:08:55 | 新增 workspace 根 lockfile，统一依赖锁定 |
| `web/package-lock.json` | 删除 | 2026-02-07 16:08:55 | 移除子模块 lockfile，改由根 lock 统一管理 |
| `scripts/repo-metadata/package-lock.json` | 删除 | 2026-02-07 16:08:55 | 移除子模块 lockfile，改由根 lock 统一管理 |
| `scripts/check_errors.sh` | 修改 | 2026-02-07 16:08:08 | 依赖检查改为 workspace 优先，构建检查命令适配 workspace 执行 |
| `scripts/restart.sh` | 修改 | 2026-02-07 16:08:19 | 启动脚本改为 workspace 优先安装与运行 |
| `.gitignore` | 修改 | 2026-02-07 16:08:24 | 新增根 `node_modules` 忽略规则 |
| `README.md` | 修改 | 2026-02-07 16:11:14 | Quick Start 改为根目录一次安装 + workspace 启动命令 |
| `README.zh-CN.md` | 修改 | 2026-02-07 16:11:20 | 快速开始改为根目录一次安装 + workspace 启动命令 |
| `.agents/skills/build-check/SKILL.md` | 修改 | 2026-02-07 16:08:39 | 增加“禁止在子模块重复安装 node_modules”的规则说明 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 16:11:02 | 同步新增/删除路径与描述（workspace 根文件等） |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 16:11:38 | 同步目录树与开发命令（新增 workspace 安装/运行说明） |

## 具体变更描述

### 问题
- 仓库内存在多套依赖安装入口，导致磁盘占用和安装流程重复。
- 现有 `check_errors.sh` 与 `restart.sh` 依赖 `web/node_modules`，不兼容根 workspace 统一安装模式。

### 方案
- 在仓库根新增 `package.json`，启用 npm `workspaces` 管理 `web` 与 `scripts/repo-metadata`。
- 将依赖锁由子模块分散 lockfile 收敛到根 `package-lock.json`。
- 将质量检查与重启脚本改造为：
  - 有 workspace 时优先使用根目录依赖和 workspace 命令；
  - 无 workspace 时兼容原先 `web` 本地模式。
- 更新 README 与架构文档，明确“根目录一次安装”的操作方式。
- 在 `build-check` Skill 中显式加入“避免重复安装 node_modules”要求。

### 影响范围
- 影响安装与启动/检查流程：依赖安装入口统一到仓库根目录。
- 不改变业务功能与前端运行逻辑。
- 对开发者收益：减少重复安装与依赖漂移风险，提升本地维护一致性。

## 验证结果
- ✔ `bash scripts/check_errors.sh` 通过（依赖检查 / TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run lint` 通过
- ✔ `cd web && timeout 20s npm run dev` 启动成功（Vite 正常 ready，无运行时错误输出；20 秒后超时退出用于自动化验证）
- ✔ `timeout 10s npm run -w web dev -- --host` 启动成功（workspace 启动路径可用）
- ✔ `npm prune --workspaces` 执行成功（已验证不会自动删除历史遗留的子模块 `node_modules` 目录）
- ✔ `bash -n scripts/check_errors.sh` 通过（脚本语法）
- ✔ `bash -n scripts/restart.sh` 通过（脚本语法）

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮按你的要求完成改造与验证，但未执行提交）
- tag/backup: `docs/private_context/backups/20260207-160726-workspace-lockfiles`（删除子模块 lockfile 前备份）
