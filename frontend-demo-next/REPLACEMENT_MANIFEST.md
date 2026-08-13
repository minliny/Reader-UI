# Frontend Demo Next 替换清单

> 状态：候选已建立，尚未获得 canonical 替换与 Host 同步授权。

## 1. 替换对象

- 候选源：`frontend-demo-next/`
- 授权后的 canonical 目标：`frontend-demo/`
- 只读对照：`frontend-demo-optimized/`
- Host：Android、iOS、HarmonyOS 均不在本轮自动写入范围内。

授权替换只改变 Reader-UI 的 demo 权威目录。Host 原生实现、合同消费和设备证据按 `HOST_SYNC_MATRIX.md` 独立执行。

## 2. Candidate 已实现增量

### 阅读控制层

- `ControlHome` 保留右侧亮度栏。
- 目录、朗读、界面、设置及快捷页不再渲染亮度栏，Dock 之外的内容占满可替换区域。
- 模块 A → B 使用 replace 语义，不遍历历史模块；重击当前模块回到 `ControlHome`。
- 控制层分为 `Compact / Expanded / Workspace`：Expanded 保留约 38% 正文，Workspace 顶起并隐藏旧阅读顶栏。
- ControlHome 上拉进入“阅读总控”半屏层；主题、字体、布局、翻页使用可发现的 Workspace 入口。
- TTS / 自动翻页胶囊在沉浸、Compact、Expanded 和 Workspace 均有独立锚点，不嵌入右下页码。

### 主题、背景与字体

- 默认日间/夜间主题槽位、跟随系统/日间/夜间模式。
- 自定义主题进入当前主题解算；图片背景带文字遮罩。
- 图片 data URL 只接受 PNG/JPEG/WebP base64，并对完整 inline style 做 HTML 转义。
- 字体工作区提供 TTF/OTF/TTC 导入、`FontFace` 注册和会话内选择。
- 主题默认动作不再嵌套在主题按钮内，避免无效嵌套交互。

### Viewport / Chrome

- demo 输出 `requested / effective / transaction` 状态栏状态。
- demo 输出 `occlusionRects[]` 和命名锚点，支持 `dynamic-island / notch / punch-left` 审计预设。
- 状态栏显示时不重复时间；隐藏失败时 effective 回滚为 visible。
- 页码、进度和 Session 胶囊使用彼此独立的底部槽位。

## 3. Candidate 专属门禁

以下脚本已改为从 `import.meta.url` 推导 candidate 目录，不再读写 optimized：

```bash
node frontend-demo-next/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-next/verify/motion/verify-motion-coverage.mjs
node frontend-demo-next/verify/verify-p0-chain-matrix.mjs
```

当前结果：

- JS/MJS 语法与 `git diff --check`：通过。
- P0 静态链路矩阵：`120/120`；它只证明已有链路骨架，不证明本轮视觉规划已同步到 Host。
- 共享 contract/codegen 测试：`268/268` 通过。
- 浏览器关键路径：ControlHome、Dock 替换、三态控制层、主题/字体入口、状态栏失败回退、遮挡预设和胶囊启停均已实跑。
- contract/motion route coverage：通过；当前 candidate、route schema 与 renderer 均为 `235/235`，missing / extra 均为 `0`。

## 4. Contract 对齐现状与授权前复核

当前 route schema 共包含 235 个 RouteId，下列 35 个原 candidate 增量均已收录，不再是待合入的 Contract Delta。candidate contract 与 renderer 已通过 `235/235` 覆盖验证；授权前仍需复核 route/view-state fixtures、生成物与 Host route table 的同步状态，不能只复制 demo 目录。

### 原增量对齐清单：字体、主题与排版管理状态（6）

- `reader-font-import-confirm`
- `reader-font-delete-confirm`
- `reader-font-fallback`
- `reader-theme-new`
- `reader-theme-delete-confirm`
- `reader-typography-reset-confirm`

### 原增量对齐清单：内容替换管理状态（5）

- `reader-replace-page`
- `reader-replace-delete-confirm`
- `reader-replace-apply-result`
- `reader-replace-import-export`
- `reader-replace-preview`

### 原增量对齐清单：换源状态（6）

- `source-switch-empty`
- `source-switch-error`
- `source-switch-timeout`
- `source-switch-loading`
- `source-switch-rollback`
- `source-switch-preview`

### 原增量对齐清单：阅读异常与恢复状态（10）

- `reader-toc-loading`
- `reader-toc-offline`
- `reader-toc-error`
- `reader-content-loading`
- `reader-content-offline`
- `reader-content-error`
- `reader-page-boundary-first`
- `reader-page-boundary-last`
- `reader-progress-restore`
- `reader-background-restore`

### 原增量对齐清单：本地导入状态（8）

- `import-permission-denied`
- `import-format-unsupported`
- `import-empty-file`
- `import-parsing`
- `import-duplicate`
- `import-conflict-resolve`
- `import-partial-success`
- `import-result-detail`

## 5. 授权后的受控替换顺序

1. 冻结 candidate 文件清单、校验值和浏览器证据。
2. 复核第 4 节 contract 对齐清单，以及 route/view-state fixtures、生成物和 Host route table 的同步状态。
3. 用 candidate 受控替换 canonical `frontend-demo/`；不改 optimized。
4. 将所有 `frontend-demo-optimized` / 旧 `frontend-demo` 验证硬编码改为 canonical-only。
5. 重跑 canonical contract、motion、P0、codegen、drift 和浏览器矩阵。
6. 按 `HOST_SYNC_MATRIX.md` 的 B0–B7 分端同步；三仓分别测试和提交。

## 6. 仍不等于完成的事项

- Web 文件导入不等于原生沙盒复制、字体注册、重启恢复和删除回退。
- URL 遮挡预设不等于设备真实 cutout/avoid-area 证据。
- P0 静态矩阵不等于像素、交互、真机或 release gate 通过。
- Candidate 截图不等于 Android Compose、iOS SwiftUI、HarmonyOS ArkUI 已实现。
