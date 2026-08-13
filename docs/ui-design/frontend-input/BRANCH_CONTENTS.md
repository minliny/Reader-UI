# local 分支内容索引（Branch Contents Index）

本文整理当前 `local` 分支的前端设计稿输入件内容，方便审计、交接和后续真实前端开发。可见 UI 文案仍以各页面 `fixture` 和设计图为准；本文只描述文件归属、框架结构和验证入口。

当前分支状态（Current Branch State）：以当前 `git log -1 --oneline` 为准；本文只记录交付结构，不固定易过期的 commit 号。

## 分支范围（Branch Scope）

- 目标：把本地 UI 设计图整理为可验证的 `frontend-input` 前端设计稿输入件。
- 范围：30 个页面输入包、公共组件库、公共素材库、共享 shell kit、根目录 `frontend-demo/`、30 张本地 demo 同步设计图、manifest 校验、框架审计文档，以及面向 Android Compose 的输入状态预览和覆盖守卫。
- 非范围：真实业务数据接入、线上产品逻辑、完整交互动效实现、端到端 UI 自动化。

## 核心入口（Primary Entry Points）

| 内容（Content） | 路径（Path） | 用途（Purpose） |
| --- | --- | --- |
| 验证清单（Validation Manifest） | `docs/ui-design/frontend-input/manifest.json` | 64 个正式验证目标：30 个页面预览、30 个状态矩阵、4 个公共库/示例目标；不包含 `preview 2.html` 或 `components.html`。 |
| 设计 Token 契约（Design Token Contract） | `docs/ui-design/frontend-input/design-tokens.json`、`docs/ui-design/frontend-input/tokens.css` | 70 个 token，连接 HTML CSS 变量和 Compose theme 源文件，覆盖颜色、基础间距、frame、安全区、shell 尺寸、z-index、文本范围、字号、圆角、阴影和 focus。 |
| 全量验证脚本（Validation Script） | `docs/ui-design/frontend-input/validate-frontend-inputs.js` | 渲染所有正式 HTML，生成截图和 `frontend-input-design-draft-validation.json`。 |
| 验证报告（Validation Report） | `docs/ui-design/frontend-input-design-draft-validation.json` | 最近一次全量校验结果。当前为 64/64 通过，并校验 token 契约、manifest inventory、详版页面规划、30 个组件参考页和 demo 单一应用画布、页面内路由、返回栈、键盘、底表、弹窗交互。 |
| 可执行规划契约（Executable Planning Contract） | `docs/ui-design/frontend-input/FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` | 规划层总收口，明确页面、Shell、组件、覆盖、导航栈、状态替换、动效、无障碍、素材裁切和验收规划，作为进入实现前的结构依据。 |
| 详版页面规划（Detailed Page Planning） | `docs/ui-design/frontend-input/FRONTEND_DETAILED_PAGE_PLANNING_CARDS.md` | 30 个正式页面的详版字段矩阵，覆盖结构与覆盖、入口返回、上下文事件、适配文本、组件和验收，并由验证脚本守住。 |
| 工作流闭合规划（Workflow Closure Planning） | `docs/ui-design/frontend-input/WORKFLOW_CLOSURE_PLANNING.md` | 补充当前 demo 审计结论、8 个真正缺失页面 / 状态的页面级工作量规划；只包含数据恢复和数据调测。 |
| 共享 Shell Kit（Shared Shell Kit） | `docs/ui-design/frontend-input/shared-shell-kit/` | 输出 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell` 的公共 slot 结构。 |
| 公共素材库（Asset Library） | `docs/ui-design/frontend-input/asset-library/` | UI 设计图、封面素材和统一语义图标 token。 |
| 公共组件库（Component Library） | `docs/ui-design/frontend-input/component-library/` | 组件、状态、底表、卡片、行和交互规则的可视化入口。 |
| 前端 Demo 设计稿（Frontend Demo） | `frontend-demo/` | 当前本地 demo 和 30 张顶层 `UI设计图.png` 的视觉源头。 |
| 本地 Demo 设计图同步表（Local Demo Design Asset Map） | `docs/ui-design/frontend-input/LOCAL_DEMO_DESIGN_ASSET_MAP.md` | 记录页面、demo route、操作态和输出设计图的对应关系。 |
| 书架页 Demo（Bookshelf Page Demo） | `docs/ui-design/frontend-input/bookshelf-demo/index.html` | 复用书架输入件、MainTabShell、书籍组件和状态切换的人工审视页，不进入正式 manifest。 |
| 事件回调映射（Event Callback Mapping） | `docs/ui-design/frontend-input/EVENT_CALLBACK_MAPPING.md` | 将 30 个页面、281 个事件 `Event` union 映射到稳定 Compose 回调名。 |
| Compose 状态预览（Compose State Previews） | `app/src/main/kotlin/com/reader/android/ui/preview/`、`app/src/main/kotlin/com/reader/android/ui/reader/source/SourceSwitchFlowScreen.kt` | 主标签页、书源管理链路、设置二级页（App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理、WebDAV、备份、进度同步、远程书籍）、阅读控制层、沉浸阅读、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、书架空状态/搜索/详情/目录/排序筛选/书籍操作底表/分组管理/本地书导入链路，以及 FlowShell 换源横向流程的 Android Compose preview 状态。 |
| HTML 库存守卫（HTML Inventory Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputHtmlInventoryTest.kt` | 确认 100 个本地 HTML、97 个 `frontend-input` 范围 HTML、30 个正式预览页、30 个状态矩阵、30 个组件参考页、2 个历史 `preview 2.html`、4 个公共库/示例页、1 个人工审视 demo 和 3 个历史独立复刻页分类一致，并确认 manifest 不接收历史/参考页。 |
| 素材库库存守卫（Asset Library Inventory Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputAssetLibraryInventoryTest.kt` | 确认素材库 `fixture.json`、`fixture.js`、`icons.js`、实际 UI 图/封面文件、manifest 和验证报告中的 30 张 UI 图、6 张封面、90 个图标 token、35 个补齐图标和验证截图登记一致。 |
| 组件库库存守卫（Component Library Inventory Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputComponentLibraryInventoryTest.kt` | 确认公共组件库 `render.js`、`fixture.json`、`fixture.js`、manifest 和验证报告中的 49 个组件卡、6 个 section、17 个 fixture 图标 token 与素材库登记一致。 |
| FlowShell 库存守卫（FlowShell Inventory Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputFlowShellInventoryTest.kt` | 确认换源输入包、`ReaderShellKit.renderFlowShell(...)`、非空 `FlowShell StateHost`、manifest、验证报告、文档和 Compose preview 锚点同步。 |
| 阶段完成摘要守卫（Phase Completion Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputPhaseCompletionGuardTest.kt` | 确认阶段完成口径、验证报告数字、守卫命令、后续边界和交接入口保持同步。 |
| Compose 覆盖守卫（Compose Coverage Guard） | `app/src/test/kotlin/com/reader/android/ui/preview/FrontendInputComposeCoverageTest.kt` | 确认 30 张 UI 设计图、30 个输入包、`contracts.d.ts` 的 Fixture/State/Event、事件到 Compose 回调映射、manifest 64 个正式目标集合、`shellName/pageRole/slots` 正式 taxonomy、验证报告目标集合、preview/state-matrix 目标和状态卡数量、spec 状态与事件声明及状态名/事件名、Compose 输入源码和 Compose preview 状态一致。 |
| Token 契约守卫（Token Contract Guard） | `app/src/test/kotlin/com/reader/android/ui/theme/ReaderDesignTokenContractTest.kt` | 确认 `design-tokens.json`、`tokens.css` 和 Compose theme token 源文件同步，并守住结构 token 组。 |
| Compose UI Test 首版（Compose UI Test First Pass） | `app/src/androidTest/kotlin/com/reader/android/ui/ReaderShellComposeUiTest.kt` | 覆盖主导航四按钮选择和阅读控制层模块/快捷操作语义；当前已通过 androidTest Kotlin 编译。 |
| 组件映射守卫（Component Mapping Guard） | `app/src/test/kotlin/com/reader/android/ui/components/ReaderSharedComponentsStructureTest.kt` | 确认公共组件库中的核心语义组件都有 Compose 实现锚点，并守住 manifest 中 `MainTabShell`、`LibraryShell`、`ReaderShell`、`FlowShell`、`SettingsShell` 到 Compose 骨架、slot 和 preview 的追溯关系。 |
| 图标边界守卫（Icon Boundary Guard） | `app/src/test/kotlin/com/reader/android/ui/components/ReaderIconImportBoundaryTest.kt` | 只允许生产 UI 通过 `ReaderIcons.kt` 映射 Material Icons；`ui/stitch/*` 作为历史原型例外保留。 |

