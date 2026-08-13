# Slice Plan

状态：Phase 3 三端正式开发切片（Slice 0–12）
日期：2026-07-19
权威源：[CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §9、[PAGE_REFERENCE.md](./PAGE_REFERENCE.md)、[MOTION_SPEC.md](./MOTION_SPEC.md)、[CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md)、[PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)
来源：[frontend-demo-optimized/MOTION_IMPLEMENTATION_GAP_AUDIT.md](../frontend-demo-optimized/MOTION_IMPLEMENTATION_GAP_AUDIT.md) UI/Platform Ownership Split

本文是阶段 3"三端开发切片"。定义 Slice 0–12 启动顺序、每个 slice 的输入文档、每端必须产出的源码/测试/截图/录屏/设备证据、并行/串行约束。Slice 9–12 已从能力矩阵建议升级为正式施工范围；进入计划不等于对应能力已经实现。

## 0. 文档边界

本文覆盖：
- Slice 0–12 启动顺序与依赖
- 每个 slice 的输入文档清单
- 每端（iOS / Android / HarmonyOS）必须产出的源码、测试、截图/录屏/设备证据
- 哪些 slice 可并行，哪些必须等 Core bridge 或 contract 先定

本文不覆盖：
- 不写三端实现代码（归各端仓库）
- 不规定具体排期（归各端项目管理）
- 不重复 slice 内的契约内容（见各 slice 输入文档）

## 1. Slice 总览

| Slice | 名称 | 依赖 | 三端可并行？ |
| --- | --- | --- | --- |
| Slice 0 | 契约 + 工具链接入 | 无 | 是（三端各自接入 generated types）|
| Slice 1 | AppShell + main tabs | Slice 0 | 是 |
| Slice 2 | Bookshelf → open book → reader surface | Slice 1 + Core `book.open / content.load / reader.location.resolve` | 是（Core bridge 串行先定）|
| Slice 3 | Reader Control / overlay / full panel | Slice 2 + Reader 2 静态基线 | 是 |
| Slice 4 | Progress / session / focus / TTS | Slice 3 + Core `tts.queue.* / reader.progress.update` | 是 |
| Slice 5 | RSS / source / search | Slice 1 + Core `rss.* / source.search` | 是（与 Slice 2-4 并行）|
| Slice 6 | Sync / conflict / offline state | Slice 5 + Core `sync.* / sync.conflict.resolve` | 是 |
| Slice 7 | Host Adapter 补齐 | Slice 0-6 按需 | 是（按 HostRequest 能力并行）|
| Slice 8 | 一致性验证 + 防漂移 | Slice 1-6 完成 | — |
| Slice 9 | 多格式、本地书、漫画与媒体交付 | Slice 2 + Slice 7 的 File/Permission/Storage/HTTP/Background 能力 + 格式/媒体 Core 协议 | 是（按格式与媒体 lane 并行）|
| Slice 10 | 阅读数据、编辑、规则、封面与扩展 TTS | Slice 2/4/5 + 对应实体 Core 协议 | 是（按实体族并行）|
| Slice 11 | 动态书源、规则订阅、登录挑战与 RSS 深链 | Slice 5 + Slice 7 的 HTTP/Cookie/WebView/Credential 能力 | 是（与 Slice 9/10 的非共享 lane 并行）|
| Slice 12 | 完整应用生命周期、设置、无障碍与 Release Gate | Slice 0–11；基础设施可前置，最终验收必须后置 | 部分 |

每个 slice 必须三端一起验收，不允许单端无限向前跑（来源：[CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §9 Phase 3）。Slice 8 保留既有文本阅读主链的一致性门禁；Slice 12 承担全产品 Release Gate，不能用 Slice 8 的单一 smoke 替代 Slice 9–11 的分域证据。

## 2. Slice 0：契约 + 工具链接入

### 2.1 输入文档

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [BOUNDARY_RULES.md](./BOUNDARY_RULES.md)
- [STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md)
- [CONTRACT_VERSIONING.md](./CONTRACT_VERSIONING.md)
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md)
- [generated/](../generated/) 三端 generated types
- [ffi-protocol-version.md](./ffi-protocol-version.md)

### 2.2 每端交付物

**iOS（SwiftUI）**：
- 源码：
  - `ReaderUIContract` Swift package 接入（from generated/swift/）
  - `ReaderReducer.swift`、`ReaderViewState.swift`、`ReaderCoordinator.swift`、`ReaderCoreBridge.swift`、`HostAdapter.swift` 文件骨架
- 测试：
  - generated types 编译通过
  - `contractConsistencyTest.swift`（校验 generated 与 schema 一致）
- 证据：`slice-0-ios-types-compile.png`（Xcode 编译成功截图）

**Android（Compose）**：
- 源码：
  - `ReaderUIContract` Kotlin module 接入（from generated/kotlin/）
  - `ReaderReducer.kt`、`ReaderUiState.kt`、`ReaderCoordinator.kt`、`ReaderCoreBridge.kt`、`HostAdapter.kt` 文件骨架
- 测试：
  - generated types 编译通过
  - `ContractConsistencyTest.kt`
- 证据：`slice-0-android-types-compile.png`（Android Studio 编译成功截图）

**HarmonyOS（ArkUI）**：
- 源码：
  - `ReaderUIContract` ArkTS module 接入（from generated/arkts/）
  - `ReaderReducer.ets`、`ReaderViewState.ets`、`AppStateStore`、`ReaderNapiBridge.ets`、`HostAdapter.ets` 文件骨架
- 测试：
  - generated types 编译通过
  - `contract_consistency.test.ets`
- 证据：`slice-0-harmony-types-compile.png`（DevEco Studio 编译成功截图）

### 2.3 验收门槛

- 三端 generated types 编译通过
- 三端 reducer / coordinator / bridge / host adapter 文件骨架就位
- `node --test contracts/tests/*.test.mjs` 全绿
- 三端各自仓库 `slice-0-*-types-compile.png` 提交

## 3. Slice 1：AppShell + main tabs

### 3.1 输入文档

- [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §3 Slice 1
- [MOTION_SPEC.md](./MOTION_SPEC.md) §2.1 §2.2（app.firstOpen / tab / bookshelf.view.switch）
- [TOKEN_SPEC.md](./TOKEN_SPEC.md) §2.6 tab 组、§2.3 卡片组、§2.4 列表组
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §1.1 MainTabShell
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §2.1 路由/Tab 映射

### 3.2 范围

- `app-shell` + 4 个主 Tab（bookshelf / discover / rss / settings）根页面
- 底部导航 `BottomNav`
- Tab 切换 motion（`tab.item.select` / `tab.switch`）
- 冷启动 `app.firstOpen.enter`
- 状态层 `Loading / Empty / Error / Offline`

### 3.3 每端交付物

**iOS**：
- 源码：`AppShellView.swift`、`MainTabView.swift`、`BottomNavView.swift`、`BookshelfRootView.swift`、`DiscoverRootView.swift`、`RssRootView.swift`、`SettingsRootView.swift`
- 测试：`AppShellReducerTest.swift`（golden test，覆盖 tab 切换 / firstOpen / 状态层）
- 证据：
  - `slice-1-ios-cold-start.mov`（冷启动录屏）
  - `slice-1-ios-tab-switch.mov`（Tab 切换录屏）
  - `slice-1-ios-states.png`（4 个 Tab 的 default / loading / empty / error 截图）

**Android**：
- 源码：`AppShell.kt`、`MainTabScreen.kt`、`BottomNav.kt`、`BookshelfRootScreen.kt`、`DiscoverRootScreen.kt`、`RssRootScreen.kt`、`SettingsRootScreen.kt`
- 测试：`AppShellReducerTest.kt`
- 证据：`slice-1-android-cold-start.mov`、`slice-1-android-tab-switch.mov`、`slice-1-android-states.png`

**HarmonyOS**：
- 源码：`AppShell.ets`、`MainTabs.ets`、`BottomNav.ets`、`BookshelfRoot.ets`、`DiscoverRoot.ets`、`RssRoot.ets`、`SettingsRoot.ets`
- 测试：`app_shell_reducer.test.ets`
- 证据：`slice-1-harmony-cold-start.mov`、`slice-1-harmony-tab-switch.mov`、`slice-1-harmony-states.png`（真机或模拟器）

### 3.4 验收门槛

- 三端 AppShell + 4 Tab 可启动
- Tab 切换 motion 一致（duration / easing / 互斥与 [MOTION_SPEC.md](./MOTION_SPEC.md) 一致）
- 状态层 4 种（loading / empty / error / offline）可触发
- 冷启动 firstOpen 只播一次
- 三端 reducer golden test 通过

## 4. Slice 2：Bookshelf → open book → reader surface

### 4.1 输入文档

- [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §4 Slice 2
- [MOTION_SPEC.md](./MOTION_SPEC.md) §2.3 reader.entry / page.turn / chapter.jump
- [TOKEN_SPEC.md](./TOKEN_SPEC.md) §2.1 reading-theme、§2.2 reading-typography
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §1.2 LibraryShell、§1.3 ReaderShell
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §2.2 书架、§2.3 阅读

### 4.2 范围

- `bookshelf` → `book-detail` → `immersive-reading`
- 书架搜索 `book-search`
- 书籍详情 / 目录
- 沉浸阅读主页（ReadingTextFlow + TapZones）
- 翻页 motion + 章节跳转

### 4.3 依赖

- Core bridge 必须先定：`book.open / book.parse / chapter.list / content.load / reader.location.resolve / reader.progress.update / source.detail / source.search / bookshelf.list`
- 三端 Core bridge mapping 至少完成上述命令的对齐

### 4.4 每端交付物

**iOS**：
- 源码：`BookshelfRootView.swift`（扩展）、`BookSearchView.swift`、`BookDetailView.swift`、`BookDirectoryView.swift`、`ImmersiveReadingView.swift`、`ReadingTextFlow.swift`、`TapZonesView.swift`、`ReaderReducer+content.swift`
- 测试：`ReaderEntryReducerTest.swift`（golden test，cover entry / page turn / chapter jump）
- 证据：
  - `slice-2-ios-bookshelf-to-reader.mov`（书架→详情→沉浸阅读链路）
  - `slice-2-ios-page-turn.mov`（翻页录屏，含 next / prev）
  - `slice-2-ios-chapter-jump.mov`（章节跳转录屏）
  - `slice-2-ios-reader-states.png`（readerMode: default / loading / empty / error / offline）

**Android**：
- 源码：`BookshelfRootScreen.kt`（扩展）、`BookSearchScreen.kt`、`BookDetailScreen.kt`、`BookDirectoryScreen.kt`、`ImmersiveReadingScreen.kt`、`ReadingTextFlow.kt`、`TapZones.kt`
- 测试：`ReaderEntryReducerTest.kt`
- 证据：`slice-2-android-*.mov / .png`（同 iOS）

**HarmonyOS**：
- 源码：`BookshelfRoot.ets`（扩展）、`BookSearch.ets`、`BookDetail.ets`、`BookDirectory.ets`、`ImmersiveReading.ets`、`ReadingTextFlow.ets`、`TapZones.ets`
- 测试：`reader_entry_reducer.test.ets`
- 证据：`slice-2-harmony-*.mov / .png`（同 iOS，真机或模拟器）

### 4.5 验收门槛

- 书架 → 详情 → 沉浸阅读链路可走通
- 翻页 motion 与 [MOTION_SPEC.md](./MOTION_SPEC.md) §2.3 一致（duration / 方向 / reduced-motion）
- 章节跳转可触发
- 阅读进度经 Core `reader.progress.update` 更新
- canonical location 覆盖本地 readerPageIndex 派生
- 三端 reducer golden test 通过

## 5. Slice 3：Reader Control / overlay / full panel

Reader 控制层的静态结构与视觉输入已由 Figma `15 · Reader 2`、Reader-UI 可执行合同与本地 demo 冻结；Motion 仍按 MR0–MR5 独立闭环。本 Slice 不再保留为空白占位。Figma 负责静态视觉与 Motion Reference，Reader-UI 负责 route/state/action/motion 语义，三个 Host 负责原生渲染、手势、焦点和设备证据。

### 5.1 输入文档

- [READER2_STATIC_DESIGN_DELTA_2026-07-15.md](../docs/design/READER2_STATIC_DESIGN_DELTA_2026-07-15.md)
- [READER_CONTROL_PRIMITIVES.md](../docs/design/READER_CONTROL_PRIMITIVES.md)
- [MOTION_REFERENCE_INDEX_2026-07-15.md](../docs/design/MOTION_REFERENCE_INDEX_2026-07-15.md)
- [MOTION_SPEC.md](./MOTION_SPEC.md)
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §1.3 ReaderShell

### 5.2 范围

- Reader Control Home、七个 canonical module/quick overlay、四个 Full panel 与 Source Switch 连续性。
- `reader.control.toggle`、`reader.module.switch`、`reader.panel.expand/collapse` 的确定性状态转换。
- 控制层 show/hide、quick promote、module switch、panel expand/collapse 的 normal、interrupt 与 reduced-motion。
- Handle / Dock 的命中、拖拽、释放、合法边界与 focus restore；平台测量结果保持 Host-owned。

### 5.3 每端交付物

- 原生 Reader control renderer、overlay/full-panel host、Handle/Dock 与对应 MotionAdapter 映射。
- runtime/coordinator 测试：overlay 互斥、module switch、expand/collapse、latest-wins、reduced-motion 与 focus restore。
- Phone / Compact Landscape / Tablet 的截图或录屏；正文 rect 不因悬浮控制层变化。
- simulator/device evidence；本地合同或 demo 通过不能替代原生实现证明。

### 5.4 验收门槛

- 三端消费同一 Reader-UI contract/runtime 语义，不复制 action table。
- 七个 canonical overlay、四个 Full panel 与 Source Switch 均可达，返回层级与互斥规则成立。
- normal、快速重复、相反操作、interrupt、reduced-motion 和三档 viewport 均收敛到唯一终态。
- Handle/Dock 不跨 safe area / hinge，焦点在 overlay 关闭后返回触发器。
- 三端 reducer/runtime parity test、原生构建与对应设备证据通过。

## 6. Slice 4：Progress / session / focus / TTS

### 6.1 输入文档

- [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §6 Slice 4
- [MOTION_SPEC.md](./MOTION_SPEC.md) §2.5 阅读会话胶囊
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §2.4 TTS / 自动翻页
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) TTS evidence 要求

### 6.2 范围

- TTS session（`activeSession = tts`）
- auto-page session（`activeSession = auto-page`）
- 运行胶囊（capsule）
- 进度更新链路

### 6.3 依赖

- Core bridge 必须先定：`tts.queue.plan / start / pause / resume / stop / seek`、`reader.progress.update / snapshot`
- HostRequest `tts.system.*` 必须三端实现

### 6.4 每端交付物

- 源码：`ReaderSessionCapsule.swift / .kt / .ets`、`TtsController.swift / .kt / .ets`、`AutoPageController.swift / .kt / .ets`、`ReaderReducer+session.swift / .kt / .ets`
- 测试：`ReaderSessionReducerTest.swift / .kt / .ets`（覆盖 TTS / auto-page 互斥 / capsule enter/exit/switch / 进度更新）
- 证据：
  - `slice-4-*-tts-start-stop.mov`（TTS 启动 / 停止录屏）
  - `slice-4-*-auto-page.mov`（自动翻页录屏）
  - `slice-4-*-capsule-switch.mov`（TTS ↔ auto-page 互斥切换）
  - `slice-4-*-progress-update.mov`（翻页触发 progress 更新）

### 6.5 验收门槛

- TTS 启动后 `activeSession = tts`，胶囊显示
- TTS 与 auto-page 互斥
- 胶囊切换时尺寸不抖动
- 翻页触发 `reader.progress.update`，Core 返回 canonical location 覆盖本地派生
- 系统 TTS 真机可播放（不是 demo proof）
- 三端 reducer golden test 通过

## 7. Slice 5：RSS / source / search

### 7.1 输入文档

- [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §7 Slice 5
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §1.4 SettingsShell source、§1.7 DiscoverShell、§1.8 RSS 子 route
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §2.5 发现 / RSS / 搜索

### 7.2 范围

- RSS 列表 / 详情 / 原文 / 浏览器
- 书源管理 / 调试 / 导入 / 导出
- 发现页（搜索 / 筛选 / 排序）
- 搜索历史（归 Core）

### 7.3 依赖

- Core bridge：`rss.* / rss.subscription.* / source.search / source.detail / source.save / source.delete / source.detect / source.debug.run`
- HostRequest `webview.open`（rss-original-browser）

### 7.4 每端交付物

- 源码：`RssRoot*.swift / .kt / .ets`、`RssDetail*.swift / .kt / .ets`、`SourceManagement*.swift / .kt / .ets`、`SourceDebug*.swift / .kt / .ets`、`DiscoverRoot*.swift / .kt / .ets`、`BookSearch*.swift / .kt / .ets`
- 测试：`RssReducerTest.*`、`SourceReducerTest.*`、`DiscoverReducerTest.*`
- 证据：
  - `slice-5-*-rss-list-detail.mov`
  - `slice-5-*-source-management.mov`
  - `slice-5-*-source-debug.mov`
  - `slice-5-*-discover-search.mov`
  - `slice-5-*-book-search.mov`

### 7.5 验收门槛

- RSS 列表 / 详情可走通
- RSS 原文浏览器经 HostRequest `webview.open`
- 书源管理 CRUD 可走通
- 书源调试可执行
- 发现页搜索 / 筛选 / 排序可走通
- 搜索历史由 Core 持久化（不归平台）
- 三端 reducer golden test 通过

## 8. Slice 6：Sync / conflict / offline state

### 8.1 输入文档

- [PAGE_REFERENCE.md](./PAGE_REFERENCE.md) §8 Slice 6
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §1.4 SettingsShell restore
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §2.6 设置 / 同步 / 备份

### 8.2 范围

- 同步 / 备份 / 恢复
- WebDAV 配置
- 同步冲突解决
- offline 状态

### 8.3 依赖

- Core bridge：`sync.snapshot / sync.push / sync.pull / sync.conflict.resolve`
- HostRequest `credential.get / set / delete`、`file.write / read`、`storage.path`

### 8.4 每端交付物

- 源码：`SyncBackup*.swift / .kt / .ets`、`WebdavConfig*.swift / .kt / .ets`、`Restore*.swift / .kt / .ets`、`ConflictResolver*.swift / .kt / .ets`、`OfflineState*.swift / .kt / .ets`
- 测试：`SyncReducerTest.*`、`ConflictResolverTest.*`
- 证据：
  - `slice-6-*-sync-push-pull.mov`
  - `slice-6-*-webdav-config.mov`
  - `slice-6-*-restore-flow.mov`
  - `slice-6-*-conflict-resolve.mov`
  - `slice-6-*-offline-state.mov`

### 8.5 验收门槛

- 同步 push / pull 可走通
- WebDAV 配置保存后凭证经 HostRequest `credential.set`
- 恢复 scopes 选择 → preview → running → result 链路完整
- 冲突解决可走通（5 种 resolution）
- offline 状态不阻断本地查看
- 三端 reducer golden test 通过

## 9. Slice 7：Host Adapter 补齐

### 9.1 输入文档

- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §3 HostRequest 能力清单
- [host-request.schema.json](./host-request.schema.json)
- [ffi-protocol-version.md](./ffi-protocol-version.md)

### 9.2 范围

按 [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §9 Phase 4 优先顺序：

1. HTTP（`http.execute / cancel`）
2. Cookie（`cookie.get / set / clear`）
3. WebView（`webview.open / close / evaluate`）
4. File / storage path（`file.read / write / delete / storage.path`）
5. Credential（`credential.get / set / delete`）
6. TTS（`tts.system.start / stop / pause / resume`）
7. Background task（`background.schedule / cancel`）
8. Notification / share（`notification.show / cancel / share.invoke / clipboard.*`）

### 9.3 依赖

- Slice 0-6 按需：每个 slice 用到的 HostRequest 必须在 Slice 7 对应能力补齐前可用
- Slice 4 TTS 依赖 #6 TTS 能力
- Slice 5 RSS 原文浏览器依赖 #3 WebView 能力
- Slice 6 同步依赖 #4 File / #5 Credential 能力

### 9.4 每端交付物

- 源码：`HostAdapter.swift / .kt / .ets` 完整实现，覆盖 [host-request.schema.json](./host-request.schema.json) 当前 enum 全集（当前机器分母 58）
- 测试：`HostAdapterTest.*`（每个能力至少一个 happy path + 一个 error path）
- 证据：`slice-7-*-host-adapter-coverage.png`（能力覆盖矩阵截图）

### 9.5 验收门槛

- [host-request.schema.json](./host-request.schema.json) 当前全部 58 个 HostRequest type 均有三端计划与实现/豁免证据；分母变化以 schema、fixtures 与 device-conformance gate 为准
- 每个能力有 happy + error path 测试
- HostAdapter 不直接改 Core 或 UI 状态
- initiator 边界成立（reducer 不发起 core-only 能力，反之亦然）

## 10. Slice 8：一致性验证 + 防漂移

### 10.1 输入文档

- [ACCEPTANCE.md](./ACCEPTANCE.md)
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) §6 防漂移检查口径

### 10.2 范围

- contract test（已有，本仓 `contracts/tests/`）
- reducer golden test（三端）
- core protocol test（Reader-Core-Native）
- device smoke test（三端真机）
- 防漂移自动检查（demo / generated / schema 一致性）

### 10.3 依赖

- Slice 1-6 完成
- Slice 7 Host Adapter 完成
- Core bridge mapping 完成

### 10.4 每端交付物

- 测试：全量 reducer golden test、core protocol test、device smoke test
- 证据：
  - `slice-8-*-device-smoke.mov`（真机冷启动 → bookshelf → 打开书 → reader → 翻页 → 进度更新 → TTS → 退出再进入 → 同步进度，覆盖 [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §9 Phase 5 最低验收链路）
  - `slice-8-*-accessibility.mov`（VoiceOver / TalkBack / 屏幕阅读器 focus 迁移录屏）
  - `slice-8-*-reduced-motion.mov`（reduced-motion 降级录屏）
  - `slice-8-*-fold-orientation.mov`（折叠屏 / 旋转录屏，真机或模拟器）

### 10.5 验收门槛

- [CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §10 合并门槛 7 问全部答 yes
- 三端 device smoke test 通过
- 防漂移自动检查脚本全绿（见 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md)）
- 三端无 raw color / spacing / radius / duration（grep + AST 检查）

## 11. Slice 9：多格式、本地书、漫画与媒体交付

### 11.1 输入文档

- [FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md](./FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) B02、C02、C03、C11、E06、F02
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) 中 `local-format-support / pdf-reader / manga-reader / download-queue / download-task-detail / storage-management`
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md)
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) Slice 9 evidence bundle
- `route / ui-event / view-state / content / progress-location / core-command / core-event / host-request / host-result` 当前 schema 与 fixtures

### 11.2 范围

- TXT、EPUB、PDF、Mobi、Umd 的文件选择、权限、解析、元数据、冲突、取消、格式错误与导入恢复。
- PDF/Mobi/Umd 的格式专属 reader 分流；PDF 页面定位、缩放、目录、搜索与恢复。
- 漫画图片序列阅读、横竖屏、缩放、滚动、预加载、缓存失败和 canonical 进度。
- 音频/有声书章节、播放队列、seek、流媒体、音频焦点、后台和媒体键。
- 图片/音频/media download、下载队列、任务详情、取消/重试、校验、缓存、离线消费、空间不足和重启恢复。

### 11.3 Core / Host 前置

- 可复用的当前 Core 命令：`import.parse / import.persist / import.rollback / book.open / book.parse / chapter.list / chapter.load / content.load / reader.progress.update / reader.progress.snapshot / cache.clear / cache.book.prefetch / cache.book.status`。
- Reader-Core-Native 必须在原生业务实现前冻结格式识别结果、PDF/漫画/音频内容描述符、各格式 locator、下载任务/存储配额/媒体 session 的 CoreCommand/CoreEvent 或明确的无 Core 决策；当前合同没有这些完整协议时不得由三端各自发明 DTO。
- Host 必须完成 `file.select / file.read / file.write / file.delete / storage.path / permission.request / permission.check / http.execute / http.cancel / network.status / background.task.start / background.task.end / notification.show / notification.cancel / screen.keepAwake / screen.allowSleep` 的平台映射与错误语义。
- 当前 HostRequest 没有通用音频播放器、音频焦点或媒体按键完整协议；必须先补合同、fixtures、三端 Host mapping 和测试，再接有声书生产 effect。系统 TTS 不能冒充音频内容播放器。

### 11.4 三端交付物

| 平台 | 原生源码 | 测试 | 最低 evidence |
| --- | --- | --- | --- |
| iOS | `LocalImportFlow`、格式 reader router、`PDFReaderView`、`MangaReaderView`、`AudioReaderView`、`DownloadQueueView`、`StorageManagementView` 与对应 reducer/effect/Host adapter | 五格式 corpus、locator round-trip、下载事务、后台/音频焦点、空间不足和重启恢复测试 | `slice-9-ios-format-corpus.json`、`slice-9-ios-import-reader.mov`、`slice-9-ios-pdf-manga.mov`、`slice-9-ios-media-download-device.mov` |
| Android | Compose 对应 screen、format router、Media/Download/Storage adapter | 与 iOS 同一 corpus 和 canonical expected result；补 Activity/permission/background 恢复 | `slice-9-android-format-corpus.json`、`slice-9-android-import-reader.mp4`、`slice-9-android-pdf-manga.mp4`、`slice-9-android-media-download-device.mp4` |
| HarmonyOS | ArkUI 对应 page、format router、Media/Download/Storage Host adapter | 与同一 corpus 对齐；补授权 URI、后台任务和真机恢复 | `slice-9-harmony-format-corpus.json`、`slice-9-harmony-import-reader.mp4`、`slice-9-harmony-pdf-manga.mp4`、`slice-9-harmony-media-download-device.mp4` |

三端还必须提交：generated types 编译、reducer golden、Core protocol mapping、Host happy/error、每种格式至少一条真实文件证据，以及 `evidence/manifest.json` 的 `slice-9` 登记。

### 11.5 验收门槛

- 五种本地真实文件与至少一组真实漫画、一组真实音频/媒体源在三端通过相同导入→打开→继续阅读/播放→缓存→退出→重启恢复链。
- PDF、漫画、音频使用格式专属 renderer 和 locator；禁止静默降级为 `ReadingTextFlow`，不支持时必须返回结构化 unsupported/error。
- 下载任务在成功、失败、取消、重试、空间不足、断网、重启后有唯一 canonical 状态，凭据与文件句柄不进入 UI 持久化。
- 三端同 corpus 的元数据、章节/页面、locator 和错误分类一致；平台差异只能出现在 Host 层并有豁免说明。
- Slice 9 evidence bundle 在三端 manifest 中均为 `passed` 后才可验收；本地 demo 或 fixture 校验不替代 App/device proof。

## 12. Slice 10：阅读数据、编辑、规则、封面与扩展 TTS

### 12.1 输入文档

- [FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md](./FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) C04–C10、D02、D03
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) 中书签、编辑、替换、封面、段评、HttpTTS 与设置 route
- [MOTION_SPEC.md](./MOTION_SPEC.md) Reader control、session、确认、取消与中断语义
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md)
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) Slice 10 evidence bundle

