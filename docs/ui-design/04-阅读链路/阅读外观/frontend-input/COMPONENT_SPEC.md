# 阅读外观组件规格

## Render API

```ts
window.ReadingAppearanceInput.renderReadingAppearance(
  target: HTMLElement,
  data: ReadingAppearanceFixture,
  options?: { state?: ReadingAppearanceState }
): void

window.ReadingAppearanceInput.renderReadingAppearanceStateMatrix(
  target: HTMLElement,
  data: ReadingAppearanceFixture
): void
```

## Props

```ts
interface ThemeSwatchInput {
  label: string;
  type: string;
  background: string;
  text: string;
  active: boolean;
}

interface FontOptionInput {
  label: string;
  meta: string;
  preview: string;
  active: boolean;
}

interface SegmentControlOptionInput {
  label: string;
  type: string;
  active: boolean;
}
```

## States

- `default`：外观主面板。
- `font`：字体选择。
- `theme`：主题选择。
- `edit`：主题编辑。
- `loading`：首次进入或配置读取中。
- `error`：字体列表加载失败。

## Events

- `back`
- `sourceChange`
- `fontSizeDecrease`
- `fontSizeIncrease`
- `lineSpacingChange`
- `themeChange`
- `fontChange`
- `animationChange`
- `editThemeOpen`
- `resetAppearance`
- `saveTheme`
- `moduleChange`
- `brightnessChange`
- `retry`

## Acceptance

- 不改变章节正文内容。
- 不混入阅读设置项。
- 字号、行距、主题、字体和翻页动画都必须可见。
- 加载和错误状态只替换外观面板内容，不清空阅读上下文。
- 保存失败时保留用户当前选择。
