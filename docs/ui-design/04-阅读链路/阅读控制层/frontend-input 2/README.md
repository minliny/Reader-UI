# 阅读控制层前端输入件

来源页面：`../reader-control-layer.html`

文件：
- `../../../frontend-input/tokens.css`：跨页面共享设计 token。
- `../../../frontend-input/contracts.d.ts`：共享 TypeScript 输入契约。
- `../../../frontend-input/shared-shell-kit/kit.js`：统一 `ReaderShell` 页面外壳。
- `../../../frontend-input/asset-library/icons.js`：统一语义图标来源。
- `components.css`：组件样式，统一使用 `rc-` 前缀。
- `components.html`：可摘取的组件片段。
- `fixture.json`：页面数据结构和示例数据，供工程管线读取。
- `fixture.js`：浏览器直开时使用的 fixture 镜像。
- `render.js`：页面级渲染入口，暴露 `ReaderControlInput.renderReaderControl` 和 `ReaderControlInput.renderReaderControlStateMatrix`。
- `preview.html`：fixture 驱动的组件组合预览，可直接打开。
- `state-matrix.html`：默认、目录、朗读、外观、设置模块展开状态矩阵。
- `COMPONENT_SPEC.md`：props、states、events 和验收标准。

组件拆分：
- `ReaderShell`
- `ReadingSurface`
- `ReaderOverlayHost`
- `BottomSheetHost`
- `ReaderModuleNav`
- `ReaderStateHost`
- `ReaderStatusRow`
- `ReaderTopControlBar`
- `ReadingTextLayer`
- `ReaderControlSheet`
- `QuickActionPanel`
- `ChapterProgressPanel`
- `BrightnessPanel`
- `ModuleNav`
- `BottomReadout`

前端接入：
- 使用 `fixture.json` 生成业务类型。
- 对照 `../../../frontend-input/contracts.d.ts` 实现 `ReaderControlFixture`、`ReaderControlState` 和 `ReaderControlEvent`。
- 使用 `ReaderShellKit.renderReaderShell(...)` 输出页面框架，页面 renderer 只注入阅读正文、顶部控制、底表内容和模块导航按钮。
- 使用 `state-matrix.html` 验收底部模块展开态，避免只还原默认控制层。