### 12.2 范围

- 目录、书签、阅读记录、全文搜索和定位回跳。
- 正文编辑、保存、冲突、撤销与恢复原文。
- ReplaceRule、DictRule、TxtTocRule 的 CRUD、校验、预览、应用、排序和回滚。
- 换源搜索/预览/章节匹配/提交/回滚；封面搜索、解密、预览、更换和缓存。
- 章节段评/评论的列表、加载、空、错和章节切换。
- HttpTTS 服务 CRUD、模板校验、请求构建、试听、默认选择、播放与凭据保护。
- 自动翻页/TTS/媒体键/后台的唯一 Reader session 与互斥恢复。

### 12.3 Core / Host 前置

- 当前可复用命令包括 `content.search / content.replace / replace.* / source.search / source.change / source.switch.* / tts.queue.* / config.loadPersisted / config.savePersisted`。
- Reader-Core-Native 必须补齐并冻结书签、历史、正文编辑/恢复、三类规则实体、封面、段评、HttpTTS 配置的 CRUD、版本、冲突、回滚与持久化协议；业务实体只能由 Core 持有。
- HttpTTS 网络请求必须由 Core 产安全 descriptor，Host 经 `http.execute` 执行；credential、Cookie、临时文件与播放器对象保留在 Host。
- 媒体按键、后台播放和音频焦点若仍无 HostRequest/HostResult 合同，必须先补合同与三端 capability tests；不得通过平台全局单例绕过 reducer/effect。

