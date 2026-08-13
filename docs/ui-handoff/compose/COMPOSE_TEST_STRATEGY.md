# Compose Test Strategy

## 1. Unit Tests

- Keep existing fake/real mode boundary tests for Search, Detail, TOC, Reader ViewModels.
- Add token mapping tests for `ReaderColors` constants.
- Add state reducer tests for `ReaderControlState` transitions.

## 2. Compose UI Tests

- Render each route with fake state.
- Verify visible labels, actions, and overlay visibility.
- Use `onNodeWithContentDescription` for all icon-only controls.

## 3. Semantics Tests

- 快捷按钮无可见文字标签 but contentDescription exists.
- 本章上一页 / 下一页 do not expose 上一章 / 下一章 semantics.
- Slider semantics for page progress and brightness.
- Switch semantics for settings rows.

## 4. Golden / Screenshot Strategy

- Start with smoke screenshots for Reader base + 8 reader states.
- Keep goldens separate from normalized HTML; Compose is the implementation truth after handoff.
- Update goldens only after handoff audit approval.

## 5. Navigation Smoke Tests

- bookshelf -> search -> detail -> reader.
- settings -> webdav -> sync status.
- discover -> rss list -> rss detail.
- source management -> source detail/edit.

## 6. Boundary Tests

- No Stitch old class strings in Compose files.
- No old color literals in Compose files.
- Normalized HTML not loaded in production WebView.

## 7. Reader Control Layer Behavior Tests

- 阅读页快捷按钮无文字标签。
- 夜间模式无弹窗。
- 内容替换只显示当前书籍规则。
- 设置弹窗不混入 WebDAV / 书源 / RSS。
- 目录页右侧进度条、书签标识、当前阅读标识。
- 朗读内部不使用上一章 / 下一章语义。
- 浮动页内控制使用上一页 / 下一页。
- 亮度条左右停靠箭头方向正确。
- 阅读页控制层底栏固定。
- overlay 显隐规则正确。
