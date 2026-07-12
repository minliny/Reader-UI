# 前端 Demo 设计稿（Frontend Demo）

## 页面定位（Page Role）

这是当前前端 demo 入口，用于把本地 29 张 UI 设计图重新组织成可前端实现的统一结构。它不是 Figma Make 生成物，也不覆盖旧 `frontend-input/` 页面。

入口文件（Entry）：`frontend-demo-optimized/index.html`

当前浏览器路径（Browser Path）：`/frontend-demo-optimized/`

共享框架来源（Shared Shell Source）：`frontend-demo-optimized/shared-shell-kit/kit.js`

## 覆盖范围（Coverage）

- 主标签页框架（MainTabShell）：书架、发现、RSS、设置的统一底部导航和内容区结构。
- 书架链路框架（LibraryShell）：书籍搜索、详情、目录、排序筛选、操作底表、分组管理、本地书导入、底表、弹窗宿主。
- 设置页框架（SettingsShell）：设置返回顶栏、设置分组、设置行、Toast/Dialog/State 宿主。
- 流程框架（FlowShell）：换源窗口、候选来源列表。

## 当前可交互范围（Current Interaction Scope）

- 单一应用画布（Single App Canvas）：页面只渲染当前路由，不再把所有页面并排列出；右侧只显示当前 Shell、当前页面和返回栈状态。
- 全量捕获模式（All Routes Capture Mode）：Figma 或审计需要一次查看所有页面时，可用 `?captureMode=all` 进入多路由捕获板；该模式仍复用当前 demo renderer，为每个路由输出一个手机画布，不参与常规应用交互。
- 显示模式（Display Modes）：默认常规显示只保留手机应用画布；开发者模式显示路由状态、Shell、当前页面和返回栈，用于结构审计。
- 页面内跳转（In-page Navigation）：书架搜索、书籍卡片、详情页开始阅读、阅读器换源、设置行、主导航等按钮都从当前页面内部触发路由跳转。
- 深链返回栈（Deep-link Back Stack）：使用 `?captureRoute=` 直接打开二级页面时，demo 会补默认来源上下文；书架链路默认 `bookshelf -> 当前页`，设置链路默认 `settings -> 当前页`，阅读和换源默认从 `bookshelf` 进入，保证页面返回符合应用导航而不是无响应。
- 返回栈（Back Stack）：Demo 返回按钮和页面返回顶栏共享同一返回栈；主 TAB 切换属于根级切换，不压入返回栈。
- 书架滚动密度（Bookshelf Scroll Density）：书架示例以紧凑继续阅读横条、自适应 4 列书籍网格、2:3 封面容器和 MainNav 底部 inset 验证内容密度；主导航可悬浮在内容上方，最后一本书仍可滚动到导航上方。
- 书架链路（Library Flow）：书架页可进入排序筛选、分组管理、本地导入；空状态属于书架内容状态，不作为普通按钮入口；书籍详情可进入目录，操作底表必须作为当前详情页覆盖层打开。
- 主导航（Main Tab Navigation）：书架、发现、RSS、设置四个主导航按钮进入对应 MainTabShell 页面，并保持按钮数量、尺寸和位置稳定。
- 键盘覆盖（Keyboard Overlay）：搜索页输入入口可打开键盘层，输入框获得焦点，键盘层级高于主导航。
- 底表与弹窗（Bottom Sheet and Dialog）：书籍详情示例可打开底表和确认弹窗，弹窗层级高于底表。

这些交互由当前 `frontend-demo-optimized/` renderer 覆盖；当前验证页面结构和关键覆盖关系，不代表真实业务数据、完整导航实现或端到端设备测试已经完成。

## 动效规划（Motion Planning）

当前 demo 的动效规划由本目录内文档和 contract fixtures 组成：`MOTION_CONTRACT.md` 定义跨端共享的 motion token、状态迁移和验收边界；`MOTION_EFFECTS.md` 描述每个场景的实际动画效果、方向、时序和禁用项；`MOTION_SELECTOR_MATRIX.md` 映射 148 个唯一 `data-*` 入口到 Motion ID、demo route、平台组件和证据位置；`MOTION_INTERACTION_COMPONENT_AUDIT.md` 审计当前交互组件族是否被统一 Motion ID 纳管；`MOTION_IMPLEMENTATION_GAP_AUDIT.md` 追踪从规划稿到可执行规格之间的缺口。平台应用用原生 SwiftUI / Compose / ArkUI 实现，不直接复用 Web CSS 或 DOM 行为。

