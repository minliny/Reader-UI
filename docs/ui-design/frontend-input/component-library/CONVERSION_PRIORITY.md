# UI 设计图转前端设计稿优先级

当前共有 29 张 `UI设计图.png`，其中 29 页已完成 `frontend-input/` 输入件并进入总 `manifest.json`：

- `02-主标签页/书架`
- `02-主标签页/发现`
- `02-主标签页/RSS`
- `02-主标签页/设置`
- `03-书架链路/书架空状态`
- `03-书架链路/书籍搜索`
- `03-书架链路/书籍详情`
- `03-书架链路/书籍目录`
- `03-书架链路/排序与筛选`
- `03-书架链路/书籍操作底表`
- `03-书架链路/分组管理`
- `03-书架链路/本地书导入`
- `04-阅读链路/阅读控制层`
- `04-阅读链路/目录与书签`
- `04-阅读链路/阅读外观`
- `04-阅读链路/朗读`
- `04-阅读链路/阅读设置`
- `04-阅读链路/自动翻页`
- `04-阅读链路/内容搜索`
- `04-阅读链路/内容替换`
- `04-阅读链路/沉浸阅读`
- `04-阅读链路/换源`
- `05-设置链路/App通用设置`
- `05-设置链路/书架与搜索设置`
- `05-设置链路/隐私与权限`
- `05-设置链路/缓存管理`
- `05-设置链路/关于与反馈`
- `05-设置链路/同步与备份`
- `05-设置链路/书源管理`

本轮已按三个目标完成全部页面排序和转换：

1. 先补公共主导航和最高复用组件。
2. 再闭合书架、阅读、设置三条核心链路。
3. 最后处理差异大、状态多或依赖前置组件的页面。

## 排序规则

- 公共组件优先：新页面如果能补 `SearchBar`、`SearchResultItem`、`RssEntryItem`、`ChapterRow`、`RadioOption`、`FilterChip`、`SegmentControl`、`TextField`、`ConfirmDialog` 等高复用组件，应排在同域复杂页面之前。
- 主导航闭环优先：公共主导航固定为 `书架 / 发现 / RSS / 设置`，四个根页要先达到可作为框架输入件的程度。
- 链路闭环优先：书架链路先保证搜索、详情、目录、排序、操作底表、分组、导入能互相承接；P2 书架链路闭环完成后，阅读链路先补控制层四按钮对应页面。
- 例外后置：横向画布、复杂来源管理、同步备份、权限说明等更容易产生专属组件，应放在基础组件稳定后处理。
- 每页转换前必须先列出复用公共组件和新增组件；新增组件先回流公共组件库，再写页面输入件。

## P0：已完成基线

