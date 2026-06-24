# 共享 Shell Kit（Shared Shell Kit）

## 定位（Purpose）

`shared-shell-kit` 是前端输入件的统一页面框架层。它只输出稳定外壳、`data-shell` 和 `data-slot`，不承载具体业务内容。

## 输出框架（Provided Shells）

- 主标签页框架（MainTabShell）：`renderMainTabShell`
- 书架链路框架（LibraryShell）：`renderLibraryShell`
- 阅读器框架（ReaderShell）：`renderReaderShell`
- 设置页框架（SettingsShell）：`renderSettingsShell`
- 横向流程框架（FlowShell）：`renderFlowShell`

## 使用规则（Usage Rules）

- 页面 renderer 只负责生成 slot 内容，再调用对应 shell。
- 图标必须通过 `ReaderShellKit.icon(...)` 或 `ReaderAssetIcons.renderIcon(...)`。
- 状态切换不得移除 shell 根节点和固定 slot。
- 阅读控制层四模块按钮的选中态不得改变按钮尺寸、间距和相对位置。

## 本地预览（Local Preview）

入口（Entry）：`docs/ui-design/frontend-input/shared-shell-kit/preview.html`

Manifest 目标（Manifest Target）：`shared-shell-kit`

该预览用于检查五个 shell 是否能独立渲染，并确认 slot 名称稳定。
