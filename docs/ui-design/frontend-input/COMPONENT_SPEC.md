# 前端设计稿输入规格

目标：把 UI 设计图还原结果交付为前端可消费的设计稿输入件，而不只是一张静态截图。

## 当前输入包

- `02-主标签页/*/frontend-input/`：书架、发现、RSS、设置四个主标签页。
- `03-书架链路/*/frontend-input/`：书架空态、搜索、详情、目录、排序筛选、操作底表、分组管理、本地书导入。
- `04-阅读链路/*/frontend-input/`：阅读控制层、目录书签、外观、朗读、设置、自动翻页、内容搜索、内容替换、入口、沉浸阅读、换源。
- `05-设置链路/*/frontend-input/`：通用设置、书架搜索设置、隐私权限、缓存、关于反馈、同步备份、书源管理。
- `frontend-input/tokens.css`：跨页面共享设计 token。
- `frontend-input/contracts.d.ts`：TypeScript 数据、状态和事件契约。
- `frontend-input/manifest.json`：可验证页面、视口、截图和验收指标清单。
- `frontend-input/validate-frontend-inputs.js`：本地渲染复验脚本。
- `frontend-input/component-library/`：公共组件库输入包和转换优先级。
- `frontend-input/asset-library/`：UI 设计图、书籍封面和图标 token 的统一素材库输入包。
- `03-书架链路/shared-library-kit/`：书架链路 `LibraryShell` 共享 kit。
- `frontend-input/FRAMEWORK_COMPONENT_CATALOG.md`：当前所有页面框架、共享 kit、组件化内容和后续抽象边界的总目录。
- `frontend-input/FRAMEWORK_COMPONENT_ROADMAP.md`：框架、组件、已完成内容和后续规划的双语命名总览。
- `frontend-input/FRONTEND_MAPPING_GUIDE.md`：本地输入件到 Android Compose 前端实现的映射指南。
- `frontend-input/HTML_FILE_REQUIREMENTS.md`：本地 HTML 文件角色、准入要求和相关文档写法。
- `frontend-input/PAGE_FRAMEWORK_ARCHITECTURE.md`：后续统一页面框架、shell 分类、迁移顺序和完成标准。
- `frontend-input/PAGE_FRAMEWORK_AUDIT.md`：当前 30 页逐页 shell 使用状态和迁移批次。

## 交付标准

- 静态视觉预览：`preview.html` 可直接用浏览器打开。
- 本地 HTML 文件：必须遵守 `HTML_FILE_REQUIREMENTS.md`，区分预览页、状态矩阵页、组件拆分页和历史临时预览。
- 数据输入契约：`fixture.json` 描述组件字段，`fixture.js` 提供 file 协议可运行镜像。
- 前端渲染入口：`render.js` 暴露页面级渲染函数和状态矩阵渲染函数。
- 状态矩阵：`state-matrix.html` 覆盖默认态、空态、加载态或模块展开态。
- 样式隔离：页面专属 class 只允许表达页面内容；状态栏、顶栏、导航、弹层宿主和状态容器必须由对应 shell kit 输出。
- 公共组件：新页面优先使用 `component-library` 的 `rl-` 语义，再补页面专属结构。
- 公共素材：新页面优先使用 `asset-library` 的 UI、封面和图标 token；缺图标时先补素材库，再补页面。
- 框架与组件目录：新增页面或重构页面前，必须先查 `FRAMEWORK_COMPONENT_CATALOG.md`，确认对应 Shell、slot 和可复用组件。
- 视觉验收：渲染页应保持目标手机画布尺寸、核心文本存在、图片资源无缺失、请求失败为 0。

## 页面框架归一要求

当前输入件已经统一交付格式和页面框架运行层。后续真实前端接入前，必须按 `PAGE_FRAMEWORK_ARCHITECTURE.md`、`PAGE_FRAMEWORK_AUDIT.md` 和 `FRONTEND_MAPPING_GUIDE.md` 继续约束：

- 主标签页使用 `MainTabShell`。
- 书架链路使用 `LibraryShell`。
- 阅读链路使用 `ReaderShell`，横向流程使用 `FlowShell`。
- 设置链路使用 `SettingsShell`；7 个设置二级页已通过 `SettingsPageKit` 输出并通过 DOM slot 校验。
- 新增或重构页面必须声明 `shellName`、`pageRole`、`slots` 和 `stateModel`。
- 8 个书架链路页面已迁入 `LibraryPageKit`，必须持续通过真实 DOM slot 校验。
- 10 个阅读链路页面已迁入 `ReaderShellKit`，`换源` 已迁入 `ReaderShellKit.renderFlowShell(...)`，必须持续通过真实 DOM slot 校验。

## 工程接入建议

Android 前端实现时按 `FRONTEND_MAPPING_GUIDE.md` 把 `contracts.d.ts` 和 `fixture.json` 转成 Kotlin UI state、Composable 参数和事件回调。页面只负责把 fixture 映射到 slots，top bar、content region、state host、overlay host、navigation host 由统一 shell 输出。`components.html` 保留为拆分参考，`preview.html` 和 `state-matrix.html` 用于验收走查。

## 复验命令

仓库不内置前端依赖。若当前 Node 环境已安装 Playwright，可执行：

```sh
node docs/ui-design/frontend-input/validate-frontend-inputs.js
```

在 Codex 桌面内置 runtime 下，可使用：

```sh
NODE_PATH=/Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules /Users/minliny/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node docs/ui-design/frontend-input/validate-frontend-inputs.js
```
