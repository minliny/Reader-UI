# 页面框架使用审计

本文逐页记录当前 `frontend-input/` 是否使用同一套页面框架。结论用于安排后续 shell kit 迁移，不用于否定现有视觉输入件。

## 总结

| 检查项 | 结果 | 说明 |
| --- | --- | --- |
| 统一交付格式 | 30/30 已统一 | 每页都有独立输入包、fixture、renderer、preview、state matrix 和 manifest 目标。 |
| 统一设计 token | 30/30 已统一 | 每页直接或间接接入 `tokens.css`。 |
| 统一公共组件语义 | 已统一主要框架 | 公共库已沉淀组件名；设置链路、主标签页、书架链路和阅读链路 10/10 已收敛到对应 kit。 |
| 统一页面 shell | 已统一 | 设置链路 7/7 已使用 `SettingsPageKit`，主标签页 4/4 已使用 `MainTabPageKit`，书架链路 8/8 已使用 `LibraryPageKit`；阅读链路 10/10 已使用中心化 `ReaderShellKit`，换源已使用中心化 `FlowShell`。 |
| 可直接真实前端接入 | 具备本地输入基础 | `shellName`、slots、state model、主要 renderer kit 和 DOM slot 校验已归一；真实前端映射见 `FRONTEND_MAPPING_GUIDE.md`。 |

## 逐页矩阵