## 页面输入包（Page Input Packages）

所有页面输入包都遵守同一结构：

- `fixture.json` / `fixture.js`：页面数据。
- `render.js`：页面 renderer。
- `preview.html`：单页正式预览。
- `state-matrix.html`：状态矩阵。
- `components.html`：组件拆分和人工审计参考。
- `README.md`：页面目标、复用组件、状态覆盖和禁用项。
- `COMPONENT_SPEC.md`：输入契约、事件和验收标准。
- `verify/`：验证脚本生成的截图。

## Shell 覆盖（Shell Coverage）

| Shell | Manifest 目标数（Targets） | 页面范围（Pages） | 当前状态（Status） |
| --- | ---: | --- | --- |
| `ComponentLibraryShell` | 3 | 公共组件库、共享 Shell Kit、前端 Demo 设计稿 | 已通过 manifest 校验。 |
| `AssetLibraryShell` | 1 | 公共素材库 | 已通过 manifest 校验。 |
| `MainTabShell` | 8 | 书架、发现、RSS、设置 | 4 个主标签页预览 + 4 个状态矩阵已通过 DOM slot 校验；Compose 侧已补书架、发现、RSS、设置四个主标签页状态矩阵，并由组件映射守卫追溯到 `ReaderMainTabShell` / `ReaderMainTabBar`。 |
| `LibraryShell` | 16 | 书架空状态、书籍搜索、书籍详情、书籍目录、排序与筛选、书籍操作底表、分组管理、本地书导入 | 8 个书架链路页面预览 + 8 个状态矩阵已通过 DOM slot 校验，并由组件映射守卫追溯到返回顶栏、底部导航、状态宿主和书架链路 preview。 |
| `ReaderShell` | 20 | 阅读控制层、阅读入口、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、沉浸阅读 | 10 个阅读链路页面预览 + 10 个状态矩阵已通过 `ReaderShellKit` 强校验和 DOM slot 校验，并由组件映射守卫追溯到阅读正文、覆盖层、底表、模块导航和阅读状态宿主。 |
| `FlowShell` | 2 | 换源 | 横向流程预览 + 状态矩阵已通过 `ReaderShellKit.renderFlowShell(...)` 和 DOM slot 强校验，`FlowShell StateHost` 已固化为非空状态摘要，并由 FlowShell 库存守卫和组件映射守卫追溯到换源 Compose 横向流程。 |
| `SettingsShell` | 14 | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理 | 7 个设置链路页面预览 + 7 个状态矩阵已通过 `SettingsPageKit` 和 DOM slot 强校验，并由组件映射守卫追溯到设置内容区、底表、弹窗和状态宿主。 |

