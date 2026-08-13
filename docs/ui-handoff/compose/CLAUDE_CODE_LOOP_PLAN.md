# Claude Code Loop Plan

## LOOP_PLAN_READY

---

## 一、Loop 总目标

持续推进 Slice 3 到 Slice 9，直到输出：
`docs/ui-handoff/compose/FINAL_COMPOSE_IMPLEMENTATION_REPORT.md`

并达到状态标记：
`FINAL_COMPOSE_IMPLEMENTATION_READY`

最终交付物：
- 所有 normalized HTML 对应页面均有原生 Jetpack Compose 实现
- 所有核心路由可导航
- 所有 UI 状态（loading/empty/error/offline/disabled/permission）有统一组件覆盖
- Reader 控制层 overlay 显隐规则正确
- 回归测试套件通过 CI
- 无 Stitch 旧 class/色值/结构回归
- 无 WebView 承载 normalized HTML

---

## 二、阶段路线

| Slice | 名称 | 状态 | 预计任务数 |
|---|---|---|---|
| Slice 0 | Handoff freeze | COMPLETE | — |
| Slice 1 | Theme/token foundation | COMPLETE | — |
| Slice 2 | Shared UI components | COMPLETE | — |
| Slice 3 | Bookshelf + Search + Detail static UI | **CURRENT** | 8 |
| Slice 4 | Reader control layer Compose prototype | PENDING | 10 |
| Slice 5 | Source management UI integration | PENDING | 6 |
| Slice 6 | Discover / RSS / WebDAV static UI | PENDING | 7 |
| Slice 7 | State integration | PENDING | 5 |
| Slice 8 | Navigation integration | PENDING | 5 |
| Slice 9 | UI regression tests | PENDING | 6 |

### Slice 3：Bookshelf + Search + Detail static UI

当前阶段。目标：将现有骨架 screen 迁移到 Slice 1 ReaderTheme token 和 Slice 2 shared components，不改变 ViewModel/repository/bridge 逻辑。

修改范围：
- `ui/bookshelf/BookshelfScreen.kt`：使用 `ReaderAppTopBar`、`BookCard`/`BookListItem`、`ReaderEmptyState`
- `ui/search/SearchScreen.kt`：使用 `ReaderSearchBox`、`SearchResultItem`、`ReaderLoadingState`、`ReaderEmptyState`、`ReaderErrorState`
- `ui/detail/BookDetailScreen.kt`：使用 `ReaderAppTopBar`、`ReaderCard`、`ReaderLoadingState`
- `ui/settings/SettingsScreen.kt`：使用 `ReaderSettingsRow`、`ReaderSettingsSwitchRow`、`ReaderSettingsGroup`
- `ui/reader/ReaderScreen.kt`：使用 `ReaderLoadingState`、`ReaderErrorState`（仅状态迁移，控制层改在 Slice 4）

不允许修改范围：
- ViewModel fake/real mode constructor
- FakeCoreBridge / HttpClient / Parser / BookSource 逻辑
- AppNavigation 路由结构（Slice 8 才改）
- 不新增 screen 文件（Slice 6 才加）

### Slice 4：Reader control layer Compose prototype

目标：基于 `control-layer-base-v2.html` 实现 9 个阅读状态（BaseControlVisible + 8 overlays）的 Compose 原型。

状态列表：
1. BaseControlVisible — 底栏 + 浮动页内控制 + 快捷按钮 + 亮度条
2. QuickActionOverlay(Search) — 搜索本章 overlay
3. QuickActionOverlay(AutoScroll) — 自动翻页 overlay
4. QuickActionOverlay(Replace) — 内容替换 overlay（只显示当前书籍规则）
5. BottomFunctionOverlay(Directory) — 目录 overlay
6. BottomFunctionOverlay(Tts) — 朗读 overlay
7. BottomFunctionOverlay(Appearance) — 界面 overlay
8. BottomFunctionOverlay(Settings) — 阅读行为设置 overlay（不混入全局设置）
9. NightState — 夜间模式（不是弹窗）

### Slice 5：Source management UI integration

目标：将 `BookSourceScreen` 和相关 UI 接入现有 `BookSourceRepository`。

### Slice 6：Discover / RSS / WebDAV static UI

目标：新增 `DiscoverScreen`、`RssListScreen`、`RssDetailScreen`、`WebDavConfigScreen` 等静态 UI。

### Slice 7：State integration

目标：统一注入 `ReaderUiState` sealed interface，替换各 screen 内联状态处理。

### Slice 8：Navigation integration

目标：`ReaderRouteHost` 替代当前 `AppNavigation`，新增 back stack 和 deep link placeholder。

### Slice 9：UI regression tests

目标：screenshot/semantics/route/state 测试覆盖核心守卫。

---

## 三、每轮执行流程

每轮 loop（约 10 分钟）必须按顺序执行：

```
1. 读取 git status — 了解当前工作区状态
2. 读取 CLAUDE_CODE_LOOP_STATE.md — 了解当前 slice 和上轮结果
3. 读取 CLAUDE_CODE_LOOP_QUEUE.md — 获取下一待执行任务
4. 读取实际 Android 代码目录 — 确认文件存在性，不凭历史摘要假设
5. 判断当前最小可执行任务 — 必须是单一文件/组件级别
6. 执行一个最小任务 — 只改当前任务范围的文件
7. 更新或新增测试 — 覆盖本次修改
8. 运行 ./gradlew test — 必须全部通过
9. 生成本轮报告 — 写入 docs/ui-handoff/compose/loop-reports/LOOP_XXX.md
10. 更新 CLAUDE_CODE_LOOP_STATE.md — 更新当前状态
11. 更新 CLAUDE_CODE_LOOP_QUEUE.md — 标记任务完成
12. 判断是否允许进入下一任务或下一 slice
```

