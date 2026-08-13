# Settings General · VC0 代表页面审计

状态：VC0 样板已完成；分类为 `两阶段`；DOM bounds 证据口径已于 2026-07-19 修正

日期：2026-07-19

Route：`settings-general`（direct，无 alias）  
Shell：`SettingsShell`  
Browser URL：`http://127.0.0.1:5177/frontend-demo-optimized/?captureRoute=settings-general&captureChrome=0&motionReduced=1`

## 1. 结论

静态候选在 Phone、Compact、Tablet 三档与当前浏览器实页高度接近，可以保留为视觉基线；但页面当前不是可交互成品，不能直接进入 Figma 定稿。

分类：`两阶段`

1. 先由 Codex / Reader-UI 统一唯一 renderer、控件语义、事件、状态、持久化和可见结果。
2. 浏览器三视口交互闭环后，再回到 Figma 确认 Design Delta、Dialog / Sheet、关键状态和 Motion reference。

本轮没有修改 Figma 或产品 runtime。

## 2. 当前 Figma 节点

| Viewport | Prototype frame | Page instance | Main component | 尺寸 |
| --- | --- | --- | --- | --- |
| Phone | `1995:67304` | `1995:67305` | `942:18` | 390 × 844 |
| Compact | `1995:67540` | `1995:67541` | `942:19` | 844 × 390，390 × 390 surface 居中 |
| Tablet | `1995:67776` | `1995:67777` | `942:20` | 760 × 960 |

三个 prototype frame 各有一个返回热点；页面 instance 内“清理缓存”“去设置”“恢复默认”等视觉按钮没有业务 reaction。Settings source component 只继承 hover / press / focus 等微状态。

## 3. 三视口当前实页对照

| Viewport | Figma | Browser | 同尺寸对照 |
| --- | --- | --- | --- |
| Phone 390 × 844 | [figma](./figma-settings-general-phone.png) | [browser](./browser-settings-general-phone.png) | [comparison](./settings-general-phone-comparison.png) |
| Compact 844 × 390 | [figma](./figma-settings-general-compact.png) | [browser](./browser-settings-general-compact.png) | [comparison](./settings-general-compact-comparison.png) |
| Tablet 760 × 960 | [figma](./figma-settings-general-tablet.png) | [browser](./browser-settings-general-tablet.png) | [comparison](./settings-general-tablet-comparison.png) |

当前可见差异是低到中风险静态差异，不是本页首要阻塞：

- Browser 的标题、局部字体和图标略小，边框 / 阴影更弱；Figma 的卡片轮廓更清晰。
- Phone 内容左右边距、58px 行高和区块结构基本一致。
- Compact 两侧留白与 390px surface 均居中，几何规则一致。
- Tablet 的 760px canvas、约 720px 内容区和三段结构一致。
- 三档都缺少被操作后的 Dialog / Sheet、loading、success / error 和系统返回状态，静态接近不能抵消交互缺口。

浏览器原始 capture 另保留为 `browser-settings-general-*-capture.png`；表中 browser 文件是按产品 canvas 裁取的同尺寸证据，没有把截图整体缩放来掩盖差异。

## 4. 当前合同与 renderer

ScreenGraph 只有一个 default ViewState：

- `BackTopBar(title=通用设置)`；
- `SettingsGeneralPage`；
- 两个 component 的 `bindings` 均为空；
- 没有 loading / error / disabled / success / system-return variant。

实际页面在 `renderRoute` 的 D2 hook 被 `globalSettingsV2` 接管，旧 `settingsScreen` switch 分支被绕过。D2 `globalSettingsV2` 只把 `toastHtml` 传给 shell，没有根据 `appState.settingsOverlay` 提供 `dialogHtml`；事件监听虽会写入 `appState.settingsOverlay` 并重渲染，但重渲染后仍没有可见 Dialog。

## 5. 浏览器人工操作结果

| 控件 | 当前 DOM / 语义 | 当前操作结果 | 缺口 |
| --- | --- | --- | --- |
| App 主题 | `article role=group`，无 option key / action | 点击前后 HTML 与可见值均不变 | 缺选择器、selected 语义、持久化 |
| 语言 / 启动页 / 动画效果 | `article role=group`，无 `data-settings-option-key` | runtime option handler 无匹配目标 | 缺展开、选择、提交、取消 |
| 4 个 Switch | `article role=group`；内部只有 `aria-hidden=true` span | 点击“自动检查更新”前后 class / HTML 不变 | 缺 `role=switch`、`aria-checked`、事件、状态 owner |
| 清理缓存 | button 有 `data-settings-overlay=dialog:cache-clear` | 点击后 accessible DOM 不变，无 Dialog / toast / busy | 已有 `settings.cache.clear → cache.clear` 合同，但页面未 dispatch |
| 3 个系统权限 | row 有 `data-settings-overlay=dialog:*permission` | 点击后无可见 Dialog 或系统往返状态 | 缺 Host owner、pending、system-return、拒绝 / 错误 |
| 恢复默认 | button 有 `data-settings-overlay=dialog` | 点击后 accessible DOM 不变，无确认 | 缺危险操作对象、确认、成功 / 失败、回滚 |

