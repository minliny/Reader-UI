# Reader-UI

本仓当前只保存三份 JSON 契约快照、字体与少量设计工具；没有可运行应用或独立构建产物。实际产品
UI 在 `Reader-for-HarmonyOS`，业务协议在 `Reader-Core-Native`。

三份契约当前声明 Core command 76、Host request 58、UI event 300；JSON 有效，但 2026-08-12
源码审计检查点的严格 Core drift 有 16 个未映射方法，最终 dirty 协议增为 17 个。因此契约只能
作为待校准快照，不能单独证明产品实现或发布就绪。不要在本仓新增状态文档；统一结论见
[`../AUDIT_2026-08-12.md`](../AUDIT_2026-08-12.md)。