### 12.4 三端交付物

| 平台 | 原生源码 | 测试 | 最低 evidence |
| --- | --- | --- | --- |
| iOS | Bookmark/History/Search、ContentEdit、RuleEditor、SourceSwitch、Cover、Reviews、HttpTTS、Session 原生 view 与 reducer/effect | 实体 CRUD、事务回滚、重启持久化、HttpTTS descriptor/credential、session 互斥 golden | `slice-10-ios-reading-data.mov`、`slice-10-ios-edit-rules.mov`、`slice-10-ios-cover-review.mov`、`slice-10-ios-http-tts-device.mov` |
| Android | Compose 对应 screen 与 effect/Host adapter | 同一 fixture/corpus、进程重建、MediaSession/后台测试 | `slice-10-android-reading-data.mp4`、`slice-10-android-edit-rules.mp4`、`slice-10-android-cover-review.mp4`、`slice-10-android-http-tts-device.mp4` |
| HarmonyOS | ArkUI 对应 page 与 effect/Host adapter | 同一 fixture/corpus、Ability 生命周期、媒体控制和真机测试 | `slice-10-harmony-reading-data.mp4`、`slice-10-harmony-edit-rules.mp4`、`slice-10-harmony-cover-review.mp4`、`slice-10-harmony-http-tts-device.mp4` |

