# Reader UI Figma Handoff Status

状态：Phase 3 组件库与 Phase 4 Reader ControlHome 三视口基线已重建；Figma 不是 runnable demo 或原生 Host 的权威源

更新时间：2026-07-12

Figma 文件：<https://www.figma.com/design/klhs2jMM4MncaJFqZMfqEK?node-id=53-3>

## 当前可编辑范围

- Foundations：126 variables；Color 支持 Light / Dark；全部 variable 具备 Web、Android、iOS code syntax；11 个 text style 均使用显式 line-height。
- IconButton：9 variants，使用真正的 instance-swap icon property，不再使用字符 glyph 代替图标。
- ModuleNav：15 variants（3 viewport × 5 active），固定目录、朗读、界面、设置四个 canonical module。
- ControlPanel：6 variants（3 viewport × 2 session），固定搜索、自动翻页、替换、章节进度结构。
- BrightnessRail：12 variants（3 viewport × 2 value × 2 auto），使用共享 Sun SVG icon。
- ReaderTopOverlay：3 viewport variants。
- ReaderShell：12 variants（3 viewport × 2 layer × 2 session），每个 variant 固定 readingSurface、readerOverlayHost、bottomSheetHost、readerAccessoryHost、readerModuleNav、readerStateHost 六个 slot。
- Phase 4 board：Phone 390 × 844、Landscape 844 × 390、Tablet 760 × 960 三个 ReaderShell instance，均来自同一个 component set。

旧组件已改名为 `__Legacy/*`，不得继续作为新页面基线。

## 权威与回写边界

1. `frontend-demo-optimized/` 是当前 route、structure、state、token、motion 与响应式行为的 runnable 权威源。
2. Figma 用于重绘高判断成本的视觉构图、组件 anatomy 和代表视口，不承载 235 个 route 的运行时状态机。
3. Figma 中确认的修改必须先形成可审计差异，再由 Codex 手工映射为 token、component、shell slot、fixture 或 renderer 变更，并执行仓库门禁。
4. 当前仓库没有经过验证的 Figma → local code 自动同步管线。Figma Code Connect 也未建立可用映射；当前账户能力不满足把它作为 release gate 的条件。
5. 修改 Figma 文件不会修改本地 Git；修改本地 demo 也不会自动覆盖 Figma。两端同步是显式、单向、可审查的 handoff，不是双向镜像。

## 推荐工作流

```text
Codex 修 shell/state/responsive/token 结构
  -> 浏览器验证 runnable demo
  -> 仅把代表性页面族或组件送入 Figma 重绘
  -> 人工确认 Figma 差异
  -> Codex 映射回代码和 fixture
  -> contract/demo/host gates
```

需要新原生 primitive 或平台能力时，必须分别进入 iOS、Android、HarmonyOS renderer/Host Adapter；仅更新 Figma 不构成 Host 完成证据。