1. `02-主标签页/书架`：已完成。提供 `BookCover`、`BookCard`、`BookRow`、`Chip`、`MainNav` 种子。
2. `04-阅读链路/阅读控制层`：已完成。提供 `BottomSheet`、`ReaderModuleNav`、`QuickAction`、`ProgressSlider`、`BrightnessSlider` 种子。
3. `02-主标签页/设置`：已完成。提供 `SettingRow`、`Badge`、设置分组和设置根页骨架。
4. `03-书架链路/书架空状态`：已完成。提供 `EmptyStateCard`、`PrimaryActionButton`、`SecondaryActionButton`、导入入口规则。
5. `03-书架链路/书籍搜索`：已完成。提供 `SearchBar`、范围切换、搜索历史、`SearchResultItem`、搜索结果状态矩阵。
6. `02-主标签页/发现`：已完成。提供 `SearchEntry`、`SourceTypeSegment`、`CurrentSourceCard`、`DiscoveryContentCard`、`SourceStatusBar`、`RankingRow`。
7. `02-主标签页/RSS`：已完成。提供 `SubscriptionSummaryCard`、`FeedStatusChips`、`FeedSourceChips`、`RssEntryItem`、`UnreadIndicator`。
8. `03-书架链路/书籍详情`：已完成。提供 `BookDetailHeader`、`ChapterPreviewList`、`IntroCard`、`SourceChangeSheet`，并校验章节预览不少于 20 条。
9. `03-书架链路/书籍目录`：已完成。提供 `BookDirectory.SummaryBar`、`ChapterRow`、`CurrentChapterRow`，并校验目录章节行不少于 20 条。
10. `03-书架链路/排序与筛选`：已完成。提供 `RadioOption`、`FilterChip`、`ResetButton`、`ApplyButton`，并覆盖 default、selected、empty、error 四种底表状态。
11. `03-书架链路/书籍操作底表`：已完成。提供 `BookSummary`、`ActionRow.Edit`、`ActionRow.Delete`、`ConfirmDialog`，并覆盖 default、danger、loading、error 四种危险操作状态。
12. `03-书架链路/分组管理`：已完成。提供 `GroupRow`、`AddGroupButton`、`RenameDialog`、`DeleteConfirmDialog`、`ReorderHandle`，并覆盖 default、new、rename、delete、empty、loading、error 七种状态。
13. `03-书架链路/本地书导入`：已完成。提供 `ImportIntroCard`、`SupportedFormatRow`、`FilePickerButton`、`ImportProgressCard`、`ImportResultSummary`、`ImportResultRow`、`ErrorGuidance`、`BottomActionBar`，并覆盖 default、importing、success、partial_failed、failed、picker_cancelled 六种状态。
14. `04-阅读链路/目录与书签`：已完成。提供 `SegmentTab`、`BookmarkRow`、`SearchField`、`MoreMenu`，复用 `ChapterRow`，并覆盖 default、bookmark、search、empty、loading、error、more_menu 七种状态。
15. `04-阅读链路/阅读外观`：已完成。提供 `ThemeSwatch`、`FontOption`、`Stepper`、`Slider`、`PreviewCard`、`SegmentControl`，并覆盖 default、font、theme、edit、loading、error 六种状态。
16. `04-阅读链路/朗读`：已完成。提供 `ReadAloudButton`、`PlayPauseControl`、`SpeedControl`、`VoiceOption`、`RunningCapsule`，并覆盖 default、running、paused、error 四种状态。
17. `04-阅读链路/阅读设置`：已完成。提供 `SettingGroupCard`、`SettingRow`、`Switch`、`Stepper`、`SegmentControl`、`PresetRow`，并覆盖 default、subpage、loading、error 四种状态。
18. `04-阅读链路/自动翻页`：已完成。提供 `SpeedSlider`、`StartButton`、`StopButton`，复用 `RunningCapsule`、`Switch`、`SettingRow`，并覆盖 default、running、paused、error 四种状态。
19. `04-阅读链路/内容搜索`：已完成。提供 `SearchInput`、`ResultRow`、`EmptySearchState`、`KeyboardAvoidance`，并覆盖 default、loading、empty、error、offline 五种状态。
20. `04-阅读链路/内容替换`：已完成。提供 `TextField`、`ReplacementRuleRow`、`PatternInput`、`SaveButton`，复用 `SearchInput`、`SettingRow`、`Switch`、`PreviewCard`、`BottomActionBar`，并覆盖 default、edit、empty、loading、error 五种状态。
21. `04-阅读链路/沉浸阅读`：已完成。提供 `ReadingParagraph`、`WeakInfoText`、`ProgressInfo`、`TapZone`、`OpenLoadingState`、`ReadingRepairAction`，复用阅读外观主题、阅读设置屏幕/翻页配置和阅读控制层交互规则，并覆盖 default、loading、error、offline 四种状态。
22. `04-阅读链路/换源`：已完成。提供 `SourceCandidateRow`、`CurrentSourceBadge`、`DetectStatusBadge`、`SwitchSourceButton`，复用 `SourceStatusBar`、`SearchField`、`FilterChip`、`LoadingState`、`ErrorState`，并覆盖 default、loading、empty、error、offline、permission 六种状态。
23. `05-设置链路/App通用设置`：已完成。提供 `SelectRow`、`OptionSheet`、`SettingsToast`，复用 `SettingGroupCard`、`SettingRow`、`Switch`、`ConfirmDialog`、`LoadingState`、`ErrorState`，并覆盖 default、option_sheet、loading、error、permission 五种状态。

## P1：主导航闭环与搜索入口

已完成。`书架 / 发现 / RSS / 设置` 四个公共主导航按钮均已有根页面输入件，搜索入口、来源体系、订阅列表和设置入口已经进入公共组件库。

## P2：书架链路闭环

已完成。书架域已经覆盖空态、搜索、详情、目录、排序筛选、单书操作底表、分组管理和本地书导入，并完成系统文件选择器授权边界、危险操作确认和分组编辑规则。

## P3：阅读链路面板体系

已完成。阅读链路已经覆盖控制层四按钮、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读和换源；打开、失败、离线状态并入沉浸阅读的 ReaderStateHost。`换源` 的横向画布补齐了来源检测、失效说明、来源切换和返回阅读页的闭环，`书源管理` 已复用候选源行和检测状态语义。

## P4：设置链路批量补齐

已完成。设置链路已经覆盖通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份和书源管理；危险操作、权限说明、缓存占用、备份记录、书源编辑与错误日志均已沉淀到公共组件库。

24. `05-设置链路/书架与搜索设置`：已完成。
    - 目的：把书架展示、搜索范围、结果排序和搜索历史规则接入设置体系。
    - 复用：`SettingGroupCard`、`SegmentControl`、`Switch`、`ConfirmDialog`、P2 书架筛选组件。
    - 新增：`SelectRow` 的设置页变体、`DangerActionRow`。
    - 状态：default、option_sheet、confirm、loading、error、permission；已覆盖 `默认展示`、`搜索范围`、`结果排序`、`搜索历史`、`清空搜索历史`。

26. `05-设置链路/隐私与权限`：已完成。
    - 目的：建立权限状态、用途说明和跳转系统设置的统一表达。
    - 复用：`SettingGroupCard`、`SettingRow`、`Switch`、`Badge`。
    - 新增：`PermissionRow`、`StatusBadge`、`OpenSystemSettingsButton`。
    - 状态：default、confirm、loading、error、permission；已覆盖 `文件访问`、`通知权限`、`网络访问说明`、`去设置`、`隐私开关`。

