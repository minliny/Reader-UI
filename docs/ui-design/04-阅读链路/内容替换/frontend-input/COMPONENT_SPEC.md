# 内容替换组件规格

## Global

- 全局对象：`window.ContentReplacementInput`
- 命名空间：`cr-`
- 默认画布：`853 x 1843`
- Shell：`ReaderShellKit.renderReaderShell(...)`
- Slots：`readerFrame`、`readingSurface`、`readerOverlayHost`、`readerModuleNav`、`bottomSheetHost`、`readerStateHost`

## Fixture

```ts
interface ContentReplacementFixture {
  status: ReaderStatusInput;
  topControl: {
    title: "内容替换";
    bookTitle: string;
    settingsLabel: "设置";
  };
  readingText: string[];
  panel: {
    title: "当前书规则";
    allRulesLabel: "全部规则";
    enableTitle: "启用内容替换";
    enableCopy: string;
    tempCloseLabel: "临时关闭";
    addRuleLabel: "新增规则";
  };
  enabled: boolean;
  rules: ReplacementRuleInput[];
  preview: ReplacementPreviewInput;
  form: ReplacementFormInput;
  feedback: {
    loading: BookActionFeedbackInput;
    empty: Required<BookActionFeedbackInput>;
    error: Required<BookActionFeedbackInput>;
  };
}
```

## Public Components

### ReplacementRuleRow

- Props：`title`、`meta`、`icon`、`enabled`
- Acceptance：规则行必须同时显示命中说明、启用开关和进入编辑的语义。

### TextField

- Props：`label`、`value`、`error?`
- Acceptance：用于替换前/替换后输入，保存失败时保留输入。

### PatternInput

- Props：`beforeValue`
- Acceptance：必须明确这是正文替换匹配，不是书源规则。

### SaveButton

- Props：`label`
- Acceptance：必须显示 `保存`，提交中禁止重复点击。

## States

- `default`：规则列表。
- `edit`：规则编辑表单。
- `empty`：无规则时提供新增。
- `loading`：应用替换中。
- `error`：规则格式错误行内提示。

## Events

- `close`
- `openSettings`
- `toggleReplacement`
- `toggleRule`
- `openRule`
- `addRule`
- `patternChange`
- `replacementChange`
- `testReplacement`
- `saveRule`
- `temporaryClose`
- `retry`

## Acceptance

- 必须渲染核心文案：`内容替换`、`新增规则`、`替换前`、`替换后`、`测试`、`保存`、`启用`、`预览`。
- default 预览必须保持 `853 x 1843` 画布。
- 状态矩阵必须包含 5 张状态卡。
- 预览和状态矩阵必须由 `ReaderShellKit` 输出统一 `ReaderShell`，不能再复制独立阅读器 frame。
- 本页 `readerModuleNav` 为空宿主，不能嵌入 `bottomSheetHost` 或额外生成第二个模块导航 slot。
- 预览只展示替换效果，不改原文。
