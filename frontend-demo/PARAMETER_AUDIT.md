# 前端 Demo 全局参数审计（Frontend Demo Parameter Audit）

## 审计范围（Audit Scope）

- 覆盖对象：`frontend-demo` 中会影响交互、状态、选项集合、阅读渲染和素材映射的参数。
- 不纳入对象：页面文案、书籍示例数据、正文内容、CSS 布局尺寸、组件外观样式常量。
- 统一原则：参数源头放在 `fixture.js`；`render.js` 只做读取、归一化、状态更新和渲染。

## 已统一参数（Unified Parameters）

| 参数组（Parameter Group） | 统一数据源（Single Source） | 渲染使用点（Render Usage） |
|---|---|---|
| 阅读排版当前值（Reader Typography Values） | `reader.typography` | 正文渲染、页面测量、界面快捷窗、完整界面设置 |
| 阅读排版范围（Reader Typography Bounds） | `reader.typographyConfig` | 字号、行距、段距、字距的加减步进 |
| 阅读主题（Reader Theme Options） | `reader.themeDefault` / `reader.themeOptions` | 背景色、正文底色、主题快捷选项 |
| 阅读字体（Reader Font Options） | `reader.fontOptions` | 字体按钮、字体栈、正文 CSS 变量 |
| 章节进度（Chapter Progress） | `reader.chapterProgress` | 底部进度条、上下章节、目录跳转后的进度 |
| 亮度（Brightness） | `reader.brightness` | 右侧亮度条、键盘步进、全屏亮度遮罩、自动亮度按钮状态 |
| 朗读（TTS） | `reader.tts` | 播放状态、上一句/下一句、语速、音色、范围、定时 |
| 阅读设置（Reader Control Settings） | `reader.controlSettings` | 翻页方式、动画、音量键、常亮、缓存下一章等 |
| 阅读模块按钮（Reader Module Buttons） | `reader.modules` | 四个底部模块按钮的文案、类型、素材库图标 |

## 已清理重复项（Removed Duplicate Sources）

- `render.js` 中不再维护独立的 `readerThemeOptions` 数组。
- `render.js` 中不再维护独立的 `readerFontOptions` 数组。
- `render.js` 中不再硬编码默认主题 `paper` 作为状态默认值。
- `render.js` 中不再硬编码默认字体 `serif` 作为点击兜底值。
- `render.js` 中不再维护独立的 `readerModuleIconMap`。
- 亮度步进、章节进度范围、排版步进均通过配置读取，不再在事件处理中散落数值。

## 保留在渲染层的内容（Renderer-Owned Logic）

- 路由映射：`readerModuleRoutes`、`readerStateByRoute` 属于页面导航逻辑，不作为视觉/交互参数迁入 fixture。
- 归一化兜底：当 fixture 缺字段时，`render.js` 仍保留极小范围的容错默认值，避免 demo 空白或脚本中断。
- 布局样式：CSS 中的间距、圆角、字号层级属于当前视觉实现常量，本轮没有纳入参数化。

## 当前验证（Current Validation）

执行重复项扫描：

```bash
rg -n "readerModuleIconMap|const readerThemeOptions|const readerFontOptions|\\|\\| \"paper\"|\\|\\| \"serif\"|current - 5|current \\+ 5|fontSize.*\\+ 1|fontSize.*- 1|aria-valuemin=\"0\" aria-valuemax=\"100\"" frontend-demo/render-runtime.js frontend-demo/fixture.js
```

结果：无命中。

下一轮如果继续扩大“全局参数”范围，应单独处理 CSS 视觉 Tokens，不应和当前交互参数混在一起。
