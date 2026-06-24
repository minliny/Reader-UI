# 阅读外观 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`阅读外观` 从阅读控制层底部 `界面` 按钮打开，用于在阅读页上下文内调整字体、主题、字号、行距和翻页动画。

## 复用组件

- `BottomSheet`
- `ReaderModuleNav`
- `BrightnessSlider`
- `Loading / Error` 状态容器

## 新增组件

- `ThemeSwatch`：阅读背景主题选择。
- `FontOption`：字体选择行和当前字体标识。
- `Stepper`：字号增减。
- `Slider`：亮度沿用竖向滑杆语义。
- `PreviewCard`：字体和翻页动画预览。
- `SegmentControl`：行距和翻页动画分段选择。

## 文件

- `fixture.json` / `fixture.js`：阅读外观 props。
- `render.js`：`window.ReadingAppearanceInput` 渲染器。
- `components.css`：页面级样式，使用 `ra-` 前缀。
- `preview.html`：841 x 1870 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 保留阅读页上下文，不转为独立设置页。
- 不混入阅读设置项、账号、社区或推荐入口。
- 字体、主题、版式调整必须即时预览。
- 主题编辑失败时保留当前选择。
- 控制层四按钮 active 只改变背景、图标和文字颜色，不改变相对位置。
- 页面加入 `docs/ui-design/frontend-input/manifest.json` 后必须通过总校验脚本。
