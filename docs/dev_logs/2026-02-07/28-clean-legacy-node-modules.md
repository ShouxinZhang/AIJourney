# 28 - 清理历史 node_modules 并完成复验

## 对话记录

> “旧目录清理 + 复验”，直接回收这两份历史占用

**LLM**: 执行了删除前快照备份、目录清理、质量门禁与启动验证，并在最终状态再次删除两套目录以直接回收空间。

**修改时间**: 2026-02-07 16:22:48

## 概述

清理 `web/node_modules` 与 `scripts/repo-metadata/node_modules` 两套历史依赖目录并复验可用性，确认质量门禁通过后回收约 204M 本地占用。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-07 16:22:33 | 执行结构同步后更新元数据（保持与当前 workspace 结构一致） |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-07 16:22:33 | 执行结构同步后刷新目录树展示 |
| `docs/dev_logs/2026-02-07/28-clean-legacy-node-modules.md` | 新增 | 2026-02-07 16:22:48 | 记录本轮清理与复验过程 |

## 具体变更描述

### 问题
- 旧目录残留两套依赖：`web/node_modules`（177M）与 `scripts/repo-metadata/node_modules`（27M），本地空间占用高。

### 方案
- 删除前快照备份：`privacy_ref: docs/private_context/backups/20260207-161948-node-modules-cleanup/snapshot.txt`
- 执行清理：删除两套历史目录。
- 执行复验：先跑 `bash scripts/check_errors.sh` 与 `npm run -w web dev -- --host`。
- 复验过程中发现依赖不完整，补执行 `npm ci` 后复验通过。
- 发现本仓库存在常驻 `vite` 进程会触发目录回生，先停止该进程后再次清理，确保空间被直接回收。

### 影响范围与风险
- 影响范围：仅本地依赖缓存与架构文档元数据；不涉及业务代码。
- 风险：当前依赖布局下，`web` 构建链路仍依赖 `web/node_modules`；若只保留根目录 `node_modules`，`check_errors` 会因缺少 `react/eslint/vite` 等依赖失败。
- 风险：后续若执行 `npm ci`，npm 会按当前安装策略重新生成对应目录。

## 验证结果
- ✔ 清理前占用：`web/node_modules` 177M + `scripts/repo-metadata/node_modules` 27M。
- ✔ 首次复验发现依赖不完整（`tsc/eslint/vite` 缺失），已通过 `npm ci` 修复。
- ✔ `bash scripts/check_errors.sh` 最终通过（依赖/TypeScript/ESLint/Vite Build 全通过）。
- ✔ `timeout 10s npm run -w web dev -- --host` 启动成功（Vite ready，超时退出用于自动化验证）。
- ✔ 关闭本仓库常驻 `vite` 进程后再次清理，最终仅剩根目录 `node_modules`（50M）；目标两套目录已删除。
- ⚠ 在最终“仅保留根 `node_modules`”状态下复跑 `bash scripts/check_errors.sh` 失败（缺少 `react/jsx-runtime`、`eslint`、`vite` 等），说明当前仓库尚不能在该状态下直接通过质量门禁。

## Git 锚点
- branch: `main`
- commit: `N/A`（本轮未执行提交）
- tag/backup: `docs/private_context/backups/20260207-161948-node-modules-cleanup/snapshot.txt`
