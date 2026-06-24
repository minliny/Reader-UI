# 朗读 frontend-input

来源：

- 设计图：`../UI设计图.png`
- 文字稿：`../文字稿.md`

## 页面定位

`朗读` 从阅读控制层底部 `朗读` 按钮打开，用于在阅读页上下文内开始朗读、暂停/继续、调整语速和声音，并设置定时关闭。

## 复用组件

- `BottomSheet`
- `ReaderModuleNav`
- `BrightnessSlider`
- `Loading / Error` 状态容器

## 新增组件

- `ReadAloudButton`：开始、暂停、继续朗读主按钮。
- `PlayPauseControl`：上一句 / 主播放 / 下一句控制组。
- `SpeedControl`：语速分段控制。
- `VoiceOption`：系统声音选择。
- `RunningCapsule`：朗读运行或暂停状态胶囊。

## 文件

- `fixture.json` / `fixture.js`：朗读 props。
- `render.js`：`window.ReadingAloudInput` 渲染器。
- `components.css`：页面级样式，使用 `al-` 前缀。
- `preview.html`：841 x 1870 设计稿预览。
- `state-matrix.html`：状态矩阵。

## 验收

- 保留阅读页上下文，不遮挡正文关键阅读区域。
- 不加入会员声音、在线主播、账号或推荐入口。
- `开始 / 暂停 / 继续 / 语速 / 声音 / 定时关闭` 必须可见。
- TTS 不可用时保留当前句和阅读位置，提供重试。
- 控制层四按钮 active 只改变背景、图标和文字颜色，不改变相对位置。
