# 自适应约束审计（Adaptive Constraint Audit）

本文审计当前 `frontend-demo-draft`、`shared-shell-kit` 和页面规划文档中的 UI/组件/框架结构约束。结论以当前本地 demo、CSS、验证脚本和截图证据为准，不以单张 UI 截图为准。

## 结论（Conclusion）

当前自适应约束问题已经闭合到可验证状态：demo 有 runtime viewport class、运行态尺寸变量、12 目标 adaptive 验收矩阵、5 目标 text-stress 验收矩阵、短高 ReaderShell 避让、键盘 reduced-height、MainTab tablet 侧向导航、ReaderShell 横屏/平板右侧控制区、FlowShell 横屏/平板三段式流程，以及 LibraryShell / SettingsShell 宽屏 frame 验收。

仍需避免过度宣称：这次闭合的是 `frontend-demo-draft` 的 Shell 级自适应结构、压力视口和代表性文本压力，不等同于真实设备端像素级回归、所有 30 页每个组件的最终视觉 diff，或 Android Compose 运行时已经完成同等实现。

## 复核结果（Review Result）

| 复核项（Review Item） | 判断（Verdict） | 当前证据（Evidence） |
|---|---|---|
| 问题描述准确性 | 修复前准确；当前核心问题已关闭。 | 旧状态确实是 390px 手机画布居中；当前 regular 运行态已按 viewport class 改变 frame 和 Shell 结构。 |
| 解决方案合理性 | 合理，且已执行到代码和验证层。 | 先建立 runtime class / 尺寸变量，再补 Shell 策略、宽屏视觉和脚本矩阵，避免只写文档或只靠截图判断。 |
| 当前可宣称能力 | 可以宣称 demo 具备 Shell 级自适应约束和代表性压力验收。 | 全量 `validate-frontend-inputs.js` 通过；`frontend-demo-draft.failures: []`；adaptive 12 项、text-stress 5 项。 |
| 当前不可宣称能力 | 不能宣称真实 Android Compose、真实设备和所有页面像素级视觉 diff 已完成。 | 当前证据来自本地 HTML demo、Playwright DOM 几何和截图；未运行 Android 设备端。 |

## 完整解决方案（Complete Closure）

| 层级（Layer） | 已落地方案（Implemented Solution） | 证据（Evidence） |
|---|---|---|
| Runtime 分类层 | demo 根节点写入 `data-width-class`、`data-height-class`、`data-orientation`、`data-viewport-class`、视口宽高和 CSS runtime 变量。 | `frontend-demo-draft/render.js`；adaptive 矩阵断言 viewport class。 |
| 画布分层 | 保留 `390x844` 为标准捕获基线；regular 运行态使用 `--fd-runtime-phone-width`、`--fd-runtime-phone-height`、`--fd-runtime-flow-width`。 | `frontend-demo-draft/styles.css`；320、390、430、600、840、844x390 视口均无横向溢出。 |
| Shell 宽屏策略 | `MainTabShell` 在 tablet 展示左侧 rail；`LibraryShell` / `SettingsShell` 使用 760px 宽屏 frame；`ReaderShell` 横屏/平板改为正文 + 右侧控制区；`FlowShell` 横屏/平板展示阅读连续区 + 候选窗 + 确认区三段。 | 12 项 adaptive 截图与 DOM 几何断言。 |
| 短高/键盘压力 | ReaderShell compact landscape 使用横向控制区；Book Search compact landscape 使用 150px reduced-height keyboard，输入目标和提交动作在键盘上方。 | `reader-compact-landscape`、`keyboard-reduced-height` 断言和截图。 |
| 文本压力 | MainTab、Library、Reader、Flow、Settings 五类代表性 Shell 注入长中文、长英文和大字体。 | `textStressMatrix` 五项 `outsideCount: 0`、`bodyWidth: 390`。 |

## 验收矩阵（Validation Matrix）

