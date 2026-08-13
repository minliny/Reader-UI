# 阅读设置组件规格

## Render API

```ts
window.ReadingSettingsInput.renderReadingSettings(
  target: HTMLElement,
  data: ReadingSettingsFixture,
  options?: { state?: ReadingSettingsState }
): void

window.ReadingSettingsInput.renderReadingSettingsStateMatrix(
  target: HTMLElement,
  data: ReadingSettingsFixture
): void
```

## Props

```ts
interface SettingGroupCardInput {
  title: string;
  meta: string;
  icon: string;
  target: string;
}

interface PresetRowInput {
  title: string;
  value?: string;
  meta?: string;
  active?: boolean;
}
```

## States

- `default`：阅读设置首页。
- `subpage`：分组二级页。
- `loading`：读取设置。
- `error`：保存失败可重试。

## Events

- `back`
- `openPreset`
- `openGroup`
- `toggleSetting`
- `segmentChange`
- `stepperChange`
- `presetApply`
- `restoreDefault`
- `retry`

## Acceptance

- 不使用主底部导航。
- 不继承控制层 pill 顶栏。
- 高级开关和恢复默认入口可见。
- 二级页保留分组上下文。
- 保存失败时保留用户当前选择。
