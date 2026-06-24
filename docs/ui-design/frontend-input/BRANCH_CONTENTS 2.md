# figma 分支内容索引（Branch Contents Index）

本文整理当前 `figma` 分支的前端设计稿输入件内容，方便审计、交接和后续真实前端开发。可见 UI 文案仍以各页面 `fixture` 和设计图为准；本文只描述文件归属、框架结构和验证入口。

当前分支状态（Current Branch State）：以当前 `git log -1 --oneline` 为准；本文只记录交付结构，不固定易过期的 commit 号。

## 分支范围（Branch Scope）

- 目标：把本地 UI 设计图整理为可验证的 `frontend-input` 前端设计稿输入件。
- 范围：30 个页面输入包、99 个本地 HTML、公共组件库、公共素材库、共享 shell kit、前端 demo 设计稿、manifest 校验和框架审计文档。
- 非范围：真实 Android App 代码实现、Figma Make 继续生成、线上产品逻辑。

## 核心入口（Primary Entry Points）

| 内容（Content） | 路径（Path） | 用途（Purpose） |
| --- | --- | --- |
| 验证清单（Validation Manifest） | `docs/ui-design/frontend-input/manifest.json` | 64 个正式验证目标、viewport、截图、shell、slot 和必需文案。 |
| 全量验证脚本（Validation Script） | `docs/ui-design/frontend-input/validate-frontend-inputs.js` | 渲染所有正式 HTML，生成截图和 `frontend-input-design-draft-validation.json`。 |
| 验证报告（Validation Report） | `docs/ui-design/frontend-input-design-draft-validation.json` | 最近一次全量校验结果。当前为 64/64 通过。 |
| 共享 Shell Kit（Shared Shell Kit） | `docs/ui-design/frontend-input/shared-shell-kit/` | 输出 `MainTabShell`、`LibraryShell`、`ReaderShell`、`SettingsShell`、`FlowShell` 的公共 slot 结构。 |
| 公共素材库（Asset Library） | `docs/ui-design/frontend-input/asset-library/` | UI 设计图、封面素材和 71 个统一语义图标 token。 |
| 公共组件库（Component Library） | `docs/ui-design/frontend-input/component-library/` | 组件、状态、底表、卡片、行和交互规则的可视化入口。 |
| 前端 Demo 设计稿（Frontend Demo Draft） | `docs/ui-design/frontend-input/frontend-demo-draft/` | 使用统一 shell 拼出的前端开发参考稿。 |
| Compose 状态预览（Compose State Previews） | `app/src/main/kotlin/com/reader/android/ui/preview/`、`app/src/main/kotlin/com/reader/android/ui/reader/source/SourceSwitchFlowScreen.kt` | 主标签页、书源管理链路、设置二级页、阅读控制层、阅读入口、沉浸阅读、目录与书签、阅读外观、朗读、阅读设置、自动翻页、书架搜索/详情/目录/排序筛选/分组管理/本地书导入链路，以及 FlowShell 换源横向流程的 Android Compose preview 状态。 |

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
| `MainTabShell` | 8 | 书架、发现、RSS、设置 | 4 个主标签页预览 + 4 个状态矩阵已通过 DOM slot 校验。 |
| `LibraryShell` | 16 | 书架空状态、书籍搜索、书籍详情、书籍目录、排序与筛选、书籍操作底表、分组管理、本地书导入 | 8 个书架链路页面预览 + 8 个状态矩阵已通过 DOM slot 校验。 |
| `ReaderShell` | 20 | 阅读控制层、目录与书签、阅读外观、朗读、阅读设置、自动翻页、内容搜索、内容替换、阅读入口、沉浸阅读 | 10 个阅读链路页面预览 + 10 个状态矩阵已通过 `ReaderShellKit` 强校验和 DOM slot 校验。 |
| `FlowShell` | 2 | 换源 | 横向流程预览 + 状态矩阵已通过 `ReaderShellKit.renderFlowShell(...)` 和 DOM slot 强校验。 |
| `SettingsShell` | 14 | App 通用设置、书架与搜索设置、隐私与权限、缓存管理、关于与反馈、同步与备份、书源管理 | 7 个设置链路页面预览 + 7 个状态矩阵已通过 `SettingsPageKit` 和 DOM slot 强校验。 |

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
| `FRONTEND_MAPPING_GUIDE.md` | 本地输入件到 Android Compose 前端实现的映射指南。 |
| `MAIN_NAV_RECONCILIATION.md` | 主导航从 `书源 / 我的` 收敛到 `RSS / 设置` 的实施清单。 |
| `ICON_COMPOSE_MAPPING.md` | 本地图标 token 到 Compose Material Icons 的映射和缺口清单。 |
| `FRAMEWORK_COMPONENT_ICON_STYLE_GUIDE.md` | UI 风格、图标、组件化和框架化规则。 |
| `HTML_FILE_REQUIREMENTS.md` | 本地 HTML 的正式输入件、状态矩阵、组件参考页和历史临时页规则。 |
| `ICON_LIBRARY_AUDIT.md` | 图标素材库审计。 |

