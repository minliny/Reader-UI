# Stitch 组件规格文字草案

状态：`DRAFT / PENDING_HUMAN_REVIEW / NOT_AUTHORITY`

本文按功能域覆盖当前缺少组件规格的36个页面。所有组件仍需补充示例、视觉审核、token 定稿和明确采用决定，才能映射为设计依据。

## 通用组件约束

- 必填结构：容器、前置内容、主要内容、尾部内容、反馈/错误区域、触控区域。
- 必填状态：默认、按下、焦点、选中、禁用、加载，以及适用时的空状态和错误状态。
- 间距：使用候选最终间距刻度；最小触控区域 `44dp`。
- Token 使用：只使用语义 token；原始颜色不得覆盖更高权威的人工 PASS 源图。
- 应当：保持页面层级、标签可读性和对齐一致性。
- 禁止：玻璃卡片、大阴影、混合图标体系、只能依赖手势发现的操作。

## 书架与书籍组件

页面：`01-bookshelf-cover`、`02-bookshelf-list`、`05-book-search`、
`06-book-search-results`、`07-book-info`。

- `BookCoverTile`：封面、标题、作者/进度、可用状态、更多操作。
- `BookListRow`：封面缩略图、标题、元信息、进度、尾部操作。
- `BookSearchField`：查询、清除、来源范围、加载/错误反馈。
- `BookSearchResultRow`：书籍身份、来源、状态、主要操作。
- `BookInfoHeader`：封面、标题、作者、来源、阅读/加入操作。
- 变体：封面/列表密度、本地/远程、已下载/不可用。
- 禁止隐藏来源身份或在封面上堆叠过多徽标。

## 正文搜索组件

页面：`08-content-search-overlay`、`09-content-search-page`。

- `ContentSearchInput`、`SearchScopeTabs`、`SearchResultExcerpt`、
  `SearchMatchHighlight`、`SearchEmptyState`。
- 变体：覆盖层、完整页面。
- 状态：输入中、搜索中、有结果、无结果、错误。
- 必须保留章节和命中上下文，不得只用颜色表达当前命中。

## 自动翻页组件

页面：`10-auto-page-turn-setup-overlay`、
`11-auto-page-turn-running-capsule`、`12-auto-page-turn-settings`。

- `AutoTurnSetup`：间隔/模式控制和开始操作。
- `AutoTurnCapsule`：运行状态、暂停/继续、停止。
- `AutoTurnSettingsGroup`：持久默认值和行为开关。
- 必须明确区分自动翻页与 TTS。
- 多状态胶囊图不得映射为单页主 source。

## 替换规则组件

页面：`13-replacement-quick-overlay`、`14-replacement-rules`、
`15-replacement-rule-edit`。

- `ReplacementToggle`、`ReplacementRuleRow`、`RulePatternField`、
  `RuleReplacementField`、`RuleTestResult`。
- 状态：启用/禁用、表达式有效/无效、测试成功/失败。
- 必须显示作用范围和替换结果，不得静默保存无效正则表达式。

## 发现与 RSS 组件

页面：`41-1-discovery-source-category`、`41-discovery-default`、`42-rss-home`。

- `SourceTypeTabs`、`CurrentSourceSelector`、`SourceCategoryChips`、
  `DiscoveryContentSection`、`SourceStatusRow`、`RssFeedRow`。
- 状态：加载、来源不可用、无来源、分类为空、刷新错误。
- 分类必须来自当前来源，不得虚构固定全局分类或恢复已废弃的 `41` 布局。

## App 设置组件

页面：`43-settings-home`；条件性排除页面：
`48-app-settings-general`、`48-1-app-settings-bookshelf-search`、
`48-2-app-settings-cache`、`48-3-app-settings-sync-backup`、
`48-4-app-settings-privacy-permissions`、`48-5-app-settings-about-feedback`。

- `SettingsGroup`、`SettingsRow`、`SettingsSwitch`、`SettingsValueRow`、
  `PermissionStatusRow`、`DangerActionRow`。
- 使用不透明暖色卡片、`8dp` 圆角、`1dp` 暖灰分隔线，不使用卡片阴影。
- 48系列只有在新的明确人工决定撤销页面排除后，才允许重新进入当前范围。

## 书源管理组件

页面：`44-source-management-home`、`47-source-detail`、
`47-1-source-create`、`47-2-source-edit`、`47-3-source-check-running`、
`47-4-source-check-result`、`47-5-source-debug-info`、`47-6-source-error-logs`。

- `SourceSummaryRow`：名称、分组/类型、启用状态、健康状态、更多操作。
- `SourceFormSection`：字段标签、校验、帮助、敏感信息处理。
- `SourceCheckProgress`：当前阶段、进度、取消、耗时。
- `SourceCheckResult`：状态摘要、检查项、修复操作。
- `SourceDebugSection`：经过脱敏的请求/响应元数据。
- `SourceErrorLogRow`：时间、阶段、摘要、可展开的脱敏详情。
- 必须提供状态和恢复操作；不得泄露凭据、Cookie、Token 或未限制的原始日志。

## 全局状态组件

条件性排除页面：`51-global-state-loading`、`51-1-global-state-empty`、
`51-2-global-state-error-network`、`51-3-global-state-permission-delete-confirm`、
`51-4-global-state-operation-feedback`。

- `LoadingState`、`EmptyState`、`NetworkErrorState`、`PermissionPrompt`、
  `DeleteConfirmation`、`OperationFeedback`。
- 这些文字模式仅供未来工作参考；已拒绝的51系列图片仍保持排除，不能提供视觉权威。

最终状态：`COMPONENT_SPEC_REVIEW_REQUIRED`