| 页面 | 目标 shell | 当前 renderer | 当前 frame | 状态 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| `02-主标签页/书架` | `MainTabShell` | `BookshelfInput` | `mt-app-frame bs-phone-frame` | 已使用 `MainTabPageKit` | 保留书架内容 slot，后续真实前端映射。 |
| `02-主标签页/发现` | `MainTabShell` | `DiscoveryHomeInput` | `mt-app-frame ds-page-frame` | 已使用 `MainTabPageKit` | 保留发现内容 slot，后续真实前端映射。 |
| `02-主标签页/RSS` | `MainTabShell` | `RssHomeInput` | `mt-app-frame rs-page-frame` | 已使用 `MainTabPageKit` | 保留 RSS 内容 slot，后续真实前端映射。 |
| `02-主标签页/设置` | `MainTabShell` | `SettingsHomeInput` | `mt-app-frame rl-app-frame st-page-frame` | 已使用 `MainTabPageKit` | 保留设置首页内容 slot，后续真实前端映射。 |
| `03-书架链路/书架空状态` | `LibraryShell` | `BookshelfEmptyInput` | `lk-stack-frame se-page-frame` | 已使用 `LibraryPageKit` | 空态内容进入 `StateHost`，底部主导航进入 `BottomActionHost`。 |
| `03-书架链路/书籍搜索` | `LibraryShell` | `BookSearchInput` | `lk-stack-frame ss-page-frame` | 已使用 `LibraryPageKit` | 搜索控制和结果区进入 `ContentRegion`，提交按钮进入 `BottomActionHost`。 |
| `03-书架链路/书籍详情` | `LibraryShell` | `BookDetailInput` | `lk-stack-frame bd-page-frame` | 已使用 `LibraryPageKit` | 保持详情内容 slot，继续与目录、操作底表共享书籍上下文。 |
| `03-书架链路/书籍目录` | `LibraryShell` | `BookDirectoryInput` | `lk-stack-frame dr-page-frame` | 已使用 `LibraryPageKit` | 保持章节列表内容 slot，继续与详情共享章节语义。 |
| `03-书架链路/排序与筛选` | `LibraryShell` | `SortFilterInput` | `lk-stack-frame sf-page-frame` | 已使用 `LibraryPageKit` | 来源书架进入 `ContentRegion`，遮罩和底表进入对应宿主。 |
| `03-书架链路/书籍操作底表` | `LibraryShell` | `BookActionSheetInput` | `lk-stack-frame ba-page-frame` | 已使用 `LibraryPageKit` | 已迁入 `SheetHost + DialogHost`，保留底表和确认弹窗上下文。 |
| `03-书架链路/分组管理` | `LibraryShell` | `GroupManagementInput` | `lk-stack-frame gm-page-frame` | 已使用 `LibraryPageKit` | 分组列表进入 `ContentRegion`，命名和删除弹窗进入 `DialogHost`。 |
| `03-书架链路/本地书导入` | `LibraryShell` | `LocalImportInput` | `lk-stack-frame li-page-frame` | 已使用 `LibraryPageKit` | 导入流程进入 `ContentRegion`，结果页底部操作进入 `BottomActionHost`。 |
| `04-阅读链路/阅读控制层` | `ReaderShell` | `ReaderControlInput` | `rsk-reader-frame rc-page-frame` | 已使用 `ReaderShellKit` | 作为 `ReaderShell` 基准，固定四按钮交互规则。 |
| `04-阅读链路/目录与书签` | `ReaderShell` | `ReadingTocBookmarkInput` | `rsk-reader-frame tb-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReadingSurface + ReaderOverlayHost + BottomSheetHost`，视觉导航保留在模块面板内。 |
| `04-阅读链路/阅读外观` | `ReaderShell` | `ReadingAppearanceInput` | `rsk-reader-frame ra-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReadingSurface + ReaderOverlayHost + BottomSheetHost`，保留预览卡内容。 |
| `04-阅读链路/朗读` | `ReaderShell` | `ReadingAloudInput` | `rsk-reader-frame al-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReadingSurface + ReaderOverlayHost + BottomSheetHost`，复用运行态。 |
| `04-阅读链路/阅读设置` | `ReaderShell` | `ReadingSettingsInput` | `rsk-reader-frame rset-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReaderShell`，保留分组设置语义。 |
| `04-阅读链路/自动翻页` | `ReaderShell` | `AutoPageInput` | `rsk-reader-frame ap-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReadingSurface + ReaderOverlayHost + BottomSheetHost`，运行态进入统一 state model。 |
| `04-阅读链路/内容搜索` | `ReaderShell` | `ContentSearchInput` | `rsk-reader-frame cs-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReaderOverlayHost + BottomSheetHost`，保留键盘安全区内容。 |
| `04-阅读链路/内容替换` | `ReaderShell` | `ContentReplacementInput` | `rsk-reader-frame cr-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReaderOverlayHost + BottomSheetHost`，表单保存状态统一。 |
| `04-阅读链路/阅读入口` | `ReaderShell` | `ReadingEntryInput` | `rsk-reader-frame re-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReaderStateHost`，保留书籍和进度上下文。 |
| `04-阅读链路/沉浸阅读` | `ReaderShell` | `ImmersiveReadingInput` | `rsk-reader-frame ir-page-frame` | 已使用 `ReaderShellKit` | 已迁入 `ReadingSurface + ReaderStateHost`，不出现主底部导航。 |
| `04-阅读链路/换源` | `FlowShell` | `SourceSwitchInput` | `rsk-flow-frame sw-flow-frame` | 已使用 `ReaderShellKit.renderFlowShell(...)` | 保留横屏验证，后续真实前端映射。 |
| `05-设置链路/App通用设置` | `SettingsShell` | `GeneralSettingsInput` | `sk-page-frame gs-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/书架与搜索设置` | `SettingsShell` | `BookshelfSearchSettingsInput` | `sk-page-frame bks-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/隐私与权限` | `SettingsShell` | `PrivacyPermissionsInput` | `sk-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/缓存管理` | `SettingsShell` | `CacheManagementInput` | `sk-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/关于与反馈` | `SettingsShell` | `AboutFeedbackInput` | `sk-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/同步与备份` | `SettingsShell` | `SyncBackupInput` | `sk-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |
| `05-设置链路/书源管理` | `SettingsShell` | `SourceManagementInput` | `sk-page-frame` | 已使用 `SettingsPageKit` | 已通过 SettingsShell DOM slot 校验。 |

## 开发批次

### Batch 0：补元数据，不改视觉

状态：已完成。

- `contracts.d.ts` 已增加 `PageShellName`、`PageRole`、`PageShellContract`、`PageSlotName`、`PageStateModelContract`。
- `manifest.json` 已给 64 个 target 增加 `shellName`、`pageRole`、`slots`、`stateModel`，其中包括公共组件库（Component Library）、共享 Shell Kit（Shared Shell Kit）、公共素材库（Asset Library）和前端 Demo 设计稿目标。
- `validate-frontend-inputs.js` 已校验 shell 元数据存在，并暂不要求 DOM 迁移。

完成后收益：先让页面归属明确，后续迁移不会继续产生新漂移。

### Batch 1：统一 SettingsShell

状态：已完成。

- `App通用设置` 已迁入 `SettingsPageKit`，renderer 仅保留 fixture 到 settings shell 的薄适配。
- `书架与搜索设置` 已迁入 `SettingsPageKit`，renderer 仅保留 fixture 到 settings shell 的薄适配。
- 7 个设置页都输出 `sk-page-frame`，并复用同一状态矩阵结构。

完成后收益：最小风险拿到第一条完整统一 shell。

### Batch 2：抽 MainTabShell

状态：已完成。

- 已新增 `02-主标签页/shared-main-tab-kit/`，统一 `AppFrame`、`StatusBar`、`AppTopBar`、`ContentRegion`、`MainNav` 和 `StateHost`。
- 书架、发现、RSS、设置首页已接入 `MainTabPageKit`，页面 renderer 只保留内容 slot 组装。
- 验证脚本已校验 MainTabShell DOM slots、四个主导航按钮顺序、唯一 active 状态和图标 shell 数量。

完成后收益：App 根框架稳定，后续所有二级链路有明确入口。

### Batch 3：抽 LibraryShell

状态：已完成。

- 已新增 `03-书架链路/shared-library-kit/`，统一 `StackFrame`、`BackTopBar`、`ContentRegion`、`BottomActionHost`、`SheetHost`、`DialogHost` 和 `StateHost`。
- `书架空状态` 已接入 `LibraryPageKit`，renderer 只提交分组 chip、空态内容、提示和公共主导航。
- `书籍搜索` 已接入 `LibraryPageKit`，renderer 只提交搜索框、范围、结果/历史内容和底部搜索按钮。
- `书籍详情` 已接入 `LibraryPageKit`，renderer 只提交详情头部、章节预览、简介和换源底表。
- `书籍目录` 已接入 `LibraryPageKit`，renderer 只提交目录摘要、当前章节和章节列表。
- `排序与筛选` 已接入 `LibraryPageKit`，renderer 只提交来源书架上下文、遮罩和底表。
- `书籍操作底表` 已接入 `LibraryPageKit`，renderer 只提交书架背景内容、底表和确认弹窗。
- `分组管理` 已接入 `LibraryPageKit`，renderer 只提交分组列表、命名弹窗和删除确认。
- `本地书导入` 已接入 `LibraryPageKit`，renderer 只提交导入流程、权限说明、结果列表和底部操作。
- 验证脚本已对 8 个 `LibraryPageKit` 页面增量校验真实 DOM slots。

完成后收益：书架链路从页面拼装变成数据驱动栈。

### Batch 4：抽 ReaderShell 和 FlowShell

状态：已完成。

- `阅读控制层`、`目录与书签`、`阅读外观`、`朗读`、`阅读设置` 已接入 `ReaderShellKit.renderReaderShell(...)`。
- `自动翻页`、`内容搜索`、`内容替换`、`阅读入口`、`沉浸阅读` 已接入 `ReaderShellKit.renderReaderShell(...)`。
- 10 个阅读页面的 preview 和 state matrix 已通过真实 DOM slots 校验。
- `换源` 已接入 `ReaderShellKit.renderFlowShell(...)`，preview 和 state matrix 已通过真实 DOM slots 校验。

完成后收益：阅读中所有面板和覆盖层有统一状态、导航和进度上下文。

## 风险点

- 如果只在 CSS 层统一，不收敛 renderer，后续状态矩阵和交互逻辑仍会漂移。
- 如果 manifest 不记录 shell 归属，页面新增时会继续按单页复刻路径扩散。
- SettingsShell、MainTabShell、LibraryShell、ReaderShell 和 FlowShell 已完成；真实前端映射说明已进入 `FRONTEND_MAPPING_GUIDE.md`。