## 验证命令（Validation Command）

```bash
NODE_PATH=/Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules \
/Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node \
docs/ui-design/frontend-input/validate-frontend-inputs.js
```

当前最近一次验证结果：

- `passed`: `true`
- targets: `64`
- preview targets: `30`
- state matrix targets: `30`
- failed targets: `0`
- ReaderShell targets: `20/20`
- icon tokens: `71`

## 当前待办（Open Work）

1. 真实前端映射执行（Frontend Mapping Implementation）：按 `FRONTEND_MAPPING_GUIDE.md`、`MAIN_NAV_RECONCILIATION.md` 和 `ICON_COMPOSE_MAPPING.md` 把输入件落实到 Android Compose。
2. 正式 MainTabShell 落地（MainTabShell Implementation）：主导航代码已收敛到 `书架 / 发现 / RSS / 设置`，运行时底栏已切到 `ReaderMainTabShell`，书架根路由已脱离 `StitchAppShell`，RSS 根路由已接入 `RssHomeScreen`，设置根页已接入 `SettingsRootScreen` + `SettingsHomeState` + `SettingsHomeDisplayState`，并已补主标签页 Compose preview/state matrix 第一批状态。
3. 图标素材同步执行（Icon Asset Sync Implementation）：主导航、书架、发现、RSS、设置二级页、书源链路、共享状态组件和阅读控制层已接入 `ReaderIconToken`；剩余直接 Material Icons 仅保留在 `ui/stitch/*` prototype 历史参考中。
4. 预览矩阵扩展（Preview Matrix Expansion）：FlowShell 换源已新增 Compose 输入框架、6 态 preview，并从阅读控制层换源入口接入 `ReaderRoutes.SOURCE_SWITCH`；书源管理链路已补列表、详情、编辑、导入状态 preview；设置二级页已补 WebDAV、备份、进度同步和远程书籍状态 preview；阅读链路已补基础控制、快捷覆盖层、底部功能覆盖层、夜间、正文、阅读入口、沉浸阅读、目录与书签、阅读外观、朗读、阅读设置和自动翻页状态 preview；书架二级链路已补书籍搜索、书籍详情、书籍目录、排序筛选、分组管理和本地书导入状态 preview。
5. 提交整理（Commit Planning）：按下面建议提交分组整理 staged 内容，避免把审计文档、验证产物和页面输入包混在不可读提交里。

## 建议提交分组（Suggested Commit Groups）

1. 框架契约与验证（Shell Contracts and Validation）：`contracts.d.ts`、`manifest.json`、`validate-frontend-inputs.js`、验证报告。
2. 共享框架与公共库（Shared Kits and Libraries）：`shared-shell-kit/`、`asset-library/`、`component-library/`、各链路 shared kit。
3. 页面输入件（Page Inputs）：30 个页面的 `frontend-input/` 包和验证截图。
4. 架构文档（Architecture Docs）：框架审计、路线图、组件目录、HTML 要求、图标风格和素材审计。

## 人工审计建议（Manual Review Order）

1. 先看 `frontend-demo-draft/index.html`，判断整体前端设计稿是否符合开发输入预期。
2. 再看 `shared-shell-kit/preview.html`，确认五类 shell 的 slot 结构。
3. 按 `PAGE_FRAMEWORK_AUDIT.md` 逐页抽查 preview 和 state matrix。
4. 再看 `FRONTEND_MAPPING_GUIDE.md`，确认输入件到 Android Compose 的文件映射、导航差异和实现优先级。
5. 再看 `MAIN_NAV_RECONCILIATION.md`，确认主导航产品结构是否按本地输入件收敛。
6. 再看 `ICON_COMPOSE_MAPPING.md`，确认 Compose 图标是否都能追溯到素材库 token。
7. 最后看 `asset-library/preview.html` 和 `component-library/preview.html`，确认图标、封面和组件语义是否可复用。

## 当前注意事项（Current Notes）

- 本分支包含大量生成型 `frontend-input` 文件，未跟踪目录应作为本分支交付内容一起审计，不应随意清理。
- `preview 2.html` 这类历史临时页不进入 manifest，不作为正式输入件。
- 后续真实前端开发应以 shell kit、manifest、contracts 和页面 `COMPONENT_SPEC.md` 为准，不应直接按截图拆布局。
