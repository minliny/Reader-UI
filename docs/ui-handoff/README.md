# UI Handoff

当前 UI handoff 的主导航以 `frontend-demo/` 为准：

- 书架
- 发现
- RSS
- 设置

`ROUTE_MAP.md`、`SCREEN_MATRIX.md`、`normalized-html/` 和 `components/` 是当前 handoff 输入。
`compose/` 与 `stitch-mcp-audit/` 保留历史执行报告，不作为当前主导航或页面结构的来源。

## Frontend Development Start Gate

- `FRONTEND_DEVELOPMENT_READINESS.md`：当前 UI 侧是否足够支撑有边界的真实前端开发。
- `FRONTEND_DEVELOPMENT_SLICE_MATRIX.md`：推荐平台先启动的 bounded vertical slices。
- `FRONTEND_COMPLETE_APP_GAP_MATRIX.md`：完整可用前端应用还缺什么，以及三轮自评后的跨仓缺口矩阵。
- `FRONTEND_COMPLETE_APP_GAP_MATRIX_ANDROID.md`：Android Compose 侧实现与证据矩阵。
- `FRONTEND_COMPLETE_APP_GAP_MATRIX_IOS.md`：iOS SwiftUI 侧实现与证据矩阵。
- `FRONTEND_COMPLETE_APP_GAP_MATRIX_HARMONYOS.md`：HarmonyOS ArkUI 侧实现与证据矩阵。
- `FRONTEND_COMPLETE_APP_GAP_MATRIX_CORE_BRIDGE.md`：Reader-Core-Native bridge 与 DomainState 归属矩阵。
- `UI_PLATFORM_EVIDENCE_REQUESTS.md`：平台完成后必须回传的 native 证据。

验证：

```bash
node frontend-demo/verify/handoff/verify-ui-handoff-readiness.mjs
```

该验证只检查 `Reader UI` 仓库内的 design / contract / demo proof / handoff 输入，不证明平台原生实现完成。
