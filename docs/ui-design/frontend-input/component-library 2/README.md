# Reader 公共组件库输入包

来源：已完成并验证的 `书架封面模式`、`阅读控制层`、`设置首页`、`书架空状态` 前端输入件。

文件：
- `library.css`：公共组件样式，统一使用 `rl-` 前缀。
- `fixture.json`：组件库数据输入。
- `fixture.js`：浏览器直开时使用的 fixture 镜像。
- `render.js`：组件库预览渲染入口，暴露 `ReaderComponentLibrary.renderComponentLibrary`。
- `preview.html`：公共组件库预览页。
- `COMPONENT_LIBRARY.md`：组件规格、复用边界和缺口。
- `CONVERSION_PRIORITY.md`：后续 UI 设计图转前端设计稿的页面顺序。

使用规则：
- 新页面转换时，先查 `COMPONENT_LIBRARY.md`。
- 命中已有组件时必须复用 `rl-` 公共组件语义。
- 只有当页面出现公共库没有覆盖的结构时，才允许扩展公共库。
- 页面专属布局可以保留页面前缀，但基础控件、卡片、底表、状态块应回流到公共库。
