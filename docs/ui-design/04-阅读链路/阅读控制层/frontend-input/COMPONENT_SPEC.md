# 阅读控制层组件规格

## Props

- `status.left` / `status.time`：阅读状态栏文本。
- `topControl`：书名、来源和换源按钮文案。
- `readingText[]`：正文段落。
- `quickActions[]`：搜索、自动翻页、替换等快捷操作。
- `chapterProgress`：章节标题、上一章、下一章、进度。
- `moduleNav[]`：目录、朗读、界面、设置模块。
- `brightness`：亮度标题、数值、自动/系统标签。
- `bottomReadout`：底部阅读进度和章节读数。

## States

- `default`：控制层默认展开。
- `directory`：目录与书签模块展开。
- `tts`：朗读模块展开。
- `appearance`：阅读外观模块展开。
- `settings`：阅读设置模块展开。

## Interaction

- `moduleNav[]` 四个按钮进入对应模块后只改变视觉状态：背景颜色加深，中心图标颜色反转为浅色，下方文字变为强调色。
- `moduleNav[]` active / inactive 状态的按钮尺寸、图标尺寸、网格列、间距、字号和相对位置必须保持一致，不使用位移、缩放或重排作为点击反馈。

## Events

- `back`：返回沉浸阅读或来源页。
- `sourceChange`：换源。
- `more`：更多菜单。
- `quickAction(type)`：快捷操作点击。
- `chapterChange(previous|next)`：章节切换。
- `progressChange(value)`：章节进度拖动。
- `moduleChange(type)`：底部模块切换。
- `brightnessChange(value)`：亮度拖动。

## Acceptance

- `preview.html` 在 841 x 1870 画布内渲染完整默认态。
- `state-matrix.html` 至少展示默认、目录、朗读、外观、设置五种状态。
- 页面根节点必须由 `ReaderShellKit.renderReaderShell(...)` 输出，并带有 `data-shell="ReaderShell"`。
- DOM 必须包含 `readerFrame`、`readingSurface`、`readerOverlayHost`、`bottomSheetHost`、`readerModuleNav`、`readerStateHost` 六个 slot。
- 状态矩阵中的目录、朗读、外观、设置 active 按钮必须符合固定位置的颜色反馈规则。
- 控制层内文本不与亮度面板、底部读数重叠。
- 页面业务样式只使用 `rc-` 前缀和共享 token；shell 基础样式来自 `shared-shell-kit/kit.css`。
