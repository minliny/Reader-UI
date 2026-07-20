# Settings General · F0/F1 现场报告

状态：`F1_AWAITING_USER_CONFIRMATION`。

- 本地实现 commit：`3804eb82de7b8f71a8a43e9d8e2037b19d686ca6`
- 本地 evidence commit：`d0d0c8567f7defff07db6f93c5c768cad6629c13`
- 本地 shadow guard commit：`22cf95f3585dfe433dc538c73d1894c915ea243d`
- Figma fileKey：`klhs2jMM4MncaJFqZMfqEK`
- F1 base revision：`2377708099597320576`
- F1 current named revision：`2378263682617840946 / F0/F1 · Remove All Compact Viewport Structures`

## F0 结论

- 本地 R2a、R3a、A3 action identity 均通过。
- Crosswalk 现有 19 个 binding：10 个 subcontrol 加 9 个 action；每项均包含 fileKey、page、Phone/Tablet node 和 provider revision。Landscape 显式 alias 到 Tablet node，不再建立独立横屏 binding。
- 三个 App 主题 option 已绑定到真实、独立的 instance child frame，不再绑定 aggregate row。
- `unbound=[]`，没有 ordinal、selector、截图或伪造 node binding。
- Songti SC 通过本机 Figma Desktop writer 成功加载 Light/Regular/Black；没有使用 Noto Serif SC、outline 或截图替代。

## F1 writer 结果

本轮采用本机 Figma Desktop 临时插件作为唯一 writer。写入前创建隐藏、可恢复备份：

- `2114:17406 / __F1_BACKUP/Page/Settings General @2377708099597320576`

共享组件变化：

- `531:108 / Settings/Switch`：10 → 13 variants，补 Loading 与 Selected。
- `282:124 / Primitive/Select`：15 → 24 variants，补 Pressed、Loading、Selected 的 SM/MD/LG。
- `283:100 / Primitive/SegmentedControl`：6 → 15 variants，补 Pressed、Disabled、Loading。
- `358:18 / Control/Stepper`：2 → 6 variants，补 Pressed、Focus、Loading、Selected。
- `534:248 / Settings/SettingRow`：36 → 42 variants，补各 trailing 的 Selected。
- 新建 `2114:20635 / Settings/ThemeSegment`：15 variants；Selected=FollowSystem/Light/Dark，Interaction=Default/Focus/Pressed/Disabled/Loading。

页面 master 变化：

- `942:18 / Phone`：0 → 16 INSTANCE。
- `942:20 / Tablet`：0 → 16 INSTANCE。
- 原横屏 master `942:19` 及隐藏 retired 容器已完全删除；恢复路径由删除前 named revision 提供，不再在当前文件保留隐藏结构。
- 共替换的 canonical control 仍保留原 node/reaction；当前 canonical viewport 只有 Phone 390×844 与 Tablet 760×960，Landscape 直接引用 Tablet。
- ThemeSegment 三个 option 均为独立 54×30 frame，并各有 54×44 `Choice/HitTarget`。

下游关系保持：

- `1995:67305 → 942:18`
- `1995:67777 → 942:20`

原有 component reactions 未删除。Settings/SettingRow 新增 Selected variants 继承了 10 条 reaction；原 90 条仍保留。页面 26 的跨页面中间态已全部归位，最终 leak 为 0。

## 显式页面例外

- Back：`879:28 / 887:28`。保留现有精确 44×44 手工按钮；当前库没有语义等价的 canonical icon-button master。
- permission outer rows：`879:201/219/238`、`887:201/219/238`。外层状态组合继续保留，三个内层“去设置”均已切换为 `Settings/InlineAction` instance。

## 用户复审纠偏：Landscape 与阴影

- 不再维护独立横屏视觉方案。Figma component set `942:21` 当前只有 `942:18 / Phone` 与 `942:20 / Tablet`；横屏验收直接引用 Tablet master。
- 下游独立横屏 prototype 已删除；Phone 与 Tablet prototype 保留，横屏不再占用第三个结构槽位。
- 先前“已完成全量 effect 审计”的结论只覆盖 page root 与 Settings General，属于不完整审计，现由 revision `2378238571030063779` 明确替代。
- 本次逐节点扫描 `941:2 / Final Responsive Page Masters · 24 Sets` 的所有 effectively-visible canonical descendants：408 个节点仍带 active `DROP_SHADOW`，共 408 个外阴影 effect；整页 24（含 `941:2` 外部节点）复核后 active `DROP_SHADOW` node/effect 均为 0。
- 根因与本地 token 完全对应：`--fd-ds-shadow-elevated` 被 `.fd-phone/.fd-reader-frame` 消费，`--fd-ds-shadow-soft` 被 `.fd-setting-section` 消费。此前只在 Figma 擦除，下一次同步会再次生成。
- 已清除上述 408 个 active 外阴影，同时保留 72 个 `INNER_SHADOW`（文本、Dropdown、Button 等内部状态表达）；没有删除或 detached 任何 node、instance、reaction 或手工内容。
- 为避免再次出现“修了但无法追溯”，清理前的 408 份 effects 已按 11 个 chunk 写入 section `941:2` 的 shared plugin data：namespace `readerShadowAudit`，keys `manifest`、`backup.0`…`backup.10`、`result`。
- 本地 canonical CSS 已把 page root 与 settings surface 改为 `box-shadow: none`，并新增回归测试；本地规则与 Figma 整页规则都将 page 24 的 active `DROP_SHADOW` 合法数量固定为 0。

