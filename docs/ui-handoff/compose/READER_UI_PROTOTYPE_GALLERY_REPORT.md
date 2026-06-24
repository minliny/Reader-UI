# Reader UI Prototype Gallery Report

## 1. 总体结论

READER_UI_PROTOTYPE_GALLERY_READY

本轮暂停 Slice 16，先审视 Slice 15 未提交结果，并新增 prototype-only Reader UI Prototype Gallery。未提交 Slice 15，未进入 Slice 16，未 push。

## 2. Slice 15 审视结果

- Slice 15 是否仍通过: 是。
- 是否发现 P0/P1: 未发现。
- 是否继续保留未提交状态: 是，Slice 15 与本轮 prototype gallery 均保持未提交。
- WebDAV/RSS/Discover/Sync: 仅 UI state adapter、fixture、state-driven screen 接入。
- 真实网络 / WebDAV 登录 / RSS 请求 / 同步: 未接入。
- 真实账号、URL、token: 未保存，fixture 不含 secret。
- Reader-Core bridge/parser/repository/book source: 未修改。
- fake/real mode boundary: 未破坏。
- ReaderScreen / Search / Detail / SourceManagement: 未改已完成业务逻辑。

## 3. 修改范围

新增 prototype Kotlin：

- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeCatalog.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeFixtures.kt`
- `app/src/main/kotlin/com/reader/android/ui/prototype/ReaderPrototypeGallery.kt`

新增 prototype 测试：

- `app/src/test/kotlin/com/reader/android/ui/prototype/ReaderPrototypeGalleryTest.kt`
- `app/src/test/kotlin/com/reader/android/ui/prototype/ReaderPrototypeRegressionGuardTest.kt`

新增报告：

- `docs/ui-handoff/compose/READER_UI_PROTOTYPE_GALLERY_REPORT.md`

保留未提交的 Slice 15 文件不变。

## 4. Prototype 覆盖清单

| 分组 | 页面 | Prototype entry | 是否覆盖 | 是否通过 |
|---|---|---|---|---|
| App / Navigation | App Shell / Main Tabs | `app-shell` | 是 | 是 |
| Bookshelf | 书架封面模式 | `bookshelf-cover` | 是 | 是 |
| Bookshelf | 书架列表模式 | `bookshelf-list` | 是 | 是 |
| Bookshelf | 书架空状态 | `bookshelf-empty` | 是 | 是 |
| Search / Detail | 搜索首页 | `search-home` | 是 | 是 |
| Search / Detail | 搜索结果 | `search-results` | 是 | 是 |
| Search / Detail | 搜索空状态 | `search-empty` | 是 | 是 |
| Search / Detail | 搜索错误状态 | `search-error` | 是 | 是 |
| Search / Detail | 书籍详情 | `book-detail` | 是 | 是 |
| Search / Detail | 书籍详情 TOC 预览 | `book-detail-toc` | 是 | 是 |
| Reader | 阅读页基础控制层 | `reader-base` | 是 | 是 |
| Reader | 阅读页搜索 overlay | `reader-search` | 是 | 是 |
| Reader | 阅读页自动翻页 overlay | `reader-auto-scroll` | 是 | 是 |
| Reader | 阅读页内容替换 overlay | `reader-replace` | 是 | 是 |
| Reader | 阅读页夜间状态 | `reader-night` | 是 | 是 |
| Reader | 阅读页目录/书签 overlay | `reader-directory` | 是 | 是 |
| Reader | 阅读页朗读 overlay | `reader-tts` | 是 | 是 |
| Reader | 阅读页界面 overlay | `reader-appearance` | 是 | 是 |
| Reader | 阅读页设置 overlay | `reader-settings` | 是 | 是 |
| Source Management | 书源管理列表 | `source-list` | 是 | 是 |
| Source Management | 书源详情 | `source-detail` | 是 | 是 |
| Source Management | 书源编辑/导入状态 | `source-edit-import` | 是 | 是 |
| Source Management | 书源测试/禁用/错误状态 | `source-test-disabled-error` | 是 | 是 |
| Discover / RSS | 发现首页 | `discover-home` | 是 | 是 |
| Discover / RSS | RSS 列表 | `rss-list` | 是 | 是 |
| Discover / RSS | RSS 详情 | `rss-detail` | 是 | 是 |
| Discover / RSS | RSS 订阅管理 | `rss-subscriptions` | 是 | 是 |
| WebDAV / Sync | WebDAV 配置 | `webdav-config` | 是 | 是 |
| WebDAV / Sync | 备份设置 | `backup-settings` | 是 | 是 |
| WebDAV / Sync | 阅读进度同步状态 | `progress-sync` | 是 | 是 |
| WebDAV / Sync | 远程 WebDAV 书籍 | `remote-webdav-books` | 是 | 是 |
| WebDAV / Sync | 同步错误 / WebDAV auth error | `sync-error` | 是 | 是 |
| Settings | 全局设置 | `global-settings` | 是 | 是 |
| Global States | loading 状态页 | `state-loading` | 是 | 是 |
| Global States | empty 状态页 | `state-empty` | 是 | 是 |
| Global States | error 状态页 | `state-error` | 是 | 是 |
| Global States | offline 状态页 | `state-offline` | 是 | 是 |
| Global States | permission required 状态页 | `state-permission` | 是 | 是 |

## 5. Fixture 使用说明

- 全部 prototype entry 使用 `ReaderPrototypeFixtures` 与既有 UI state mapper / fixture。
- 不调用真实 repository。
- 不调用 Reader-Core。
- 不读写数据库。
- 不访问网络。
- 不含真实账号、真实 URL、token、授权头或 cookie。
- 不替换生产入口，不影响 `AppNavigation` 或正式 app start。

## 6. 阅读页原型检查

- 基础控制层: 通过。
- 搜索 overlay: 通过。
- 自动翻页 overlay: 通过。
- 内容替换 overlay: 通过，仅使用当前书籍规则 fixture。
- 夜间状态: 通过，不是弹窗。
- 目录/书签 overlay: 通过，包含目录/书签、层级、当前阅读与书签标识 fixture。
- 朗读 overlay: 通过，不引入章节跳转语义。
- 界面 overlay: 通过。
- 设置 overlay: 通过，不包含 WebDAV/书源/RSS。

关键规则：

- 快捷按钮无文字标签。
- 不使用 `skip_previous` / `skip_next`。
- 页内控制语义保持本章上一页/下一页。
- 亮度条使用既有自动亮度和左右停靠状态。

## 7. WebDAV/RSS 原型检查

- WebDAV/RSS prototype 只是 state-driven prototype。
- 没有真实网络。
- 没有真实 WebDAV 登录。
- 没有真实 RSS 请求。
- 没有真实备份、恢复或进度同步。
- WebDAV auth error / sync conflict / offline 都由 fixture 表达。

## 8. 视觉一致性自检

- Prototype Gallery 使用 `ReaderTheme`。
- 页面承载使用既有 Reader components、spacing、typography、color token。
- 书架、阅读页、RSS、WebDAV、状态页均复用现有 Compose UI 风格。
- Gallery 采用移动端可滚动 catalog，适合 390px 宽度人工逐项打开校对。

## 9. 回归守卫

- 无 Stitch 旧色/旧类。
- 无 WebView runtime。
- 无夜间弹窗。
- 无快捷文字标签。
- 无 `skip_previous` / `skip_next` 页内控制。
- 阅读页设置未混入 WebDAV/书源/RSS。
- 无真实 WebDAV/RSS 网络请求。

## 10. 测试结果

- `./gradlew test`: 普通 daemon 运行出现 daemon 收尾卡住；随后执行同一 `test` 任务的 `./gradlew --no-daemon test` 通过，`BUILD SUCCESSFUL in 6m 51s`。
- `./gradlew assembleDebug`: 初次遇到 stale dex duplicate cache；清理生成的 dex intermediates 后重跑通过，`BUILD SUCCESSFUL in 5s`。
- `./gradlew lintDebug`: 通过，`BUILD SUCCESSFUL in 26s`。

## 11. 是否仍有 P0

无

## 12. 是否仍有 P1

无

## 13. 是否建议提交

建议人工校对 UI 后再决定是否提交；当前不自动提交。
