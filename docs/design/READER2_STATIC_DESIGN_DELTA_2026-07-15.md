# Reader 2 静态设计差异与回写矩阵

状态：Reader 2 控制层 VC2 / VC3 已完成；其他页面族仍按静态视觉闭环计划执行  
更新时间：2026-07-15  
Figma 权威页：[`15 · Reader 2`](https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=1023-17636)

## 1. 冻结边界

本轮只处理 Reader 静态视觉与结构，不进入 Motion，也不修改 Android、iOS、HarmonyOS Host。

- Figma `15 · Reader 2` 是控制层静态视觉唯一输入源。
- `frontend-demo-optimized/` 负责可执行状态、连续分页、交互与响应式验证。
- Figma 单页正文样本不能替代运行时分页；运行时必须从完整章节连续排版。
- Phone、CompactLandscape、TabletExpanded 均为“全屏正文 + 悬浮控制层”，不得改成左右分栏。
- ThemeSwatch、FontCell、timer-card 只能通过各自共享源消费，不得在页面内复制视觉实现。

## 2. 权威节点与路由

| 设计输入 | Figma node | Reader-UI 路由 / 状态 |
| --- | --- | --- |
| 控制首页 | `654:674` | `reader` |
| 七状态集合 | `1023:18314` | 4 module overlays + 3 quick overlays |
| 四完整页集合 | `1023:18294` | `reader-full-directory` / `reader-full-tts` / `reader-full-appearance` / `reader-full-settings` |
| Phone master | `1023:18737` | 390×844 |
| CompactLandscape master | `1023:18741` | 844×390 |
| TabletExpanded master | `1023:18745` | 760×960 设备画布 |
| ThemeSwatch | `1023:17824` | quick/full appearance 与 theme consumers |
| FontCell | `1023:17903` | quick/full appearance、font/layout consumers |
| timer-card | `1137:10098` | `reader-full-tts` 定时模块 |
| ChapterFlow | `1197:10539` | `readerTextBlocks` + runtime paginator |
| ChapterPage | `1197:10572` | 仅作静态第一页视觉参考 |

七个 canonical overlay：

```text
reader-directory-overlay-v2
reader-tts-overlay-v2
reader-appearance-overlay-v2
reader-settings-overlay-v2
reader-search-overlay-v2
reader-auto-scroll-overlay-v2
reader-replace-overlay-v2
```

真实点击仍分别进入 `toc-bookmarks`、`tts`、`reader-appearance`、`reader-settings`、`content-search`、`auto-page`、`content-replacement`；两套路由保持同视觉、不同 surface 语义。

## 3. Design Delta Matrix

| ID | 冻结事实 | 回写落点 | 影响范围 | 状态 |
| --- | --- | --- | --- | --- |
| R2-01 | TopBar、Phone Sheet、亮度条、4 模块导航沿用 Reader 2 几何、R 角和阴影 | `styles/02a-reader-control.css`、`styles/03c-reader-viewport.css`、runtime shared fragments | 全部 Reader 控制状态 | 已核验；无需重画 |
| R2-02 | 正文覆盖完整设备画布；Dock 只悬浮，不参与正文宽度计算 | `styles/03c-reader-viewport.css` | Phone / Compact / Tablet | 已回写并保留现有分页修复 |
| R2-03 | ChapterFlow 全章节动态分页；视口、字体和排版变化后失效重算 | `render-runtime.js`、`verify/reader-pagination-runtime.test.mjs` | 全部阅读状态 | 已回写 |
| R2-04 | ThemeSwatch 62.5×24，内部 46×18 R6；default 0.5px、active 2px；所有状态无阴影 | W4 `themeSwatch` helper、`styles/03a-reader-appearance.css`、runtime delegation | quick/full appearance、theme pages | 已回写 |
| R2-05 | FontCell 62.5×27，内部 55×22 R11；default 无阴影，active 仅内阴影；使用对应字体 | W4 `fontCell` helper、`styles/03a-reader-appearance.css`、runtime delegation | quick/full appearance、font/layout pages | 已回写 |
| R2-06 | Full Appearance 为 316×210 ThemeLibrary + 316×169.4 FontLibrary + 316×406 Typography；内容滚动，不压缩 | W4 full appearance body、`styles/03a-reader-appearance.css` | `reader-full-appearance` | 已按 Figma 当前 `AppearanceContent` 顺序回写 |
| R2-07 | timer-card 312×260；summary 280×44；picker 280×164；两轮各 120×140 | `render-runtime.js` 唯一源标记、`styles/07-control-primitives.css` | `reader-full-tts` | 已回写 |
| R2-08 | Full Panel header/content 分别位于 panel 内 13,19 / 13,57；Header 图标 16×16 | `styles/03d-reader-fullpage.css` | 四个 primary full pages 及 child pages | 已回写 |
| R2-09 | Full Directory 两个 Tab 都使用当前 Tabler 实例：ReaderModuleDirectory / Bookmark，15×15 | `render-runtime.js`、Tabler registry | `reader-full-directory` | 已回写 |
| R2-10 | PaperLayer 是暗角、左上柔光、线性纸色、tile 纹理四层；不得额外产生左上方形色块 | runtime theme variables、`styles/01-shell-layout.css` | 全部 Reader 页面 | 已核验；无局部阴影块 |
| R2-11 | QA 截图不得被 Demo 的“常规/开发者”切换器遮挡 | `captureChrome=0` + `styles/00-foundation.css` | 仅本地验证入口 | 已回写；不改变正常 demo |

