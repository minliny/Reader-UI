# Stitch Demo Direct Use Audit

## 1. 总体结论

`STITCH_DEMO_NEEDS_FIX_FIRST`

当前 Stitch MCP 项目 `14245818599411324705` 可读、可导出 HTML/CSS，但 `list_screens` 当前只返回 20 个可导出 screen，主要覆盖书架与阅读页控制层。四个主界面中只有书架有较完整 demo；发现/RSS、书源、我的/WebDAV/Backup/Sync 没有可导出的正式 screen。阅读页基础控制层和 4 个底栏 overlay 有较强视觉参考价值，但快捷 overlay、阅读流状态、搜索、详情、全局状态页不完整。

结论不是“继续凭空改 Compose”，而是：先补齐 Stitch demo，再做 Stitch-to-Compose native rebuild。现阶段不允许整体直接替换当前 Compose UI；只允许对已覆盖且通过 route/state 映射复核的模块做分阶段替换。

## 2. 输入来源

- Stitch project ID: `14245818599411324705`
- Project title: `Markdown Design System`
- MCP read:
  - `list_projects`: success
  - `get_project`: success
  - `list_screens`: success
  - `get_screen`: sampled key screens success
- Exportable screen count from `list_screens`: 20
- HTML/CSS read: success, 19 HTML screens plus 1 markdown report downloaded
- Screenshot read: MCP exposed screenshot URLs for most screens; bulk screenshot files were not downloaded in this pass
- Local save path:
  - Inventory: `docs/ui-handoff/stitch-mcp-audit/STITCH_SCREEN_INVENTORY.md`
  - Raw HTML: `docs/ui-handoff/stitch-mcp-audit/raw-html/`
  - Screenshots dir prepared: `docs/ui-handoff/stitch-mcp-audit/screenshots/`
- Initial git state:
  - Untracked before audit: `.claude/scheduled_tasks.lock`
  - No commit or push performed

## 3. Screen Inventory 摘要

| Module | Count | Candidate screens |
|---|---:|---|
| App Shell / 主导航 | 1 | `Reader App Navigation Flow`, but old nav labels `书架 / 发现 / RSS / 设置` |
| 书架 | 10 | cover, list, empty, more menu, layout/sort, group management states |
| 发现 / RSS | 0 | None in current Stitch MCP export |
| 书源 | 0 | None in current Stitch MCP export |
| 我的 / WebDAV / Backup / Sync | 0 | None in current Stitch MCP export |
| 搜索 | 0 | None in current Stitch MCP export |
| 详情 | 0 | None in current Stitch MCP export |
| 阅读页基础控制层 | 1 | `f0413fa7d1024d1b8766aba2939ff266` |
| 阅读页快捷 overlay | 0 | Quick buttons exist, separate overlay screens missing |
| 阅读页底栏 overlay | 4 | TOC, TTS, appearance, settings |
| 全局状态页 | 0 | None in current Stitch MCP export |
| 其他 | 4 | local import, cache management, text selection, Stitch report |

## 4. 四主界面审计

### 书架

- 是否存在 Stitch demo: 是
- 是否最新 demo: 当前可导出清单中是最新候选，但项目里有大量 hidden/旧实例
- 是否和当前 Android 主导航一致: 否，demo 仍含 `RSS / 设置`，Android 目标是 `书架 / 发现 / 书源 / 我的`
- 必要内容: cover/list/empty/search affordance/group/sort/progress/cache hints 基本存在
- 状态: empty 存在；loading/error/offline 不完整
- 列表态/详情态/编辑态: 列表和分组编辑存在；书籍详情不属于书架 screen 且缺失
- 移动端适配: 是，mobile export
- Reader 风格: 是，较少 Material3 感
- 是否能直接转 Compose: 可作为视觉源，不能直接作为完整正式真源
- 判定等级: `DIRECT_USE_WITH_MINOR_GAPS` for bookshelf visuals, but nav/state gaps must be fixed before replacement

### 发现

- 是否存在 Stitch demo: 否
- 发现首页/RSS 列表/RSS 文章列表/RSS 详情/RSS 订阅管理: 当前 MCP export 均未覆盖
- refresh/error/offline: 未覆盖
- 是否混入书源或我的: 无页面可评估
- 判定等级: `NEEDS_STITCH_FIX_FIRST`

### 书源

- 是否存在 Stitch demo: 否
- 书源列表、添加/编辑/删除、导入 JSON、启用/禁用、测试成功/失败、错误提示: 当前 MCP export 均未覆盖
- 是否混入搜索结果页: 无页面可评估
- 判定等级: `NEEDS_STITCH_FIX_FIRST`

### 我的