27. `05-设置链路/缓存管理`：已完成。
    - 目的：展示缓存占用、分类扫描和清理确认。
    - 复用：`SettingGroupCard`、`DangerActionRow`、`ConfirmDialog`、`LoadingState`、`ErrorState`。
    - 新增：`CacheSizeCard`、`CacheCategoryRow`、`StorageBar`、`CleanupResult`。
    - 状态：default、loading、empty、confirm、error；已覆盖 `缓存占用`、`正在计算`、`清理缓存`、`缓存分类`、`确认清理`。

28. `05-设置链路/关于与反馈`：已完成。
    - 目的：补齐个人开源项目信息页，包括版本、更新、反馈、源码仓库、开源许可和诊断导出。
    - 复用：`SettingGroupCard`、`SettingRow`、`PrimaryActionButton`、`ErrorState`。
    - 新增：`VersionCard`、`LinkRow`、`FeedbackEntry`、`UpdateButton`、`DiagnosticExportAction`。
    - 状态：default、loading、error、confirm、offline；已覆盖 `当前版本`、`个人开源`、`检查更新`、`问题反馈`、`功能建议`、`源码仓库`、`开源许可`、`导出诊断日志`。

29. `05-设置链路/同步与备份`：已完成。
    - 目的：管理本地备份、恢复、自动备份、备份记录和冲突提示。
    - 复用：`SettingGroupCard`、`Switch`、`ConfirmDialog`、`PermissionRow`、`StatusBadge`、`DangerActionRow`。
    - 新增：`BackupActionRow`、`BackupRecordRow`、`ConflictNotice`、`RestoreConfirmDialog`。
    - 状态：default、confirm、loading、empty、error、offline、permission；已覆盖 `备份位置`、`立即备份`、`恢复备份`、`自动备份`、`备份记录`。

30. `05-设置链路/书源管理`：已完成。
    - 目的：管理书源列表、分组筛选、启用开关、检测、详情、编辑和错误日志。
    - 复用：`SearchField`、`FilterChip`、`Switch`、`ConfirmDialog`、`SourceStatusBar`、`DiscoveryContentCard`。
    - 新增：`SourceRow`、`DetectButton`、`LogPanel`、`SourceEditForm`、`SourceDetailPanel`。
    - 状态：default、edit、log、loading、empty、error、offline、permission；已覆盖书源列表、检测、详情、编辑、错误日志和权限状态。

理由：设置页族复用度高，但多数属于二级管理页。通用设置先沉淀 `SelectRow`、选项底表和 `SettingsToast`；书架搜索设置再沉淀 `DangerActionRow` 和清空历史确认规则；隐私权限补齐授权状态和系统设置跳转语义；缓存和关于反馈边界清晰，适合在权限组件稳定后补齐；同步备份涉及恢复、冲突和权限；书源管理状态和子流程最多，最后处理。

设置链路组件依赖阶梯：

- `App通用设置`：已沉淀设置二级页壳、`SelectRow`、选项底表、`SettingsToast`，作为后续设置页的默认框架。
- `书架与搜索设置`：已在通用设置基础上补 `DangerActionRow` 和清空历史确认规则，并复用书架筛选语义。
- `隐私与权限`：已补 `PermissionRow`、`StatusBadge`、`OpenSystemSettingsButton`，供缓存、同步和书源管理的权限态复用。
- `缓存管理`：已复用危险行和确认弹窗，新增 `CacheSizeCard`、`CacheCategoryRow`、`StorageBar`、`CleanupResult`。
- `关于与反馈`：已新增 `VersionCard`、`LinkRow`、`FeedbackEntry`、`UpdateButton`，主要验证链接行和更新反馈。
- `同步与备份`：已依赖权限态、危险确认、toast 和结果状态，新增备份记录、恢复确认和冲突提示。
- `书源管理`：已补齐发现页来源体系、换源候选行、权限态、搜索、筛选、检测和日志面板，是设置链路中子流程最多的页面。

## 每页完成定义

- 有独立 `frontend-input/` 包。
- 有 `fixture.json`、`fixture.js`、`render.js`、`preview.html`。
- 有 `state-matrix.html`；若确实不需要，必须在 README 和规格中说明。
- 有 `COMPONENT_SPEC.md`，列出 props、states、events、acceptance。
- 有 `README.md`，说明来源图、文字稿、复用组件和新增组件。
- 页面完成后必须加入 `docs/ui-design/frontend-input/manifest.json`。
- 必须运行 `docs/ui-design/frontend-input/validate-frontend-inputs.js` 并通过。
- 新增公共组件必须同步更新 `COMPONENT_LIBRARY.md`、`contracts.d.ts` 和组件库预览。

## 当前下一步

页面优先级转换已经完成，不再有剩余页面队列。

后续工作应从“页面优先级”切换到“页面框架归一”：按 `../PAGE_FRAMEWORK_ARCHITECTURE.md` 先冻结 shell 命名、slots、state model 和 manifest 校验字段，再把设置链路、主标签页、书架链路、阅读链路逐批迁移到统一 shell kit。
