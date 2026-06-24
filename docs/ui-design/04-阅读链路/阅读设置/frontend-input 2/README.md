# 阅读设置 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`阅读设置` 从阅读控制层底部 `设置` 按钮进入，用于配置阅读显示、行为、辅助、进度信息和预设。

## 复用组件

- `SettingRow`
- `Switch`
- `Stepper`
- `SegmentControl`
- `Loading / Error` 状态容器

## 新增组件

- `SettingGroupCard`：设置分组卡片。
- `PresetRow`：顶部快捷预设和二级页预设行。

## 文件

- `fixture.json` / `fixture.js`：阅读设置 props。
- `render.js`：`window.ReadingSettingsInput` 渲染器。
- `components.css`：页面级样式，使用 `rset-` 前缀。
- `preview.html`：834 x 1886 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 不显示主底部导航。
- 不继承阅读控制层 pill 顶栏。
- 不加入账号同步、会员、社区或商业入口。
- 必须覆盖 `屏幕与显示`、`翻页与手势`、`阅读辅助`、`进度与信息`、`预设管理`。
- 恢复默认必须说明影响范围，不删除书籍或阅读进度。
