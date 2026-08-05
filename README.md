# Reader UI

唯一视觉设计来源：Figma 文件 klhs2jMM4MncaJFqZMfqEK。

本仓库不保留本地设计稿、导出物、生成器、演示、验证产物或前端实现。
唯一例外是 `contracts/`：它是与 Reader-Core-Native 同步的 Reader-UI 3.0.0
命令 / 事件 / 主机请求契约，作为 Core 端 hermetic 快照的权威源，供
`Reader-Core-Native/tools/reader-ui-contract-drift/contract_drift_check.py`
门禁消费。改动契约须保持与 Core 内 `tests/fixtures/contracts/` 快照字节一致，
并同步重算 mapping 中的 `sourceSha256` / `eventSourceSha256` / `hostRequestSourceSha256`。