| 目标（Target） | Route | Viewport | 验收重点（Acceptance Focus） |
|---|---|---|---|
| `compact-portrait` | `bookshelf` | 320x568 | 窄屏手机不横向溢出，frame 填满可视宽高。 |
| `standard-portrait` | `bookshelf` | 390x844 | 标准手机基线保持。 |
| `large-phone-portrait` | `reader` | 430x932 | 大竖屏仍保持阅读器基线和避让。 |
| `compact-landscape` | `source-switch` | 844x390 | FlowShell 横屏三段式：阅读连续区、候选窗、确认区可见且不重叠。 |
| `reader-compact-landscape` | `reader` | 844x390 | ReaderShell 横屏正文左侧、控制区右侧，sheet/nav/rail 在 frame 内且互不压住 P0。 |
| `keyboard-reduced-height` | `book-search` | 844x390 | 键盘 reduced-height、输入焦点、固定动作和键盘避让。 |
| `expanded-width` | `settings` | 600x960 | expanded 宽屏 frame 不再保持 390px 居中。 |
| `tablet-expanded` | `reader` | 840x1180 | ReaderShell tablet 760x960 frame，右侧控制区与正文分离。 |
| `main-tab-tablet-expanded` | `bookshelf` | 840x1180 | MainTab tablet 左侧 rail 与内容区避让。 |
| `library-tablet-expanded` | `book-detail` | 840x1180 | LibraryShell tablet 宽屏详情页和底部动作。 |
| `settings-shell-tablet-expanded` | `settings-general` | 840x1180 | SettingsShell tablet 宽屏设置列表。 |
| `flow-tablet-expanded` | `source-switch` | 840x1180 | FlowShell tablet 三段式流程和结果确认区。 |

## 实现证据（Implementation Evidence）

| 项目（Item） | 状态（Status） | 文件（Files） |
|---|---|---|
| viewport-class runtime | 已完成。 | `frontend-demo-draft/render.js` |
| regular 运行态尺寸变量 | 已完成。 | `frontend-demo-draft/styles.css` |
| MainTab tablet rail | 已完成并脚本验证。 | `frontend-demo-draft/styles.css`、`validate-frontend-inputs.js` |
| ReaderShell 横屏/平板右侧控制区 | 已完成并脚本验证。 | `frontend-demo-draft/styles.css`、adaptive 截图 |
| FlowShell 横屏/平板三段式 | 已完成并脚本验证。 | `frontend-demo-draft/render.js`、`frontend-demo-draft/styles.css`、adaptive 截图 |
| Library / Settings 宽屏 frame | 已完成并脚本验证。 | `frontend-demo-draft/styles.css`、adaptive 截图 |
| 键盘 reduced-height | 已完成并脚本验证。 | `keyboard-reduced-height` 中键盘高度 150px，输入和固定动作在键盘上方。 |
| 代表性文本压力验收 | 已完成并脚本验证。 | `textStressMatrix` 5 项全部 `outsideCount: 0`。 |
| 全量验证 | 已通过。 | `frontend-input-design-draft-validation.json` 顶层 `passed: true`，`frontend-demo-draft.failures: []`。 |

## 当前可以成立的声明（Supported Statements）

- 当前 demo 已有统一 Shell、slot、覆盖层、safe-area、z-index 和竖屏手机基线。
- 当前 demo 已有 viewport class runtime、regular 运行态尺寸变量和 12 目标 adaptive DOM/截图验收矩阵。
- 当前 MainTabShell 在 tablet 展示左侧 rail，内容区避让 rail。
- 当前 ReaderShell 在 compact landscape 和 tablet 下使用正文 + 右侧控制区结构，快捷控制窗、亮度条和模块导航有脚本避让证据。
- 当前 FlowShell 在 compact landscape 和 tablet 下展示阅读连续区、候选窗、确认区三段式流程。
- 当前 LibraryShell / SettingsShell 在 tablet 下使用 760px 宽屏 frame。
- 当前 text-stress 验收覆盖 5 个代表性 Shell 目标，长中文、长英文和大字体压力均无横向溢出。
- 当前全量 `validate-frontend-inputs.js` 通过，`frontend-demo-draft` smoke 失败数组为空。

## 仍不可过度宣称（Unsupported Overclaims）

- 不能宣称 Android Compose 真实运行时已经实现同等自适应布局。
- 不能宣称所有 30 页的每个组件都完成像素级 visual diff。
- 不能宣称真实折叠屏、真实键盘 IME、真实安全区和系统字体缩放已经在设备端验证。

## 关闭清单（Closure Checklist）

1. 已完成：建立 viewport-class runtime。
2. 已完成：把 390px 固定画布分层为标准捕获基线和 regular runtime 尺寸变量。
3. 已完成：给 validation 增加 12 目标 adaptive 检查和截图证据。
4. 已完成：短高横屏 ReaderShell 改为右侧控制区并验证 P0 避让。
5. 已完成：短高键盘进入 reduced-height，固定提交动作和输入目标保持在键盘上方。
6. 已完成：ReaderShell tablet 改为正文 + 右侧控制区。
7. 已完成：MainTabShell tablet 改为左侧 rail。
8. 已完成：FlowShell compact landscape / tablet 改为三段式流程。
9. 已完成：LibraryShell / SettingsShell tablet 宽屏 frame 验收。
10. 已完成：五目标 text-stress 自动化。
11. 已完成：全量验证通过并刷新 `frontend-input-design-draft-validation.json`。