---

## 四、每轮报告格式

每轮报告写入 `docs/ui-handoff/compose/loop-reports/LOOP_NNN.md`（NNN 为递增编号，从 001 开始）。

报告模板：

```markdown
# Loop NNN Report

## 当前 Slice
Slice X：名称

## 本轮任务
[具体描述]

## 修改文件
- [文件路径]：[修改说明]

## 新增/更新测试
- [测试文件路径]：[测试说明]

## 测试命令
./gradlew test

## 测试结果
[通过/失败]
[失败详情]

## P0/P1
- P0: N
- P1: N

## 是否允许继续
[允许 / 不允许 + 原因]

## 下一轮建议
[下一轮应执行的任务]

## 备注
[阻塞原因、需要用户决策的问题等]
```

---

## 五、Cron Loop 配置建议

### 触发频率
每 10 分钟触发一次，使用 `/loop` 或 CronCreate。

### 安全规则
1. 每轮最多完成一个最小可验收任务
2. 如果工作区不干净（有未暂存修改），先审计再决定是否继续
3. 如果测试失败，下一轮优先修复失败
4. 如果连续 3 轮失败，停止推进并输出 BLOCKED 报告
5. 不自动 push
6. 不自动改大范围架构
7. 不自动删除旧文件
8. 不自动修改 Reader-Core / parser / repository / bridge / ViewModel fake-real boundary
9. 不自动引入 WebView 运行 normalized HTML
10. 不自动引入 Stitch 旧 class/色值/结构

### Cron 表达式建议
```
*/10 * * * *   (每 10 分钟)
```

或使用 Claude Code `/loop 10m` 命令。

### 停止条件
- 连续 3 轮测试失败 → 输出 BLOCKED，等待人工介入
- 所有 Slice 3-9 任务完成 → 输出 FINAL_COMPOSE_IMPLEMENTATION_REPORT.md
- 用户手动停止

---

## 六、禁止回归清单

每次 loop 必须检查以下回归：

| 类别 | 禁止项 | 检查方式 |
|---|---|---|
| Stitch class | `bg-surface-container`, `bg-surface-container-high`, `bg-surface-container-highest`, `text-on-surface`, `text-on-surface-variant`, `shadow-lg`, `shadow-md` | grep 新代码 |
| 旧颜色 | `#fdf6ec`, `#eae1da`, `#f5ece6`, `#efe7e0`, `#8b5000` | grep 新代码 |
| 旧结构 | Bottom Control Stack 三层堆叠 | 视觉检查 |
| 旧标签 | 快捷按钮恢复文字标签 | semantics 测试 |
| 旧行为 | 夜间模式变成弹窗 | semantics 测试 |
| 旧行为 | 内容替换显示全局规则库 | semantics 测试 |
| 旧行为 | 浮动页内控制变成上一章/下一章 | semantics 测试 |
| 旧语义 | `skip_previous` / `skip_next` 表达页内控制 | grep 新代码 |
| 旧行为 | 阅读页底栏"设置"混入 WebDAV/书源/RSS/全局设置 | 组件边界检查 |

---

## 七、真源文件映射

实现时必须参照以下 handoff 文件：

| 页面 | 真源 HTML | 真源 CSS |
|---|---|---|
| Bookshelf | `bookshelf-cover-mode.html`, `bookshelf-list-mode.html`, `bookshelf-empty.html` | `reader-screens.css` |
| Search | `search-home.html`, `search-results.html`, `search-empty.html`, `search-error.html`, `search-loading.html` | `reader-screens.css` |
| Book Detail | `book-detail.html`, `book-detail-toc-preview.html` | `reader-screens.css` |
| Reader | `control-layer-base-v2.html` + 8 reader state HTML | `reader-control-layer.css` |
| Settings | `global-settings.html` | `reader-screens.css` |
| Source | `source-management-list.html`, `source-detail.html`, `source-add.html`, `source-edit.html`, `source-import.html` | `reader-screens.css` |
| State | `global-loading.html`, `global-empty.html`, `global-error.html`, `offline-state.html`, `permission-required.html` | `reader-screens.css` |

---

## 八、测试策略

| 层级 | 内容 | 命令 |
|---|---|---|
| Unit | token 值、组件结构、state reducer | `./gradlew test` |
| Semantics | contentDescription、overlay 显隐规则 | `./gradlew test` |
| Boundary | 无旧 class/色值/WebView | grep + test |
| Route smoke | 核心路由可导航 | `./gradlew test` |
| Golden | Reader base + 8 states（Slice 9） | Compose screenshot test |

---

## 九、输出文件

- `CLAUDE_CODE_LOOP_PLAN.md` — 本文件
- `CLAUDE_CODE_LOOP_STATE.md` — 当前状态追踪
- `CLAUDE_CODE_LOOP_QUEUE.md` — 任务队列
- `CLAUDE_CODE_LOOP_RUNBOOK.md` — 每轮执行手册
- `docs/ui-handoff/compose/loop-reports/LOOP_NNN.md` — 每轮报告
- `docs/ui-handoff/compose/FINAL_COMPOSE_IMPLEMENTATION_REPORT.md` — 最终报告
