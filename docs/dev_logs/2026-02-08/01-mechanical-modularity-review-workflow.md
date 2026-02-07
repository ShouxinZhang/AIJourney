## 对话记录

### 第 1 轮
- 背景: 已有 `modularization-governance` Skill，但当前版本依赖人工评分卡判断。
- 用户:
  > 不不不，scorecard这种东西太虚了，高度依赖人工高质量检验.
  > 我要的是那种LLM也可以用的，可机械量化的, 用一个脚本就能跑出来的
  > 牢记一下LLM workflow的核心: 初始框架必须正确, LLM可以不断分治, 有明确的机械review反馈，帮助LLM修复分治过程中产生的错误, 从而能够一路完美填充框架, 最后sorry free.
- 用户的意图解析: 要把模块化治理从“人工评估”升级为“脚本量化 + 机器反馈 + 分治修复闭环”。
- LLM思考摘要: 新增可执行检查脚本并重写 Skill workflow，输出 `PASS/REFINE/BLOCK` 和问题码，支持 LLM 自动迭代修复。

**修改时间**: 2026-02-08 04:55:38

## 概述
将模块化治理 Skill 升级为机械量化工作流：通过单脚本生成结构化 review 报告，LLM 可按问题码循环修复，直到框架级阻断项清零。

## 修改文件清单

| 文件 | 操作 | 修改时间 | 说明 |
|------|------|----------|------|
| `.agents/skills/modularization-governance/scripts/check-modularity.mjs` | 新增 | 2026-02-08 04:53:16 | 新增模块化机械检查脚本，输出 `PASS/REFINE/BLOCK` + findings JSON |
| `.agents/skills/modularization-governance/references/modularity-policy.template.json` | 新增 | 2026-02-08 04:53:22 | 新增策略模板（层级、入口、阈值） |
| `.agents/skills/modularization-governance/SKILL.md` | 修改 | 2026-02-08 04:53:48 | 将 workflow 改为“框架契约 -> 脚本检查 -> 分治修复 -> 复检” |
| `.agents/skills/modularization-governance/references/scorecard.md` | 修改 | 2026-02-08 04:54:07 | 从人工评分卡改为机械规则说明（状态机 + 问题码） |
| `.agents/skills/modularization-governance/references/refactor-playbook.md` | 修改 | 2026-02-08 04:54:18 | 改为按 `finding.code` 映射最小重构动作 |
| `docs/architecture/repo-metadata.json` | 修改 | 2026-02-08 04:55:08 | 回补新 Skill 脚本与策略文件元数据条目 |
| `docs/architecture/repository-structure.md` | 修改 | 2026-02-08 04:55:19 | 更新 `modularization-governance` 描述为机械量化闭环 |
| `docs/dev_logs/2026-02-08/01-mechanical-modularity-review-workflow.md` | 新增 | 2026-02-08 04:55:38 | 记录本轮开发闭环 |

## 具体变更描述

- 方案:
1. 在 Skill 内新增可执行脚本 `check-modularity.mjs`，把模块化检查转为规则引擎。
2. 定义 `BLOCK/REFINE/PASS` 状态机；`BLOCK` 由循环依赖和反向层级依赖触发。
3. 通过 `findings` 输出问题码、证据、建议动作，供 LLM 机械循环修复。

- 机械规则（核心）:
1. `BLOCK`: `CIRCULAR_DEPENDENCY`、`REVERSE_LAYER_IMPORT`。
2. `REFINE`: `FILE_TOO_LARGE`、`HIGH_FAN_OUT`、`DEEP_RELATIVE_IMPORT`、`PUBLIC_API_TOO_WIDE`、`ORPHAN_FILES`、`UNKNOWN_LAYER_FILES`。

- 实跑结果（目标：`web/src/features/knowledge`）:
1. 状态: `REFINE`
2. 结果: `BLOCK: 0, REFINE: 3`
3. 典型问题: `KnowledgeGraphFeature.tsx` 文件过大/扇出过高、未归层文件超阈值。

- 风险与控制:
1. 风险: 规则过严会导致短期告警偏多。
2. 控制: 可通过 policy 阈值与 `entryFiles/layerOrder` 配置逐步贴合项目实际。

## 验证结果

- ✔ Skill 结构校验通过：`python3 /home/wudizhe001/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/modularization-governance`
- ✔ 机械脚本实跑成功：`node .agents/skills/modularization-governance/scripts/check-modularity.mjs --target web/src/features/knowledge --output .agents/skills/modularization-governance/artifacts/knowledge.modularity-report.json`
- ✔ 全链路构建检查通过：`bash scripts/check_errors.sh`

## Git 锚点

- branch: `main`
- commit: `N/A`（本轮未提交；当前 HEAD `8e33ee9`）
- tag/backup: `N/A`