三端还必须提交相同实体 fixture/corpus、Core protocol result、reducer golden、Host happy/error 与 `slice-10` manifest 登记。

### 12.5 验收门槛

- 所有实体经 reducer→effect→Core 单链修改并在重启后恢复；三端不得在 UserDefaults/DataStore/preferences/AppStorage 维护第二份业务数据。
- 编辑、规则、换源、封面和 HttpTTS 覆盖正常、加载、空、错误、取消、冲突、回滚及重启恢复。
- 搜索/书签/历史定位到同一 canonical locator；换源失败保持原书源、章节与阅读进度。
- TTS、自动翻页和内容音频任一时刻只有一个 active session；系统中断、媒体键、后台和 reduced-motion 后收敛到唯一状态。
- 三端 manifest 的 Slice 10 能力覆盖和 evidence bundle 全部 `passed`。

## 13. Slice 11：动态书源、规则订阅、登录挑战与 RSS 深链

### 13.1 输入文档

- [FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md](./FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) E00–E06
- [ROUTE_COMPONENT_MATRIX.md](./ROUTE_COMPONENT_MATRIX.md) Source、WebView challenge、RSS 与下载 route
- [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md)
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) Slice 11 evidence bundle
- Reader-Core-Native Legado capability inventory、DSL/version/corpus 与 Host descriptor 协议

