# 此设计稿的生产实施映射

这是设计输入与当前漫画候选代码的静态映射，不记录活动进度，不以文件存在判定完成。Host 分支基线 `codex/manga-integration-20260927` / `12327169d138eac057d4053adcab72ab5ad3ae26`；本稿隔离 sibling worktree 为 `.reader-isolated/manga-ui-20261002`。生产 UI 仍在 `Reader-for-HarmonyOS`，本 UI 仓只归档设计与契约。

| 设计面 | 要落实的视觉与信息行为 | Host 既有落点／接点 | 保留的事实与业务 owner |
|---|---|---|---|
| 浮栏与主导航 | 顶底悬浮；完整内容可从 R 角外通过；两项主 Tab 196×68，明确深绿选中态；数量变化仍数据驱动 | `features/common/ReaderFloatingBarMetrics.ts`、`PageBackBar.ets`、`AppTopBar.ets`、`features/shell/MainTabBar.ets`／`MainTabShell.ets`、`BookshelfShell.ets` | WindowCoordinator／SurfaceHorizontalGeometry；不另造测量系统，不重复计安全区；MAIN_TABS 门禁不改变 |
| 共用书架漫画适配 | 类型与来源为独立筛选；两个标签；当前话／卷＋页；最新条目＋章节百分比；继续阅读进入原位置 | `features/bookshelf/BookshelfPage.ets`、`ShelfBookListDetails.ets`、`ShelfBookPresentation.ts`；沿现有封面占位 | Core 内容类型、书架／阅读位置 owner；未知总数位置按既有规则，demo 57% 不成为公式 |
| 共用搜索漫画适配 | 类型／来源分别筛选；漫画标签、来源与最新话；未读结果无虚构阅读进度 | `features/search/SearchPage.ets`、`SearchBookProjection.ts`、`SearchResultProjection.ts`、`SearchViewState.ts` | 原 query/groupKey、媒体 identity、回退视口；小说与漫画不可仅按同名合并 |
| 漫画详情 | 真正居中标题；封面／书名／作者／标签；来源、当前位置、简介与目录预览有明确层次；悬浮继续阅读＋入架／移除；右侧不放未定义更多 | `features/bookshelf/LocalBookDetail.ets`、`BookDirectoryPage.ets`；`pages/Index.ets` 只做最小路由／回调接线 | 实际 metadata、sourceId/bookId、原 read/remove/add 事务；不复制虚构数据 |
| 三处目录 | 卷组只展开；普通话与可读整卷直接进入；相同层级、当前条目、计数及明确动作 | `features/reading/ReaderDirectoryNavigationSurface.ets`／`List.ets`、`ReaderDirectoryNavigation.ts`、`ReaderControlDirectoryContent.ets`、`features/bookshelf/BookDirectoryPage.ets` | Core navigation target/proof、group/child/readable 类型；不可用标题规则猜“卷”或把行索引当 target |
| 动态换源 | 0 个候选、增量出现、真实延迟重排；停止／重查保持已发现项；点选直接读；点击过程中冻结目标身份 | `features/source/SourceSwitchGateway.ts`、原换源页／弹层；`features/manga/MangaSourceSwitchGateway.ts` | 原发现会话、准入、target identity、首图 receipt、commit 与位置映射；不以 timer 做真实发现，不新增独立换源事务 |
| 书源管理／导入 | 复用 M04 原有漫画类型筛选与 M05 三种导入入口；来源元信息、启用、搜索视觉一致 | `features/source/SourceManagementPage.ets`、`ReaderSourceCategory.ts`、`SourceToolsPage.ets`／Orchestrator；`features/common/JsonImportDialog.ets` | 原 source queue／save／import owner；复用共同 Dialog/Sheet 外壳，不新造漫画书源工具 |
| 漫画阅读六态 | 沉浸／控制栏／目录／方式／设置／更多／章末；底部三个漫画动作；只展示有真实能力的更多项 | `features/manga/MangaReadingSurface.ets`、`MangaSessionController.ts`／Gateway；`features/reading/ReaderControlPanel.ets`／`LocalReadingExperience.ets` 的既有接点 | 原 session、逻辑 pageId/ordinal、manifest、位置持久化、首图/切片、资源释放；不重写图片引擎 |
| 横屏／平板／深墨 | 原控件与布局按窗口适配；宽屏目录侧栏；暖纸／深墨覆盖各页与面板；文字、边界、触区清楚 | 原窗口 metrics／主题 registry／reader settings；漫画 surface 与领域页面布局 | 方向／fit 设置与 native 亮度 lease 归原 owner；图片内像素不因主题变色；实际能力未具备的动作不伪装可用 |

## 实施边界

- 这次授权将归档稿转为实施基准；不扩大为漫画发现、下载中心、版次选择、TTS、文字替换、文字字体／排版、书内文字搜索、文字书签或 TXT 规则。
- 共享加载、错误、忙碌、恢复、确认、Toast 与统一组件架构由原整合工作承接，漫画页只消费实际共用接口；本稿不建立第二套通用状态或事务框架。
- 主线当前浮栏修复及 Dialog 隔离候选的确切字节另行三方整合，不能覆盖原 `Index`／LRE 或其他并行改动。新 worktree 可修改自己的增量，原主线和原 demo 保留。
- 样例图只用于设计占位；生产封面沿 NoCoverCover，漫画图片沿现有清单与资源链。总章节进度只显示已定义的可靠事实；未知状态保持未知。
- 页序滑块、亮度与模式选项必须沿原准入、连续预览／提交／取消、已确认位置和资源代际合同；DOM demo 交互不能证明 native 事务已经成立。
- Core/UI DTO 的逻辑页身份与资源引用边界继续沿 `contracts/manga.ts` 与 Host `MangaContract.ts`，无需为布局新造解析器、图片解码器、缓存淘汰或通用匹配算法。

本地方法回归、ArkTS/SDK、规范 HAP、VM、真机、视觉对照和用户验收分别取证。原 `records/QA.md` 只证明原网页设计稿，不能继承为新 Host 组合通过。