## 阶段完成口径（Phase Done Criteria）

这一大步骤完成到“可作为前端输入件和 Compose 输入框架”的程度即可，不等于线上功能全部完成。完成条件如下：

1. 规划闭环（Planning Closure）：30 个页面都有页面规划卡和详版字段矩阵，五类 Shell、公共组件、覆盖关系、导航栈、状态替换、运行时适配、动效、无障碍、素材裁切和验收规则已由 `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` 收口。
2. 输入件闭环（Input Package Closure）：30 个页面都有 `preview.html`、`state-matrix.html`、`components.html`、fixture、renderer、README 和 `COMPONENT_SPEC.md`。
3. 框架闭环（Shell Closure）：所有正式页面只能归入 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell`，且 manifest DOM slot 校验通过。
4. 组件与素材闭环（Component and Asset Closure）：公共组件库、共享 shell kit、素材库、图标 token 和封面素材可追溯，公共组件库 49 个组件卡由 `FrontendInputComponentLibraryInventoryTest` 守住，核心公共组件和五个 runtime shell 通过 `ReaderSharedComponentsStructureTest` 映射到 Compose 实现锚点，新增页面优先复用已有组件。
5. Compose 输入闭环（Compose Input Closure）：30 张 UI 设计图、30 个输入包和 30 个正式页面都有对应 `contracts.d.ts` Fixture/State/Event、Kotlin UI state、mapper/fixture 构造点、页面级 preview 和页面事件契约，且通过 `FrontendInputComposeCoverageTest` 守卫。
6. 验证闭环（Validation Closure）：HTML manifest 校验保持 64/64 通过，manifest 目标集合只能由 30 个页面预览、30 个状态矩阵和 4 个公共库/示例目标组成，manifest 的 `shellName/pageRole/slots` 必须匹配正式 shell taxonomy，验证报告必须与 manifest、token 契约、30 页详版规划、30 个 `components.html` 组件参考页和 demo 首批交互同步，Compose 侧至少通过覆盖守卫、token 契约守卫、相关 preview 结构测试和 androidTest 编译。
7. 留白明确（Explicit Remaining Work）：真实业务数据、完整点击链路、动效细节和端到端 UI test 可以留到下一阶段，但必须在文档中明确为实现和验收深化，不再写成规划缺口。

## 目录归属（Directory Ownership）

| 目录（Directory） | 内容（Content） |
| --- | --- |
| `docs/ui-design/02-主标签页/` | 4 个主标签页输入件和 `shared-main-tab-kit`。 |
| `docs/ui-design/03-书架链路/` | 8 个书架二级链路输入件和 `shared-library-kit`。 |
| `docs/ui-design/04-阅读链路/` | 10 个竖屏阅读链路输入件 + 1 个横向换源输入件。 |
| `docs/ui-design/05-设置链路/` | 7 个设置二级页输入件和 `shared-settings-kit`。 |
| `docs/ui-design/frontend-input/` | 全局契约、manifest、验证脚本、公共组件库、公共素材库、共享 shell kit、审计文档。 |

## 审计文档（Audit Documents）

| 文档（Document） | 作用（Purpose） |
| --- | --- |
| `PAGE_FRAMEWORK_ARCHITECTURE.md` | 页面 shell 架构、slot 定义和完成标准。 |
| `PAGE_FRAMEWORK_AUDIT.md` | 逐页框架使用审计。 |
| `FRAMEWORK_COMPONENT_CATALOG.md` | 框架、组件、页面归属和抽象边界总目录。 |
| `FRAMEWORK_COMPONENT_ROADMAP.md` | 已完成内容和后续真实前端映射顺序。 |
| `FRONTEND_EXECUTABLE_PLANNING_CONTRACT.md` | 规划层总收口，定义可实现的几何、组件、导航、覆盖、状态、动效、无障碍、素材和验收规则。 |
| `WORKFLOW_CLOSURE_PLANNING.md` | 当前 demo 工作流闭合缺口、所有待补页面 / 状态的工作量规划和补页顺序，区分硬性路由缺口与未闭合流程状态。 |
| `FRONTEND_MAPPING_GUIDE.md` | 本地输入件到 Android Compose 前端实现的映射指南。 |
| `EVENT_CALLBACK_MAPPING.md` | 页面事件到 Android Compose 回调名的映射表。 |
| `MAIN_NAV_RECONCILIATION.md` | 主导航从 `书源 / 我的` 收敛到 `RSS / 设置` 的实施清单。 |
| `ICON_COMPOSE_MAPPING.md` | 本地图标 token 到 Compose Material Icons 的映射和缺口清单。 |
| `FRAMEWORK_COMPONENT_ICON_STYLE_GUIDE.md` | UI 风格、图标、组件化和框架化规则。 |
| `HTML_FILE_REQUIREMENTS.md` | 本地 HTML 的正式输入件、状态矩阵、组件参考页和历史临时页规则。 |
| `ICON_LIBRARY_AUDIT.md` | 图标素材库审计。 |

## 验证命令（Validation Command）

HTML 输入件渲染校验（HTML Input Render Validation）：

```bash
NODE_PATH=/Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
docs/ui-design/frontend-input/validate-frontend-inputs.js
```

Compose 输入框架守卫（Compose Input Framework Guards）：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
./gradlew testDebugUnitTest \
  --tests com.reader.android.ui.preview.FrontendInputComposeCoverageTest \
  --tests com.reader.android.ui.preview.FrontendInputHtmlInventoryTest \
  --tests com.reader.android.ui.preview.FrontendInputAssetLibraryInventoryTest \
  --tests com.reader.android.ui.preview.FrontendInputComponentLibraryInventoryTest \
  --tests com.reader.android.ui.preview.FrontendInputFlowShellInventoryTest \
  --tests com.reader.android.ui.preview.FrontendInputPhaseCompletionGuardTest \
  --tests com.reader.android.ui.components.ReaderSharedComponentsStructureTest \
  --tests com.reader.android.ui.components.ReaderIconTokenMappingTest \
  --tests com.reader.android.ui.components.ReaderIconImportBoundaryTest \
  --tests com.reader.android.ui.theme.ReaderDesignTokenContractTest \
  --tests com.reader.android.ui.preview.MainTabStateMatrixPreviewTest \
  --tests com.reader.android.ui.preview.LibraryFlowStateMatrixPreviewTest \
  --tests com.reader.android.ui.preview.ReaderControlStateMatrixPreviewTest \
  --tests com.reader.android.ui.preview.ReaderShellStateMatrixPreviewTest \
  --tests com.reader.android.ui.preview.SettingsSecondaryStateMatrixPreviewTest \
  --tests com.reader.android.ui.reader.source.SourceSwitchFlowStructureTest
```

