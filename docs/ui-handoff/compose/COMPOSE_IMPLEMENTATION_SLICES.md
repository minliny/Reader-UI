# Compose Implementation Slices

| Slice | 修改范围 | 不允许修改范围 | 依赖 | 验收标准 | 建议测试 | 回滚点 |
|---|---|---|---|---|---|---|
| Slice 0：Handoff freeze | 只更新 handoff 文档，冻结 normalized HTML/CSS/matrix | Android app code | FULL_FRONTEND_NORMALIZED_HTML_READY | 文档齐全且审计通过 | 文档链接检查 | 当前 commit |
| Slice 1：Theme/token foundation | 新增 ReaderColors/Typography/Spacing/Shapes/HandoffBoundary | ViewModel/repository/bridge | Slice 0 | Reader token 可被 Compose 引用 | token unit/snapshot check | 移除 theme 包 |
| Slice 2：Shared UI components | AppTopBar/MainTabBar/StatePage/SettingsRow/BookCard/SearchBox | 业务数据流 | Slice 1 | 组件可 preview 且 semantics 完整 | Compose preview + semantics | 回退 shared components |
| Slice 3：Bookshelf + Search + Detail static UI | 静态 UI 或 fake state 接入 | 真实网络/存储改造 | Slice 2 | 页面与 normalized 结构一致 | UI smoke + existing fake/real tests | 回退 screen package |
| Slice 4：Reader control layer Compose prototype | BaseControlVisible + 8 overlay states | 真实阅读引擎接入 | Slice 1/2 | 9 个阅读状态可独立渲染 | reader overlay semantics/screenshot | 回退 reader prototype |
| Slice 5：Source management UI integration | SourceManagement UI 接现有 repository | BookSourceRepository API | Slice 2 | 启用/禁用/删除行为不回归 | 现有 source tests + UI tests | 保留旧 SourceItem |
| Slice 6：Discover / RSS / WebDAV static UI | 静态 handoff UI | 真实 RSS/WebDAV 能力 | Slice 2 | 页面可渲染且状态齐全 | state rendering tests | 回退 static routes |
| Slice 7：State integration | loading/empty/error/offline/disabled/permission | 底层 data contract | Slice 3-6 | 状态矩阵全覆盖 | state matrix tests | 回退 StatePage integration |
| Slice 8：Navigation integration | ReaderRouteHost/back stack/deep link placeholder | 现有 route tests 先保留 | Slice 3-7 | 核心路由可 smoke 通过 | navigation smoke tests | 回退 route host |
| Slice 9：UI regression tests | screenshot/semantics/route/state tests | 生产逻辑 | Slice 8 | CI 测试覆盖核心守卫 | CI test suite | 移除 failing golden update |
