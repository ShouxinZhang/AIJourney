# Bug 修复 — 5 项问题清单

## 用户 Prompt

> 问题清单（按严重级别）
>
> 高：核心业务交互"点击展开知识图谱"存在失效风险
> 文件：KnowledgeGraph.tsx (line 171)、KnowledgeGraph.tsx (line 176)、KnowledgeGraph.tsx (line 177)、index.js (line 3886)
> 业务影响：用户点击节点后，图结构可能不更新，直接影响产品核心价值（探索式学习路径）。
> 原因：initialNodes/initialEdges 会随 expanded 重新计算，但 useNodesState/useEdgesState 只把它们当"初始值"，后续不会自动同步。
>
> 高：质量门禁脚本会在第 1 步后提前退出
> 文件：check_errors.sh (line 17)、check_errors.sh (line 63)
> 业务影响：npm run check 误报失败，CI/发布流程会被错误阻断。
> 已复现：运行 cd web && npm run check，只执行到"依赖检查通过"即退出。
> 原因：set -e 下 ((PASS_COUNT++)) 在计数从 0 到 1 时返回状态为失败，触发脚本退出。
>
> 中：重启脚本会强制 kill -9 指定端口进程，可能误杀其他项目服务
> 文件：restart.sh (line 26)、restart.sh (line 29)
> 业务影响：本机其他前端/服务可能被非预期终止，导致联调中断或数据丢失风险。
>
> 中：依赖安装步骤会吞掉安装失败，且使用非确定性安装方式
> 文件：check_errors.sh (line 88)、check_errors.sh (line 89)
> 业务影响：检查流程可能在"依赖未正确安装"情况下继续，造成后续错误定位困难；npm install 也会引入环境漂移风险（不如 npm ci 稳定）。
>
> 低：缺少自动化测试入口，核心交互没有回归保护
> 文件：package.json (line 6)
> 业务影响：后续迭代中，展开/折叠、布局、节点描述等关键能力容易出现回归，发现成本后置到人工测试。
>
> 你看看这些问题是否存在？

**修改时间**: 2026-02-07 11:41:00

## 概述
根据代码审查发现的 5 个问题（2 高 2 中 1 低），全部修复并验证通过。

## 修复详情

### [高] #1: 节点展开/折叠交互失效
**文件**: `web/src/components/KnowledgeGraph.tsx`
**修改时间**: 2026-02-07 11:38:10
**问题**: `useNodesState(initialNodes)` 只取初始值，`expanded` 变化后 `initialNodes` 重算但状态不同步。`key={graphKey}` 只重挂 ReactFlow 组件，不重置父组件的 hooks。
**修复**: 
- 移除 `useNodesState`/`useEdgesState`，改为 `useState` + `useMemo` 同步
- 手动实现 `onNodesChange`/`onEdgesChange` 用 `applyNodeChanges`/`applyEdgeChanges`
- 移除无效的 `key={graphKey}` hack

### [高] #2: check_errors.sh 第 1 步后提前退出
**文件**: `scripts/check_errors.sh`
**修改时间**: 2026-02-07 11:39:00
**问题**: `set -e` 下 `((PASS_COUNT++))` 从 0→1 时，后自增表达式值为 0 (falsy)，bash 视为失败退出。
**修复**:
- `set -euo pipefail` → `set -uo pipefail` (移除 `-e`)
- `((PASS_COUNT++))` → `PASS_COUNT=$((PASS_COUNT + 1))` (所有计数器)
- `((STEP++))` → `STEP=$((STEP + 1))` (所有步骤计数)

### [中] #3: restart.sh 按端口杀进程导致误杀
**文件**: `scripts/restart.sh`
**修改时间**: 2026-02-07 11:39:30
**问题**: `lsof -ti tcp:5173,5174 | xargs kill -9` 会杀掉任何占用这些端口的进程。
**修复**:
- 改为 `pgrep -f "vite.*${WEB_DIR}"` 只匹配本项目的 vite 进程
- 先发 SIGTERM，等 1 秒后再对残留进程发 SIGKILL

### [中] #4: 依赖安装吞错误 + npm install 环境漂移
**文件**: `scripts/check_errors.sh`
**修改时间**: 2026-02-07 11:39:00
**问题**: `npm install || true` 吞掉安装失败；`npm install` 可能更新 lock 文件导致环境不一致。
**修复**:
- 有 `package-lock.json` 时使用 `npm ci`（确定性安装）
- 无 lock 文件时 fallback 到 `npm install`
- 捕获安装退出码，失败时正确报告

### [低] #5: 缺少自动化测试入口
**文件**: `web/package.json`, `web/src/__tests__/knowledge-tree.test.ts`
**修改时间**: 2026-02-07 11:40:00
**问题**: 无 `test` script，核心数据和交互无回归保护。
**修复**:
- 安装 vitest + @testing-library/react + jsdom
- 添加 `npm run test` 和 `npm run test:watch`
- 编写 knowledge-tree 数据完整性测试 (6 个用例)

## 验证结果
- ✔ TypeScript 类型检查通过 (0 errors)
- ✔ Vitest 测试通过 (6/6, 90ms)
- ✔ check_errors.sh 全 4 步跑完 (之前在第 1 步退出)
- ✔ Vite 生产构建通过