Compose UI test 编译（Compose UI Test Compile）：

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home \
./gradlew :app:compileDebugAndroidTestKotlin
```

当前最近一次验证结果：

- `passed`: `true`
- targets: `64`
- preview targets: `30`
- state matrix targets: `30`
- library/demo targets: `4`
- component reference smoke targets: `30`
- design token contract: `70` tokens, passed
- frontend demo interactions: single app canvas, in-page route navigation, direct bookshelf/cover/detail entry to immersive reading, center tap to control layer, back stack, main tab navigation, keyboard overlay, bottom sheet, dialog, reader module navigation, source list selection passed
- failed targets: `0`
- ReaderShell targets: `20/20`
- icon tokens: `79`
- Compose guard scope: HTML inventory, asset library inventory, component library inventory, FlowShell inventory, phase completion summary, frontend coverage, event callback mapping, runtime shell anchors, icon token/import boundary, MainTab/Library/ReaderControl/ReaderShell/Settings/FlowShell state matrix.

## 下一阶段边界（Next Phase Boundary）

当前大步骤交付的是可继续开发的前端设计稿输入件和 Android Compose 输入框架。以下内容属于下一阶段，不阻塞当前输入件完成口径：

1. 真实业务数据接入（Real Data Wiring）：把 fixture/state 映射到真实书架、发现、RSS、阅读、设置和换源数据源。
2. 完整事件链路接入（Full Event Wiring）：把 `EVENT_CALLBACK_MAPPING.md` 的回调接入 ViewModel、副作用、导航和持久化。
3. 动效细节实现（Motion Implementation）：按现有选中态和弹层规则补齐真实运行时动效，不改变 shell slot 和组件边界。
4. 可交互 UI test（Interactive UI Tests）：在当前 `ReaderShellComposeUiTest` 首版基础上继续补真实点击、滚动、权限和失败恢复测试，并在可用设备上跑 `connectedDebugAndroidTest`。

## 人工审计建议（Manual Review Order）

1. 先看 `frontend-demo/index.html`，判断整体前端设计稿是否符合开发输入预期。
2. 再看 `shared-shell-kit/preview.html`，确认五类 shell 的 slot 结构。
3. 按 `PAGE_FRAMEWORK_AUDIT.md` 逐页抽查 preview 和 state matrix。
4. 再看 `FRONTEND_MAPPING_GUIDE.md`，确认输入件到 Android Compose 的文件映射、导航差异和实现优先级。
5. 再看 `MAIN_NAV_RECONCILIATION.md`，确认主导航产品结构是否按本地输入件收敛。
6. 再看 `ICON_COMPOSE_MAPPING.md`，确认 Compose 图标是否都能追溯到素材库 token。
7. 最后看 `asset-library/preview.html` 和 `component-library/preview.html`，确认图标、封面和组件语义是否可复用。

## 当前注意事项（Current Notes）

- 本分支包含大量生成型 `frontend-input` 文件，应作为本分支交付内容一起审计，不应随意清理。
- `preview 2.html` 这类历史临时页不进入 manifest，不作为正式输入件。
- `components.html` 是组件参考输入，不进入正式 manifest 目标；正式目标集合由 `FrontendInputComposeCoverageTest` 守卫。
- 后续真实前端开发应以 shell kit、manifest、contracts 和页面 `COMPONENT_SPEC.md` 为准，不应直接按截图拆布局。
