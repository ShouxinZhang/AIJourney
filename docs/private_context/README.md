# Private Context (Local Only)

该目录用于存放本地隐私信息（数据库连接串、token、密码、私有地址等）的引用源。

## 使用规则

- 开发日志不得写明文敏感信息。
- 日志中只写 `privacy_ref`，示例：
  - `privacy_ref: docs/private_context/refs.local.md#db-sync-20260207`
- 具体敏感值写入本地文件（例如 `refs.local.md`），该类文件会被 `.gitignore` 忽略。

## 推荐文件

- `refs.local.md`：按任务记录敏感配置引用。
- `secrets.local.env`：本地环境变量（如需）。

## 说明

- 本目录仅作为“可定位入口 + 本地私有存储”模块。
- 仅 `README.md` 与 `.gitignore` 允许提交；其他文件默认不入库。