机器记录见 [settings-general-browser-observation.json](./settings-general-browser-observation.json)。

## 6. DOM bounds 证据口径（2026-07-19 修正）

> 历史版本曾把第 7 节“当前 Browser screenshot + DOM geometry”写成“已完成，三视口”，被读作“完整 DOM geometry 已采集”。该口径不准确。本节明确：现有 JSON 只证明 `productCanvas` 与 `mainSurface` 的视口外框，未记录标题、区块、控件行、滚动范围等 DOM bounds。

### 6.1 已有 DOM bounds

| 范围 | 字段 | 覆盖 |
| --- | --- | --- |
| viewport `productCanvas` | `width`、`height` | Phone / Compact / Tablet 三档 |
| viewport `mainSurface` | `width`、`height`、`x` | Phone / Compact / Tablet 三档；Compact 含 390×390 居中 surface `x=227` |

### 6.2 缺失 DOM bounds

| 范围 | 字段 | 缺失原因 |
| --- | --- | --- |
| 标题 / BackTopBar | `x`、`y`、`width`、`height` | 未记录 `BackTopBar(title=通用设置)` 的 DOM bounding rect |
| section header（基础偏好 / 行为与反馈 / 系统权限） | `x`、`y`、`width`、`height` | 未记录三段 section header 的位置 |
| setting row | `x`、`y`、`width`、`height` | `controlObservations` 只记录 tag / role / class / result，未记录每行 bounding rect |
| control inner（switch / icon / value） | `x`、`y`、`width`、`height` | `Settings/Switch` 44×24 / thumb 20×20 / 状态点 24×18×7 等 Figma 几何未与 DOM 实测对齐 |
| scroll range | `scrollHeight`、`clientHeight`、`scrollTop`、`scrollRange` | 未记录可滚动容器的滚动范围 |
| safe area / tab bar | `top`、`bottom`、`left`、`right` | 未记录安全区域或底部 Tab 高度对内容区的影响 |
| focus ring / hit target | `x`、`y`、`width`、`height` | 未记录 `focus-visible` 或 hit target 的 bounding rect |

### 6.3 不主张的范围

- 本样板不主张“完整 DOM geometry”。
- 任何引用本样板或 `settings-general-browser-observation.json` 不能写成“DOM bounds 已完整”。
- 若后续需要完整 DOM bounds，必须重新采集并写入新的 evidence 字段，不在此样板内反向补全。

## 7. 明确修复责任

### Reader-UI / Codex 先修

1. 冻结唯一 production renderer，删除或隔离 D2 / legacy 双实现的状态冲突。
2. 为主题、Select、Switch、缓存、权限和恢复默认增加稳定 `data-control-id` 与 ScreenGraph component instance / binding。
3. 使用原生语义：Switch 必须有 `role=switch` / `aria-checked`，Select / Segment 必须表达 selected / expanded，危险操作必须明确对象和确认。
4. 将清缓存接到现有 `settings.cache.clear → cache.clear`，补 busy、success、error、repeat-tap / stale-result、toast / undo 或明确不可撤销说明。
5. 为权限增加 Host request、pending、系统返回、拒绝、无权限与错误状态；为所有偏好增加持久化和 rollback。
6. 补 ScreenGraph ViewState、UiEvent binding、reducer / runtime test 和三视口浏览器操作证据。
7. 在补齐控件语义的同时，采集标题、区块、控件行与滚动范围的 DOM bounds，再写入新 evidence；不在此样板内反向补全。

### Figma 后修

1. 复用页面 06 / 12 的 canonical primitives，不在页面 instance 内继续以普通 Frame 冒充控件。
2. 增加 Select / Segment、Dialog / Sheet、busy / success / error / disabled 的 canonical state 与 constraints。
3. 把业务结果、interrupt、reduced-motion 终态和 focus restore 写入交互意图 / Motion reference。
4. 只在浏览器闭环后冻结 Design Delta；当前静态候选不先重画。

## 8. VC0 判定

| 项目 | 结果 |
| --- | --- |
| 当前 Browser screenshot（视口外框） | 已完成，三视口 |
| 当前 Browser DOM bounds | 仅 `productCanvas` / `mainSurface` 外框；标题 / 区块 / 控件行 / 滚动范围 / 安全区域 / focus / hit target 缺失，**不完整** |
| 当前 Figma screenshot + node | 已完成，三视口 |
| 当前差异与 owner | 已明确 |
| 页面分类 | `两阶段` |
| 可以直接进入 Figma VC1 | 否 |
| 可以宣称页面交互完成 | 否 |
| 可以宣称 DOM geometry 已完整 | 否 |

若用户确认本样板口径，下一批按同一模板批量完成其余页面族 VC0；`Settings General` 自身先进入 Reader-UI 交互修复，不先写 Figma。