### 13.2 范围

- Legado CSS/XPath/JSONPath/Regex/变量/JS/链式规则的版本、编辑、诊断位置、阶段日志和兼容能力集。
- 书源 CRUD、导入导出、分组、检测、订阅、版本冲突和逐阶段调试。
- WebView 登录、验证码、Cookie/profile 隔离、反爬 challenge、成功/取消/超时与回流重试。
- RSS 规则订阅、收藏、阅读记录、分组、原文浏览器、认证源和受保护 media download。

### 13.3 Core / Host 前置

- Slice 5 的 `source.* / rss.*` 主链和 Slice 7 的 `http.* / cookie.* / webview.* / credential.* / file.* / network.status` 必须先有真实平台实现与结构化 HostResult。
- Core 必须冻结 DSL 版本、语法/阶段诊断、JS sandbox、RuleSub/RSS subscription、profile/cookie handle、challenge continuation 和受保护下载 descriptor；Host 只执行 descriptor，不解释规则。
- WebView profile、Cookie 与 credential 必须按 source/account 隔离；回传 Core 的只能是受合同约束的数据或 opaque handle，禁止明文凭据、平台 WebView 对象或任意脚本执行句柄跨边界。

### 13.4 三端交付物

| 平台 | 原生源码 | 测试 | 最低 evidence |
| --- | --- | --- | --- |
| iOS | Source/Rule/Subscription editor、WebView challenge coordinator、RSS 深链与 protected download adapter | 同一真实源 corpus、Cookie/profile 隔离、captcha/challenge continuation、取消/超时/重试 | `slice-11-ios-source-corpus.json`、`slice-11-ios-rule-debug.mov`、`slice-11-ios-webview-challenge-device.mov`、`slice-11-ios-rss-protected.mov` |
| Android | Compose editor、Custom Tabs/WebView coordinator、RSS/protected download adapter | 与同一 corpus 对齐；进程重建和 WebView/profile 测试 | `slice-11-android-source-corpus.json`、`slice-11-android-rule-debug.mp4`、`slice-11-android-webview-challenge-device.mp4`、`slice-11-android-rss-protected.mp4` |
| HarmonyOS | ArkUI editor、Web coordinator、RSS/protected download Host adapter | 与同一 corpus 对齐；真机 Web/Cookie/challenge/回流测试 | `slice-11-harmony-source-corpus.json`、`slice-11-harmony-rule-debug.mp4`、`slice-11-harmony-webview-challenge-device.mp4`、`slice-11-harmony-rss-protected.mp4` |