- 是否存在 Stitch demo: 否
- 我的首页、WebDAV 配置、Backup export/import、Progress sync、Sync conflict、Remote WebDAV books、关于/隐私/权限: 当前 MCP export 均未覆盖
- 是否混成阅读页设置: 当前阅读页设置 overlay 未发现 WebDAV/书源/RSS/关于关键词，但我的模块本身缺失
- 判定等级: `NEEDS_STITCH_FIX_FIRST`

## 5. 阅读页控制层审计

基础阅读页覆盖较好：顶部第一行包含返回、居中书名、`refresh`、`swap_horiz`、`more_vert`；顶部第二行包含当前章节和 `本地书籍` chip；正文纸面、四个快捷按钮、固定底栏均存在。左侧亮度条在 `P1 Fixed` 模板中作为设计目标存在，但 raw HTML 中仍需 Compose 迁移时复核具体尺寸和命中区。

快捷 overlay 覆盖不足：搜索、自动翻页、内容替换、夜间模式只是快捷按钮入口，未在当前可导出清单中形成四个独立 overlay screen。夜间模式不是弹窗这一点无法从缺失 screen 直接验收。

底栏 overlay 覆盖较好但不是 direct-use ready：目录/书签、朗读、界面、设置 4 个底栏展开 screen 存在。Stitch 自带 markdown 修复报告称底栏 overlay 已统一并补齐目录右侧索引、朗读进度、设置手势/缓存等内容。raw keyword scan 未发现设置 overlay 混入 WebDAV/书源/RSS/关于。仍需补 Compose 迁移规则：底栏 overlay 要隐藏快捷按钮和页内控制条但保留底栏，快捷 overlay 要保留快捷按钮、页内控制条和底栏。

判定：

- 阅读页基础控制层: `DIRECT_USE_WITH_MINOR_GAPS`
- 阅读页快捷 overlay: `NEEDS_STITCH_FIX_FIRST`
- 阅读页底栏 overlay: `DIRECT_USE_WITH_MINOR_GAPS`

## 6. 搜索 / 详情 / 阅读流审计

搜索：搜索首页、搜索结果、loading、empty、error 均未在当前 Stitch MCP export 中覆盖。

详情：书籍详情、TOC preview、加入书架、开始阅读、继续阅读、缓存状态、error 均未覆盖。

阅读流：ready/control overlay 有视觉候选；loading、empty、error、night state、progress/cache/bookmark 状态没有形成完整 screen matrix。TOC/bookmark 通过目录 overlay 部分覆盖；bookmark 状态仍需数据字段与状态设计。

这些 demo 不能完整支撑当前 Android 已完成的业务状态。

## 7. 直接使用可行性

| Module | Grade | Reason |
|---|---|---|
| App Shell | `NEEDS_STITCH_FIX_FIRST` | 主导航仍是旧 `书架 / 发现 / RSS / 设置`，缺 `书源 / 我的`。 |
| 书架 | `DIRECT_USE_WITH_MINOR_GAPS` | 视觉完整度高，但缺 loading/error/offline 且 nav label 旧。 |
| 发现/RSS | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |
| 书源 | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |
| 我的/WebDAV | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |
| 搜索 | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |
| 详情 | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |
| 阅读页控制层 | `DIRECT_USE_WITH_MINOR_GAPS` | 基础层可作为 Compose 重建视觉源，仍缺状态矩阵。 |
| 阅读页 overlay | `DIRECT_USE_WITH_MINOR_GAPS` for bottom overlays, `NEEDS_STITCH_FIX_FIRST` for quick overlays | 底栏覆盖，快捷 overlay 缺失。 |
| 全局状态页 | `NEEDS_STITCH_FIX_FIRST` | 当前 Stitch MCP export 无页面。 |

方案 A：Stitch demo -> Compose native rebuild

- 可行性: 推荐作为最终路线，但必须先补齐缺失 Stitch demo
- 优点: 原生性能、可访问性和状态集成最好；不引入 WebView runtime
- 缺点: 需要人工转译组件与状态绑定

方案 B：Stitch exported HTML -> WebView prototype

- 可行性: 只适合临时视觉验收，不适合作为正式 Reader runtime
- 优点: 最快贴近 Stitch 外观
- 缺点: 与 Compose 导航、本地数据库、阅读交互、可访问性割裂；此前已有不引入 WebView runtime 的边界

方案 C：继续当前 Compose 并局部去 Material3

- 可行性: 不推荐作为主路线
- 优点: 业务集成风险低
- 缺点: 用户已反馈效果不明显，且容易继续在 Material3 轨道里打转

## 8. 欠缺项清单

