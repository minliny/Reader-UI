# 可互动初版 Demo（Interactive Demo）

本目录是 `figma` 分支上的人工审视入口，用于把当前已经完成的 `frontend-input` 页面输入件串成一个可点击的初版流程。

## 范围

- 主标签页：书架、发现、RSS、设置。
- 书架链路：书架卡片进入书籍详情。
- 阅读链路：详情进入阅读控制层，阅读控制层四个底部模块可切换选中态和面板内容。
- 设置链路：设置首页进入 App 通用设置。

## 边界

- 复用现有 renderer、fixture、shared shell kit 和图标素材库，不重新画 UI。
- 不进入正式 `manifest.json` 64 个验证目标；正式验收仍以 `preview.html`、`state-matrix.html` 和 `validate-frontend-inputs.js` 为准。
- 只模拟本地点击、状态切换和页面跳转，不接真实业务数据、ViewModel 或持久化。

## 入口

打开：

```text
docs/ui-design/frontend-input/interactive-demo/index.html
```