执行入口是 `motion-controller.js` 暴露的 `ReaderMotionController.CONTRACT`。它把 Motion ID 解析到 family、token、state fields、state machine、平台组件和证据规则；`verify/motion/verify-motion-coverage.mjs` 会检查当前 renderer 绑定的 Motion ID 是否都能被这份 registry 解析，并校验关键 Motion ID 是否有精确 `from/to/interrupt/finalState/reducedMotion` 状态机。平台实现不得照抄 CSS，而应复用同一 Motion ID、state fields、state machine、token 和证据要求，再映射到 Compose / SwiftUI / ArkUI 的原生状态与动画 API。

## 图标来源（Icon Source）

所有设计稿图标通过 `./asset-library/icons.js` 的 `ReaderAssetIcons.renderIcon(id, className)` 渲染。新稿内不新增一次性 SVG。

## 前端拆分规则（Frontend Split Rules）

- 先实现五个页面框架（Page Shells），再迁移旧 29 页到对应 slot。
- `render.js` 只作为同步 bootstrap，主渲染实现放在 `render-runtime.js`。
- `route-contract.js` 是 demo route 与发现 / RSS / 设置深层闭合清单的唯一契约源。
- `styles.css` 只作为 CSS 入口，页面和模块样式放在 `styles/*.css` 分层文件。
- 页面外壳必须通过 `ReaderShellKit.render*Shell(...)` 输出，不在页面 renderer 里重写顶栏、底栏和宿主节点。
- 书封图片是内容资源；UI 控件、导航、弹层和状态必须用组件实现。
- 旧 `preview 2.html` 之类临时文件不作为前端输入件。

## Canonical 合并历史（Canonical Consolidation History）

本目录已是唯一 canonical runnable demo。下列内容保留原版到 optimized 的合并历史；平台实现只读取本目录，不再依赖已删除的旧 demo 目录。

### Token 前缀迁移（Token Prefix Migration）

- 原 `--reader-ds-*` 全部迁移为 `--fd-ds-*`，包括 `tokens.css`、所有 `styles/*.css`、`shared-shell-kit/kit.css` 和 `render-runtime.js`。
- `shared-shell-kit` 通过 `--rsk-*` 适配层映射到 `--fd-ds-*`，对外接口不变。
- `motion-tokens.css` 与 `motion-controller.js` 保持原样，不引用 ds token，是独立体系。

### z-index token 化（z-index Tokenization）

所有 z-index 硬编码已替换为 `var(--fd-ds-z-*)` 或 `calc(var(--fd-ds-z-*) + N)`。新增 token：

- `--fd-ds-z-flow-window`（36）— 换源窗口层，介于 bottom-sheet(30) 与 reader-module-nav(40) 之间
- `--fd-ds-z-settings-dropdown`（42）— 设置页选项下拉层
- `--fd-ds-z-dev-overlay`（95）/ `--fd-ds-z-dev-region`（96）— 开发者模式调试浮层
- `--fd-ds-z-demo-switch`（100）— 演示模式切换按钮

### 字体加载（Font Loading）

- 字体栈优先使用系统字体（PingFang SC / Songti SC），Web 字体（Noto Sans/Serif SC）作为补充，避免首屏阻塞。
- Web 字体改用国内镜像 `fonts.font.im`，保留 `font-display=swap` 兜底。

## 后续动作（Next Actions）

1. 平台开发启动前先读本目录 demo 结构和 `../contracts/` schema / fixtures；旧设计导出已删除，不再作为输入。
2. 继续把 `render-runtime.js` 内部页面模板按 `main-tabs / library / reader / settings / source-management` 做组件级拆分；这只改善 demo 维护性，不代表平台实现。
3. 把 demo 中已验证的返回、键盘、底表和弹窗规则迁移到真实平台导航和状态层；平台必须提供 native evidence。
4. 按 `MOTION_SELECTOR_MATRIX.md` 录制仍然有效的 motion 证据；阅读控制相关证据等待新的产品结构规格后再整理。

当前可运行门禁：

```bash
node tools/codegen/generate.mjs
npm test --prefix contracts/tests
node tools/codegen/check-drift.mjs
node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-optimized/verify/verify-p0-chain-matrix.mjs
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
```