| Module | Severity | Gap |
|---|---|---|
| App Shell | P0 | 主导航不是 `书架 / 发现 / 书源 / 我的`。 |
| 发现/RSS | P0 | 缺发现首页、RSS 订阅列表、文章列表、详情、订阅管理。 |
| 书源 | P0 | 缺书源列表、添加、编辑、删除、导入 JSON、启用/禁用、测试结果、错误提示。 |
| 我的/WebDAV | P0 | 缺我的首页、WebDAV、Backup、Progress sync、Sync conflict、Remote books、关于/隐私/权限。 |
| 搜索 | P0 | 缺搜索首页、结果、loading、empty、error。 |
| 详情 | P0 | 缺书籍详情、TOC preview、加入书架、开始/继续阅读、缓存、error。 |
| 阅读快捷 overlay | P0 | 缺搜索、自动翻页、内容替换、夜间模式四个独立 overlay。 |
| 全局状态页 | P0 | 缺 loading/empty/error/offline/permission 统一页面。 |
| 书架 | P1 | 缺 loading/error/offline；empty copy 指向旧信息架构。 |
| 阅读流 | P1 | 缺 reading loading/empty/error/night/progress/cache/bookmark 状态矩阵。 |
| Design tokens | P1 | 当前 export 内部 token 多轮变化，需冻结 Reader token，不应直接搬 Tailwind class。 |
| Route mapping | P1 | Stitch screen ID 到 Android route/action/data model 缺正式映射表。 |
| Accessibility | P1 | Stitch HTML 是视觉稿，缺 Compose semantics、TalkBack 顺序、动态字体策略。 |
| Responsive | P2 | 主要是 mobile 390/780 export；横屏、折叠屏、平板未覆盖。 |
| Dark mode | P2 | Reader night state/暗色 token 未完整覆盖到所有模块。 |
| Data binding fields | P2 | 书架和阅读页字段可推断，但未形成统一 schema。 |

## 9. 推荐路线

推荐：`B. 先补 Stitch demo`

执行策略是“先补 Stitch，再做 A”：不要继续凭空改 Compose；也不要把 raw HTML 直接塞进正式 App。先在 Stitch 中补齐缺页、缺状态、缺交互和 route/data mapping，达到 `DIRECT_USE_WITH_MINOR_GAPS` 以上后，再进入 Stitch-to-Compose native rebuild。

## 10. 下一步 Slice 建议

先补 Stitch demo 的 prompt 方向：

1. App Shell: 生成正式主导航 `书架 / 发现 / 书源 / 我的`，移除 `RSS / 设置` 作为一级 tab；搜索作为书架顶部入口。
2. 发现/RSS: 生成发现首页、RSS 订阅列表、文章列表、详情、订阅管理、refresh/error/offline 状态，明确不混入书源或我的。
3. 书源: 生成书源列表、添加、编辑、删除、JSON 导入、启用/禁用、测试成功/失败、错误提示，明确不混入搜索结果。
4. 我的/WebDAV: 生成我的首页、WebDAV 配置、Backup export/import、Progress sync、Sync conflict、Remote WebDAV books、关于/隐私/权限。
5. 搜索/详情: 生成搜索首页、搜索结果、loading/empty/error、书籍详情、TOC preview、加入书架、开始/继续阅读、缓存/error。
6. 阅读快捷 overlay: 生成搜索、自动翻页、内容替换、夜间模式独立 overlay；要求 overlay 非全屏，保留快捷按钮、页内控制条和底栏。
7. 全局状态页: 生成统一 loading/empty/error/offline/permission 状态页。

补齐后进入：

- Slice 76A: Stitch App Shell Native Rebuild
- Slice 76B: Stitch Four Main Tabs Native Rebuild
- Slice 76C: Stitch Reader Control Native Rebuild
- Slice 76D: Stitch Search/Detail Native Rebuild
- Slice 76E: Stitch Source/Discover/Mine Native Rebuild

## 11. P0

1. App Shell 主导航不符合正式 Android 目标。
2. 发现/RSS Stitch demo 缺失。
3. 书源 Stitch demo 缺失。
4. 我的/WebDAV/Backup/Sync Stitch demo 缺失。
5. 搜索 Stitch demo 缺失。
6. 详情 Stitch demo 缺失。
7. 阅读快捷 overlay 独立 screen 缺失。
8. 全局状态页 Stitch demo 缺失。

P0 count: 8

## 12. P1

1. 书架缺 loading/error/offline。
2. 阅读流缺 loading/empty/error/night/progress/cache/bookmark 状态矩阵。
3. Stitch token 版本未冻结，不能直接照搬 Tailwind/raw class。
4. 缺 Stitch screen 到 Android route/action/data model 的正式映射。
5. 缺 accessibility contract。
6. 底栏 overlay 行为规则需 Compose 迁移时复核。

P1 count: 6

## 13. 是否允许直接替换当前 Compose UI

只允许按模块替换。

允许的前提：

- 不把 Stitch raw HTML 直接塞进正式 App。
- 不引入 WebView runtime 作为正式阅读 App UI。
- 不改 Reader-Core bridge/parser/repository/book source。
- 不接真实网络。
- 不删除 Prototype Gallery。
- 先补齐 App Shell 和缺失主模块，或只从书架/阅读控制层这些已覆盖模块做 Compose native rebuild。