## 4. 响应式冻结值

| 设备画布 | TopBar | ControlSheet | ModuleNav | ReadingContent |
| --- | --- | --- | --- | --- |
| Phone 390×844 | 15,19 / 360×54 | 13,495 / 364×330 / R24 | 25,731 / 340×80 / R12 | 33,73 / 324×722 |
| Compact 844×390 | 15,13 / 814×48 | 487,90 / 340×230 / R24,24,0,0 | 487,319 / 340×54 / R0,0,12,12 | 31,75 / 782×290 |
| Tablet 760×960 | 29,19 / 702×54 | 395,597 / 340×252 / R24,24,0,0 | 395,848 / 340×79 / R0,0,12,12 | 45,93 / 670×810 |

Tablet 的 760×960 是内部设备画布。浏览器需使用宽度至少 840px 的外视口，再按 `.fd-active-screen` 裁切；把浏览器本身设成 760×960 只会得到 560×844 的 expanded phone canvas。

## 5. 不进入本轮的内容

- Figma Motion Reference、关键帧、duration/easing。
- 三个 Host 的 SwiftUI / Compose / ArkUI 实现。
- 从 Figma 自动生成或覆盖本地页面结构。
- 把 235 个 route/alias 全部复制为 Figma 页面。

## 6. VC3 浏览器闭环证据

- Phone `390×844`：12 个 primary 状态全部通过；控制首页 Sheet 实测为 `364.896×330`，锦标误差均在 1px 内。
- CompactLandscape `844×390`：TopBar `815.347×47.995`，Sheet `340×230`，ModuleNav `340×53.993`；正文层宽 `783.333`，Dock 仅覆盖在其上。
- TabletExpanded：外视口稳定命中 `tablet-expanded` 后，内部设备画布为 `760×959.774`；相对画布的 TopBar / Sheet / Nav 锦标分别约为 `29,19` / `395,597` / `395,849`。
- 连续分页为 runtime 计算：Phone / Compact / Tablet 首页实测页数分别为 `7 / 13 / 5`；控制层不参与正文宽度计算。
- 4 个模块入口、3 个快捷入口、Search / AutoPage 展开与收起、沉浸阅读开合、换源入口全部可达；7 个兼容路由与 canonical overlay 几何一致。
- 12 个 primary 状态的禁止阴影、brightness dim `box-shadow/filter/pointer-events` 检查为零失败，左上方形色块未复现。
- 浏览器 console 为 0 warning / error。对照图：`/tmp/reader2-vc3-implementation/phone-all-after-comparison.png` 与 `/tmp/reader2-vc3-implementation/responsive-after-comparison.png`。
- 仓库门禁：Demo verify `46/46`，P0 matrix `120/120`，Tabler registry `staticGaps=0`，Contract consistency `unapproved=0`，三个 JavaScript syntax check 与 `git diff --check` 全部通过。

Reader 2 控制层 VC3 已关闭。这不会自动关闭 Reader 之外的 24 页面/状态族，也不代表 Motion 或三个 Host 已实现。
