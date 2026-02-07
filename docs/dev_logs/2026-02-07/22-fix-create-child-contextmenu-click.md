## 对话记录

> 点击了新建子节点，为什么没有效果呢？

**LLM**: 定位到右键菜单的全局 `mousedown` 先于菜单项 `onClick` 执行，导致菜单提前卸载，`新建子节点` 点击事件丢失。

> OK.

**LLM**: 按最小改动修复为“仅点击菜单外部才关闭菜单”，并完成 lint/构建/运行时启动验证。

**修改时间**: 2026-02-07 15:27:23

## 概述

修复知识树右键菜单点击失效问题，恢复“新建子节点/删除到垃圾桶”菜单项的可用性，避免本地知识结构维护流程中断。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `web/src/features/knowledge/KnowledgeGraphFeature.tsx` | 修改 | 2026-02-07 15:26:22 | 右键菜单增加 `ref`，全局 `mousedown` 改为仅在点击菜单外时关闭 |
| `docs/dev_logs/2026-02-07/22-fix-create-child-contextmenu-click.md` | 新增 | 2026-02-07 15:27:23 | 记录本轮 Bug 修复与验证结果 |

## 具体变更描述

### 问题

- 右键菜单显示后，组件给 `window` 绑定了全局 `mousedown`，任意鼠标按下都会立即执行 `setContextMenu(null)`。
- 点击菜单项时，`mousedown` 先于按钮 `onClick` 触发，菜单先被卸载，导致“新建子节点”看起来无响应。

### 方案

1. 在菜单容器上增加 `contextMenuRef`。
2. 修改全局 `mousedown` 处理：
- 若点击目标在菜单内部，不关闭菜单。
- 仅当点击菜单外部时关闭菜单。

### 影响范围

- 影响模块：`knowledge` 功能模块下的右键上下文菜单交互。
- 业务收益：恢复节点新增/删除入口，保障知识库结构维护效率。
- 风险评估：低风险；仅调整菜单关闭时机，不改 API、数据模型与同步链路。

## 验证结果

- ✔ `bash scripts/check_errors.sh` 通过（依赖检查 / TypeScript / ESLint / Vite Build 全通过）
- ✔ `cd web && npm run lint` 通过
- ✔ `cd web && timeout 20s npm run dev` 成功启动（Vite Ready，无运行时报错；端口占用后自动切换到 `http://localhost:5174/`）
