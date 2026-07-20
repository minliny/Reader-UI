# Settings General · F0 Figma 现场基线与 crosswalk

状态：`F0_BLOCKED`；已完成只读现场核验和无伪造 candidate crosswalk；未进入 F1 writer。

时间：2026-07-20T03:26:06Z  
本地输入 commit：`a6993b4e38eb6ef2cbf58fa7d5094dd0812dfda7`  
Figma fileKey：`klhs2jMM4MncaJFqZMfqEK`

## 结论

本轮没有修改 Figma。Settings General 还不满足 F1 准入：仓库没有 `LOCAL_READY_FOR_FIGMA` packet，也没有 Settings R3a 标记；现有 VC0 权威文档仍明确写着“不可以直接进入 Figma VC1”。安装的 Figma connector / `use_figma` runtime 也不暴露 provider file revision，因此不能把现场时间戳伪装成官方 revision。

已读取 29 个 page，并核对以下真实结构：

- Settings component page：`259:11 / 12 · Components · Settings & About`。
- Shared primitives page：`259:8 / 06 · Components · Shared Primitives`。
- Responsive page master set：`942:21 / Page/Settings General`。
- 三个 master：Phone `942:18`、Compact `942:19`、Tablet `942:20`。
- 三个 downstream prototype instance：`1995:67305 → 942:18`、`1995:67541 → 942:19`、`1995:67777 → 942:20`。

## Canonical graph 现场事实

外层 master / instance 关系真实存在，但三个 responsive master 内部只有 `FRAME / TEXT / VECTOR`，`INSTANCE=0`。因此它们没有消费已经存在的 canonical Settings graph：

- `535:411 / Settings/GeneralSection`
- `534:248 / Settings/SettingRow`
- `531:108 / Settings/Switch`
- `1994:25736 / Settings/InlineAction`
- `1994:25794 / Settings/DangerActionRow`
- `530:165 / Settings/GeneralRowIcon`

原 reaction 未被破坏：`Settings/Switch=10`、`Settings/SettingRow=90`、`Settings/GeneralSection=40`、`InlineAction=5`、`DangerActionRow=5`。问题不是 reaction 消失，而是最终 responsive master 绕过了这些 canonical components。

## 控件来源

- Switch：Settings master `531:108`；共享 primitive `283:35`。
- Select：共享 primitive `282:124`；当前页面只是 raw value/chevron frame，并非 instance。
- Segment：共享 primitive `283:100`；当前页面只有一个 App 主题 aggregate row，没有三个可绑定 option node。
- Stepper：共享 primitive `358:18`；当前 Settings General 页面没有 Stepper 消费点。
- 图标：`530:165 / Settings/GeneralRowIcon`，描述明确为 canonical General Settings route 的 Tabler outline icons；本地来源为 `frontend-demo-optimized/asset-library/icons.js`。
- 字体：现场使用 `Inter` 与 `Songti SC`；writer 当前可用 `Inter` / `Noto Serif SC`，不可用 `Songti SC`。在字体来源未解决前，不允许触碰 text 或会触发 text reflow 的 component 结构。

## Crosswalk 边界

[FIGMA_F0_CROSSWALK.json](./FIGMA_F0_CROSSWALK.json) 记录了 13 个可核验 candidate，每项都有 fileKey、page、三视口 node 和 observation revision。它们仍是 `observed-candidate`，不是完成 binding，因为官方 file revision 不可读取且 canonical instance graph 尚未闭合。

以下键刻意不绑定：

- 三个 `segment-option-*`：Figma 只有一个 aggregate App 主题 row，不能把三个 local key 伪绑到同一 node。
- 三个内层“去设置” button：本地 controlKey 没有 file / notification / battery discriminator；只绑定了三个语义明确的外层 list-row control。

## F1 准入结论

`F1WriterAdmitted=false`。恢复写入前必须同时满足：

1. Settings General 产生 `LOCAL_READY_FOR_FIGMA` handoff packet，并固定精确 local commit。
2. Settings R3a 功能事实与视觉决策问题落盘。
3. 获得可审计的 provider file revision，或由用户明确批准一种正式 revision ledger；现场 observation timestamp 不能冒充官方 revision。
4. 解决 `Songti SC` writer 来源。
5. 明确将 `942:18 / 942:19 / 942:20` 内部 raw frames 迁回 canonical instance graph 的非破坏方案，保留原页面、手工组件和 reactions。
6. 为 Segment 三个 option 与三个内层“去设置”补稳定 local discriminator。

在这些条件满足前，不写 Figma、不生成 Design Delta、不进入 F2/F3。
