# 前端 Demo 设计稿（Frontend Demo Draft）

## 页面定位（Page Role）

这是重制后的前端设计稿入口，用于把本地 30 张 UI 设计图重新组织成可前端实现的统一结构。它不是 Figma Make 生成物，也不覆盖旧 `frontend-input/` 页面。

入口文件（Entry）：`docs/ui-design/frontend-input/frontend-demo-draft/index.html`

Manifest 目标（Manifest Target）：`frontend-demo-draft`

共享框架来源（Shared Shell Source）：`docs/ui-design/frontend-input/shared-shell-kit/kit.js`

## 覆盖范围（Coverage）

- 主标签页框架（MainTabShell）：书架、发现、RSS、设置的统一底部导航和内容区结构。
- 书架链路框架（LibraryShell）：书籍详情、目录、底部操作、底表、弹窗宿主。
- 阅读器框架（ReaderShell）：阅读正文底层、控制层、快捷操作、四模块导航、亮度栏。
- 设置页框架（SettingsShell）：设置返回顶栏、设置分组、设置行、Toast/Dialog/State 宿主。
- 横向流程框架（FlowShell）：换源横向步骤、候选对照、结果确认。

## 图标来源（Icon Source）

所有设计稿图标通过 `../asset-library/icons.js` 的 `ReaderAssetIcons.renderIcon(id, className)` 渲染。新稿内不新增一次性 SVG。

## 前端拆分规则（Frontend Split Rules）

- 先实现五个页面框架（Page Shells），再迁移旧 30 页到对应 slot。
- 页面外壳必须通过 `ReaderShellKit.render*Shell(...)` 输出，不在页面 renderer 里重写顶栏、底栏和宿主节点。
- 书封图片是内容资源；UI 控件、导航、弹层和状态必须用组件实现。
- 阅读控制层四个模块按钮选中态只改变背景、图标颜色和文字颜色，不改变尺寸、间距或相对位置。
- 旧 `preview 2.html` 之类临时文件不作为前端输入件。

## 后续动作（Next Actions）

1. 把现有 30 个页面 renderer 逐步收敛为五个 shell 的薄适配器。
2. 继续消除旧页面内置图标，统一调用公共图标素材库。
3. 为 30 个页面分别补齐 preview/state-matrix 的 shell 级截图校验。