三端还必须提交 source/RuleSub/RSS fixture、Core corpus diff、Host capability tests、安全审计记录和 `slice-11` manifest 登记。

### 13.5 验收门槛

- 至少一组普通 HTTP 源、一组 Cookie 登录源、一组 WebView/captcha/challenge 源和一组 RSS 规则源在 CLI 与三端得到 canonical 同结果。
- 编辑器能显示 DSL 版本、语法位置、执行阶段和 Host-required 分类；JS 在受限 sandbox 执行，Host 不建立第二套规则解释器。
- 登录成功、取消、超时、验证码失败、挑战刷新、Cookie 回流和重新请求均有可恢复状态；不同 profile 不串 Cookie/credential。
- 受保护图片/音频下载在授权、断网、失效 URL、重试、文件校验和离线消费上有真机证据。
- 三端 manifest 的 Slice 11 corpus、安全、Host 与 App/device evidence 全部 `passed`。

## 14. Slice 12：完整应用生命周期、设置、无障碍与 Release Gate

### 14.1 输入文档

- [FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md](./FULL_PRODUCT_CAPABILITY_DELIVERY_MATRIX.md) A02–A05、F03–F07
- [ACCEPTANCE.md](./ACCEPTANCE.md)
- [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) Slice 12 evidence bundle 与 manifest schema
- [CONTRACT_VERSIONING.md](./CONTRACT_VERSIONING.md)、`UI_RELEASE_MANIFEST.json`、consumer lock 与 device-conformance 规则
- Figma VC0–VC3 / Motion MR1–MR5 对应页面族的已确认设计输入；设计确认不替代原生设备证据

