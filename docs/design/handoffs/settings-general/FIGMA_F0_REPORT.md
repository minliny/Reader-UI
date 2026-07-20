# Settings General · F0/F1 现场报告

状态：`F1_AWAITING_USER_CONFIRMATION`。

- 本地实现 commit：`3804eb82de7b8f71a8a43e9d8e2037b19d686ca6`
- 本地 evidence commit：`d0d0c8567f7defff07db6f93c5c768cad6629c13`
- 本地 shadow guard commit：`22cf95f3585dfe433dc538c73d1894c915ea243d`
- Figma fileKey：`klhs2jMM4MncaJFqZMfqEK`
- F1 base revision：`2377708099597320576`
- F1 current named revision：`2378229984327606962 / F1 · Settings General · Tablet Landscape Policy + Shadow Guard`

## F0 结论

- 本地 R2a、R3a、A3 action identity 均通过。
- Crosswalk 现有 19 个 binding：10 个 subcontrol 加 9 个 action；每项均包含 fileKey、page、Phone/Tablet node 和 provider revision。Landscape 显式 alias 到 Tablet node，不再伪造独立 Compact binding。
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
- 原 `942:19 / Compact 844×390` 已从 canonical component set 移出，隐藏保留在 `2144:56865 / __RETIRED_VIEWPORTS__`，仅用于恢复，不再进入设计或验收。
- 共替换的 canonical control 仍保留原 node/reaction；当前 canonical viewport 只有 Phone 390×844 与 Tablet 760×960，Landscape 直接引用 Tablet。
- ThemeSegment 三个 option 均为独立 54×30 frame，并各有 54×44 `Choice/HitTarget`。

下游关系保持：

- `1995:67305 → 942:18`
- `1995:67541 → 942:20`（Landscape → Tablet alias，760×960）
- `1995:67777 → 942:20`

原有 component reactions 未删除。Settings/SettingRow 新增 Selected variants 继承了 10 条 reaction；原 90 条仍保留。页面 26 的跨页面中间态已全部归位，最终 leak 为 0。

## 显式页面例外

- Back：`879:28 / 887:28`。保留现有精确 44×44 手工按钮；当前库没有语义等价的 canonical icon-button master。
- permission outer rows：`879:201/219/238`、`887:201/219/238`。外层状态组合继续保留，三个内层“去设置”均已切换为 `Settings/InlineAction` instance。

## 用户复审纠偏：Landscape 与阴影

- 不再维护 `844×390 Compact` 独立视觉方案。Figma component set `942:21` 当前只有 `942:18 / Phone` 与 `942:20 / Tablet`；横屏验收直接引用 Tablet master。
- 下游 `1995:67541` 已从 `942:19` swap 到 `942:20`，frame 与 instance 均为 760×960；原 Compact master 保留在隐藏 retired section，未删除历史节点。
- 对 `24 · Responsive Masters · Phase 4` 完成全量 effect 审计：发现 540 个 shadow node；其中 156 个使用 `0 18 46 rgba(89,70,50,.16)`，129 个使用 `0 8 26 rgba(89,70,50,.10)`，且 534 个为直接 effect、不是共享 effect style。
- 根因与本地 token 完全对应：`--fd-ds-shadow-elevated` 被 `.fd-phone/.fd-reader-frame` 消费，`--fd-ds-shadow-soft` 被 `.fd-setting-section` 消费。此前只在 Figma 擦除，下一次同步会再次生成。
- 已清除 71 个 active `Main Content` 根节点的大阴影；Settings General canonical subtree 额外清除 8 个 section/action surface shadow，当前 active shadow count 为 0。
- 本地 canonical CSS 已把 page root 与 settings surface 改为 `box-shadow: none`，并新增回归测试。Overlay、focus、selected、book cover 等明确语义阴影继续保留。

## 当前门禁

F0 已通过，F1 技术检查已通过。根据用户最新 viewport policy，仍需确认 Phone 与 Tablet 两个 canonical 视觉结果；Landscape 直接继承 Tablet，不再单独验收。确认前：

- `f1Exit=false`
- `f2QueueAdmitted=false`
- 不启动其他 12 个页面族，也不进入 Motion Reference。
