# 朗读组件规格

## Render API

```ts
window.ReadingAloudInput.renderReadingAloud(
  target: HTMLElement,
  data: ReadingAloudFixture,
  options?: { state?: ReadingAloudState }
): void

window.ReadingAloudInput.renderReadingAloudStateMatrix(
  target: HTMLElement,
  data: ReadingAloudFixture
): void
```

## Props

```ts
interface VoiceOptionInput {
  label: string;
  meta: string;
  active: boolean;
}

interface AloudControlItemInput {
  label: string;
  value: string;
}

interface RunningCapsuleInput {
  title: string;
  pausedTitle: string;
  sentence: string;
  actionLabel: "暂停";
  continueLabel: "继续";
  settingsLabel: "设置";
}
```

## States

- `default`：未朗读。
- `running`：朗读运行中。
- `paused`：朗读已暂停。
- `error`：TTS 不可用。

## Events

- `back`
- `sourceChange`
- `startReadAloud`
- `pauseReadAloud`
- `continueReadAloud`
- `previousSentence`
- `nextSentence`
- `speedChange`
- `voiceChange`
- `timerChange`
- `rangeChange`
- `openReadAloudSettings`
- `moduleChange`
- `brightnessChange`
- `retry`

## Acceptance

- 运行胶囊只能表达朗读状态，不作为会员声音或在线入口。
- 暂停态必须保留当前句。
- 失败态必须说明系统 TTS 不可用并提供重试。
- 调整语速和声音后即时预览，不改变章节正文内容。