### 14.2 范围

- onboarding、能力配置、权限教育、拒绝/永久拒绝、系统设置回流和恢复。
- 通用、TTS、存储、通知、无障碍、开发者、关于、日志和危险设置的 owner、默认值、持久化、确认与重置。
- Phone、Compact Landscape、Tablet、fold posture 的全页面族布局、键盘、安全区、旋转/折叠和状态恢复。
- VoiceOver、TalkBack、屏幕阅读器、动态字体、对比度、触控尺寸、reduced-motion 与性能预算。
- background、notification、share、clipboard 的真实业务入口、权限、取消和恢复。
- Reader-UI/Core 不可变制品、精确 source/manifest digest、三端 consumer lock、同 corpus、回滚和完整 App/device 旅程。

### 14.3 Core / Host 前置

- Slice 0–11 的合同、Core bridge、Host adapter 与三端分域 evidence 必须关闭；Slice 12 不接收用 mock Core、浏览器 demo 或 summary-only 替代的证据。
- Core 必须冻结设置/业务数据 owner、初始化与恢复结果、同 corpus expected result 和兼容迁移；Host 必须完成 permission/background/notification/share/clipboard/device/screen/storage 等真实系统能力。
- 发布身份必须来自精确 Reader-UI source SHA + `UI_RELEASE_MANIFEST.json` SHA-256 + Core artifact digest + 三端 consumer lock，不能自报 tag 或使用未验证工作树摘要。

### 14.4 三端交付物

| 平台 | 原生源码 | 测试 | 最低 evidence |
| --- | --- | --- | --- |
| iOS | Onboarding/Permission/Settings/Accessibility shell、生命周期和系统集成 adapter、Release smoke harness | UI/reducer/Host、VoiceOver、动态字体、旋转/多窗口、后台恢复、性能与迁移 | `slice-12-ios-complete-journey-device.mov`、`slice-12-ios-accessibility.mov`、`slice-12-ios-performance.json`、`slice-12-ios-release-lock.json` |
| Android | Compose 对应 flow、权限/设置回流、系统集成和 Release harness | TalkBack、字体缩放、Phone/Tablet/Fold、进程恢复、后台限制、性能与迁移 | `slice-12-android-complete-journey-device.mp4`、`slice-12-android-accessibility.mp4`、`slice-12-android-performance.json`、`slice-12-android-release-lock.json` |
| HarmonyOS | ArkUI 对应 flow、权限/设置回流、系统集成和 Release harness | 屏幕阅读器、字体、Phone/Tablet/Fold、Ability 恢复、后台、性能与迁移 | `slice-12-harmony-complete-journey-device.mp4`、`slice-12-harmony-accessibility.mp4`、`slice-12-harmony-performance.json`、`slice-12-harmony-release-lock.json` |

三端还必须提交 Slice 9–11 分域 smoke 索引、同 corpus diff、全量构建/测试报告、release/consumer lock、回滚演练和 `slice-12` manifest 登记。

### 14.5 验收门槛

- 三端均完成首次启动→权限→导入或搜索→格式正确的阅读→编辑/书签/TTS→缓存/下载→同步恢复→退出重进的完整旅程。
- Slice 9、10、11 每个分域至少一条真实 App/device smoke；单一文本书架→阅读→TTS smoke 不再代表完整应用。
- Phone/横屏/Tablet/Fold、无障碍、动态字体、键盘、安全区、reduced-motion 和性能预算均通过；不可用的平台形态必须登记明确豁免、原因和替代证据。
- Reader-UI/Core artifact digest 与三端 consumer lock 完全一致，同 corpus diff=0，升级/降级/回滚演练成功。
- `platform-evidence-manifest.schema.json` 校验通过，Slice 0–12 均已登记，Slice 12 及其依赖 Slice 9–11 在三端均为 `passed`，且实际 artifact digest 可重算。

## 15. 并行 / 串行约束

### 15.1 可并行的 slice