## 当前门禁

F0 已通过，F1 技术检查已通过。根据用户最新 viewport policy，仍需确认 Phone 与 Tablet 两个 canonical 视觉结果；Landscape 直接继承 Tablet，不再单独验收。确认前：

- `f1Exit=false`
- `f2QueueAdmitted=false`
- 不启动其他 12 个页面族，也不进入 Motion Reference。

## Compact 结构全量删除（2026-07-20）

- 按 29 页完整分母扫描 `Viewport=Compact`、`CompactLandscape`、844×390 和 Compact prototype/assembly 命名；最终 29/29 页命中 0，读取错误 0。
- 删除 175 个顶层节点：174 个 Compact viewport 结构，另加 Page 24 已清空的 retired container。分项为 Page 23 的 49 个 Compact assembly/prototype、Reader 2 的 90 个 CompactLandscape variant 与 4 个 QA/proof、Page 24 的 26 个 Compact/backup/retired component 加 1 个空容器、Page 04 的 Landscape Reference section、Page 22 的 4 个 Compact capture/label。
- Page 24 共 26 个 component set（含 Settings General）已收拢为连续 Phone 390×844 + Tablet 760×960 双列；不存在删除后遗留的第三列空槽。
- `942:21 / Page/Settings General` 当前只有 `942:18 / Phone` 与 `942:20 / Tablet`；下游只保留 `1995:67305 / Phone` 和 `1995:67777 / Tablet`。
- 本地 runtime、handoff 与 motion harness 只允许 Phone/Tablet；横屏 844×390 运行时实测为 `tablet-expanded`，不会再发出 `compact-landscape` 或 `fold` viewport atom。
- 命名版本：`2378263682617840946 / F0/F1 · Remove All Compact Viewport Structures`。

## 全文件阴影纠偏补充（2026-07-20）

用户指出此前“全量修复”实际只证明了第 24 页。现已按 29 页完整分母重新审计：初始 22 页共有 1,047 个 active `DROP_SHADOW`；按 canonical component → downstream instance/reference 的顺序处理后，净减少 885 个。

- `23 · Pages · Final`、`24 · Responsive Masters · Phase 4` 及所有静态页面/正文 surface 的 active `DROP_SHADOW` 均为 0。
- 最终保留 162 个均有显式语义：70 个 Motion Reference（F3 独立 lane，本轮仅审计）、39 个 focus ring、9 个 Overlay/Dialog/BottomSheet、5 个书封、12 个 SessionCapsule、11 个阅读控件图标、4 个 Filter Menu/Apply、12 个 Foundations effect sample。
- 18 个 page 有直接写入；写入前使用 `readerFullShadow20260720` 保存每页 recovery manifest/backup/result。另有 207 个 effect 因 canonical master 修复由实例继承消失。
- 29/29 页最终复核完成，读取错误 0；完整逐页数据见 `docs/design/FIGMA_FULL_FILE_SHADOW_AUDIT_2026-07-20.json`。
- Figma 自动保存与 named version 固化均已完成：`2378238571030063779 / F0/F1 · Full File Shadow Policy Closure`。

## 阴影根因闭环（2026-07-20）

- 本地根因不是某一页漏删，而是 canonical runtime 长期暴露 `--fd-shadow`、`--fd-soft-shadow`、`--fd-settings-card-shadow` 这类无语义边界的全局别名；普通 page/card/settings/reader surface 可以直接消费它们，因此后续页面复用或再次 capture 会把阴影重新生成。
- 已移除三个歧义别名，改为四个角色限定 token：`overlay`、`transient`、`media`、`floating-control`。普通内容面统一无外投影；Reader 固定正文/面板只允许无外投影或 inset 表达。
- 新增 fail-closed gate `frontend-demo-optimized/verify/shadow-policy.test.mjs`：扫描 canonical runtime 全部 CSS 与 renderer 内联 CSS；任何未分类 external `box-shadow`/`drop-shadow`、任何旧别名、任何 persistent page/body surface 外阴影都会直接使测试失败。
- 全套本地测试 `139/139`；浏览器覆盖 13 个页面族 × Phone 390×844 / Tablet 760×960，共 26 次检查、0 泄漏。Landscape 直接 alias Tablet，不再产生独立横屏工作量。
- Figma 重新逐页读取 29/29、错误 0；每页计数与修复后基线一致，active `DROP_SHADOW` 总数仍为 162，全部属于已记录语义例外，普通正文 surface 为 0。
- 新 named revision：`2378238571030063779 / F0/F1 · Full File Shadow Policy Closure`。因此本轮同时关闭“存量 Figma 节点”和“未来本地生成源”两条复发路径。