- Slice 0：三端各自接入 generated types，完全并行
- Slice 1：三端各自实现 AppShell + 4 Tab，完全并行
- Slice 2-6：三端各自实现，但依赖 Core bridge 先定对应命令
- Slice 5 可与 Slice 2-4 并行（不同业务域）
- Slice 7 Host Adapter 各能力可并行实现
- Slice 9 可按本地格式、PDF、漫画、音频、下载/存储 lane 并行；共享 locator、文件授权和媒体 session 协议先串行冻结。
- Slice 10 可按阅读数据、编辑/规则、换源/封面/段评、HttpTTS lane 并行；共享实体 owner、事务和 session 协议先串行冻结。
- Slice 11 的 DSL/订阅、WebView challenge、RSS/protected download 可并行；共享 profile、Cookie、credential 与 continuation 协议先串行冻结。
- Slice 12 的 onboarding、设置壳、无障碍测试设施和 release tooling 可从早期并行建设，但不得提前声明最终验收。

### 15.2 必须串行的 slice

- Slice 1 → Slice 2（bookshelf → reader 需要 Slice 1 的 AppShell）
- Slice 2 → Slice 3（reader overlay 需要 Slice 2 的 immersive-reading）
- Slice 6 需要 Slice 5（sync 需要 source / rss 链路先定）
- Slice 8 需要 Slice 1-7 全部完成，作为既有主链基线门禁。
- Slice 2 + 对应 File/Permission/Storage Host + 格式/媒体 Core 协议 → Slice 9 原生业务 effect。
- Slice 2/4/5 + 实体 Core 协议 → Slice 10 原生业务 effect。
- Slice 5 + HTTP/Cookie/WebView/Credential Host → Slice 11 登录挑战和动态源验收。
- Slice 9–11 分域验收全部通过 → Slice 12 全产品 Release Gate。
- 每个能力族均按“合同/schema/fixtures → Core/Host mapping → 三端原生实现 → App/device evidence”串行；mock 只允许在前两步并行开发，不能进入 `passed`。

### 15.3 Core bridge 串行约束

每个 slice 的 Core bridge 必须先于该 slice 实现：

| Slice | 必须先定的 Core 命令 |
| --- | --- |
| Slice 2 | `book.open / book.parse / chapter.list / content.load / reader.location.resolve / reader.progress.update / source.detail / source.search / bookshelf.list` |
| Slice 4 | `tts.queue.plan / start / pause / resume / stop / seek` |
| Slice 5 | `rss.* / source.search / source.detail / source.save / source.delete / source.detect / source.debug.run` |
| Slice 6 | `sync.snapshot / sync.push / sync.pull / sync.conflict.resolve` |
| Slice 9 | 当前 `import.* / book.* / content.load / reader.progress.* / cache.*` + 待冻结的格式 descriptor、PDF/漫画/音频 locator、download/storage/media session 协议 |
| Slice 10 | 当前 `content.search / content.replace / replace.* / source.switch.* / tts.queue.* / config.*` + 待冻结的书签/历史/编辑/规则/封面/段评/HttpTTS 实体协议 |
| Slice 11 | 当前 `source.* / rss.*` + 待冻结的 DSL/version/diagnostic、RuleSub、challenge continuation、profile 与 protected download 协议 |
| Slice 12 | 初始化/恢复、设置 owner、迁移、release/corpus identity；不得以 UI-only 状态替代 Core 结果 |

Core bridge mapping 归 Reader-Core-Native 仓库。如果某 slice 的 Core 命令未对齐，三端 reducer 可以先用 mock Core bridge 实现，但 device smoke test 必须用真实 Core。Slice 9–12 中标为“待冻结”的协议是正式前置任务，不表示当前 schema 已经具备对应生产能力。

## 16. 三端禁止项

每个 slice 三端实现禁止：

- 禁止绕过 generated types 自己手写 RouteId / MotionId / ComponentType enum
- 禁止在组件代码中硬编码 raw color / spacing / radius / duration（见 [TOKEN_SPEC.md](./TOKEN_SPEC.md) §4）
- 禁止 UI 直接调用 Core（必须经 reducer + CoreCommand）
- 禁止 UI 直接持久化业务数据（见 [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §1.1）
- 禁止用 Web CSS / DOM 行为作为实现依据（见 [MOTION_SPEC.md](./MOTION_SPEC.md) §5）
- 禁止单端无限向前跑（每个 slice 三端一起验收）
- 禁止把 Slice 9–12 的计划登记、D6 预览或空 evidence manifest 当成 runtime/native/device 完成证明
- 禁止把 PDF、漫画、Mobi、Umd 或音频内容静默降级到文本 reader
- 禁止 Host 解释 Legado 规则、Core 持有平台对象，或三端自行扩展未登记 DTO

## 17. 当前状态与施工入口

阶段 3 SLICE_PLAN 已正式定义 Slice 0–12 启动顺序、输入、Core/Host 前置、三端交付物、证据与并行/串行约束。当前只表示计划闭合，不表示 Slice 9–12 的业务实现闭合。后续施工入口：
- 实际排期归各端项目管理
- Slice 9–11 中列出的待冻结 Core/Host 协议由 Reader-Core-Native 与 Reader-UI 合同变更先行，三端不得越过协议直接实现私有版本
- 各端先在 `evidence/manifest.json` 登记 Slice 0–12，状态保持 `planned / in-progress / blocked`；只有达到 schema 与 [PLATFORM_EVIDENCE_SPEC.md](./PLATFORM_EVIDENCE_SPEC.md) 的门槛后才能改为 `passed`
- 真机 / 模拟器 evidence、corpus、性能与 release lock 归各端仓库；Reader-UI 只提供 schema、fixture 和门禁，不保存或代填平台执行证据
