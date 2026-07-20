# Settings General · A3 / F0 现场刷新

状态：`F0_BLOCKED`；本地 R2a/R3a 已通过，Figma 已完成只读刷新，单 writer 尚未准入。剩余门禁同时包含本地 identity 缺口和 Figma 环境/结构缺口，不再统称为“外部阻塞”。

时间：2026-07-20T07:13:00Z
本地输入 commit：`f0e315aa85bf1d96e6ff3a1cd1dd784dc484d2f0`
Figma fileKey：`klhs2jMM4MncaJFqZMfqEK`
Figma provider revision：`2377708099597320576`（版本历史最新 autosave；界面显示 `2026-07-19 12:39 PM`，provider 未暴露时区）

## 已解除的本地阻塞

- `LOCAL_READY_FOR_FIGMA.json` 已提交，`r2aPass=true`、`r3aPass=true`。
- Settings General 唯一 renderer、真实交互、状态 owner、持久化、缓存、权限、恢复默认、ARIA 和三视口稳定终态均已有本地证据。
- 三个 App 主题 Segment option 已有稳定业务 key，不再依赖 selector、hash 或 ordinal。
- 已从 Figma 网页端版本历史读取 provider revision `2377708099597320576`；它与 `f0-live-read-20260720T071300Z` 现场观察时间分开记录。

## 当前 Figma 现场

- 文件仍为 29 个 page。
- responsive master set：`942:21 / Page/Settings General`。
- Phone `942:18`、Compact `942:19`、Tablet `942:20` 均为真实 component variant。
- downstream prototype instance 仍为 `1995:67305 → 942:18`、`1995:67541 → 942:19`、`1995:67777 → 942:20`。
- 三个 responsive master 内部仍是 `123 FRAME + 27 TEXT + 84 VECTOR`，`INSTANCE=0`，未消费 canonical Settings graph。
- canonical reaction 保持不变：`Settings/Switch=10`、`Settings/SettingRow=90`、`Settings/GeneralSection=40`、`InlineAction=5`、`DangerActionRow=5`。

## Crosswalk 收紧

[FIGMA_F0_CROSSWALK.json](./FIGMA_F0_CROSSWALK.json) 只保留 7 个使用稳定业务 key 的 candidate：3 个 Select 和 4 个 Switch。每项包含 fileKey、page、三视口 node 和 provider revision；另行保留本次 live observation revision，二者不混用。

以下内容没有伪造绑定：

- 三个 Segment option：本地 identity 已稳定，但 Figma 仍只有 `879:43 / 884:43 / 887:43` 三个 aggregate row，没有每个 option 的独立节点。
- reset、cache、back、三个 permission row 和三个内层"去设置"：A3 已将本地 identity 从 ordinal registry 升级为稳定 `a3-action` 声明（9 个 settingsKey），renderer 已 stamp 5 个 data-* 属性，本地侧可输出正式 binding；Figma 侧 node 仍需在 F1 mutation 时回填。

## 仍阻止 F1 writer 的事项

1. writer 环境仍没有 `Songti SC`；存在该字体的 text 或 text-affecting component 结构不能安全修改，也不能用 `Noto Serif SC`、截图或 outline 冒充。
2. 三个 responsive master 仍绕过 canonical instance graph。这个问题属于 F1 要修的目标，但在 font/binding 门禁未关闭前不能开始 mutation。
3. Figma 缺三个独立 Segment option node。
4. reset/cache/back/permission actions 和三个内层"去设置"仍缺稳定 action/instance identity。

### Songti SC 来源调研（A3 Step 6）

**字体性质**：`Songti SC`（宋体-简）是 Apple 系统字体，随 macOS / iOS 出货，PostScript 名为 `STSongti-SC-Light` / `STSongti-SC-Regular` / `STSongti-SC-Black`。

**本机可用性（已验证）**：

- 路径：`/System/Library/Fonts/Supplemental/Songti.ttc`（66.9 MB TTC，包含 Songti SC Light/Regular/Black + Songti TC）
- `fc-list` 确认 Songti SC Regular/Light/Black 均可枚举
- `system_profiler SPFontsDataType` 确认 STSongti-SC-Black / STSongti-SC-Light 已注册
- CI 已运行在 `macos-15`（见 `.github/workflows/ui-runtime.yml`），该环境自带 Songti SC

**Writer runtime 现状**：

- writer 是 Figma 侧 agent，本仓库内没有 writer 实现（无 Figma plugin manifest、无 `@figma/*` 依赖、无 tsconfig）
- writer 字体可用集合记录在 `FIGMA_F0_CROSSWALK.json` 的 `sources.fonts`：`availableToWriter = ["Inter", "Noto Serif SC"]`，`unavailableToWriter = ["Songti SC"]`
- writeRule 明确：不允许用 `Noto Serif SC` 替代，也不允许用截图或 outline 冒充

**可选来源（按优先级）**：

1. **在 macOS 上运行 writer 的 Figma 会话（推荐）**
   - Songti SC 是 macOS 系统字体，Figma desktop on macOS 可直接通过 `figma.loadFontAsync({ family: "Songti SC", style: "Regular" })` 加载
   - 无需复制字体文件，无授权风险——Apple 授权 Songti SC 在 Apple 硬件上使用
   - 若 writer 当前在非 Mac 环境运行，迁到任意近期 macOS 机器即可解除阻塞
   - 验证方式：在目标 Mac 上打开 Figma desktop，确认字体选择器中能找到 "Songti SC"

2. **在 macOS 上用 Figma web + Figma font helper**
   - Figma web 通过 font helper 访问本地系统字体
   - 功能上等同于选项 1，但走浏览器路径
   - 需在目标 Mac 上安装 Figma desktop（font helper 随其安装）

3. **将 Songti.ttc 复制到非 Mac writer 机器**
   - 技术上可行：从 Mac 复制 `/System/Library/Fonts/Supplemental/Songti.ttc` 到 Linux/Windows 系统字体目录
   - **授权风险**：Songti SC 由 Apple 授权仅在 Apple 硬件上使用；在非 Apple 硬件上安装可能违反 Apple Software License Agreement
   - 需法务 review 后才能采用，**不推荐作为默认路径**

4. **推迟文本变更，先做非文本结构修复**
   - 不解除 Songti SC 阻塞，先修 INSTANCE graph 和 Segment option node（不涉及 text mutation）
   - 文本变更留到 Songti SC 可用后再批量处理
   - 可作为临时策略，但不解除 F1 writer 门禁

**推荐路径**：选项 1。Songti SC 是 macOS 系统字体，writer 在 macOS 上运行 Figma 会话即可获得该字体，无需文件复制、无授权风险。本仓库 CI 已在 `macos-15` 上运行，同一环境即可作为 writer host。

**待确认**：writer 当前实际运行的 Figma 会话在哪台机器/哪种 OS 上？若已在 macOS 上但仍缺 Songti SC，需排查 Figma desktop 的字体扫描是否遗漏了 Supplemental 目录。

### A3 本地 identity 修复（Step 4 / Step 5）

第 4 项阻塞已在 A3 本地侧修复：

- `control-identity-declarations.js` 新增 9 个 `source: "a3-action"` 稳定 identity，替换旧 ordinal registry entries（`.n0`–`.n8`）
- 9 个 settingsKey：`reset-defaults` / `cache-clear` / `back` / `permission-{battery,file-access,notification}` / `permission-action-{battery,file-access,notification}`
- `d2-settings-sync-renderers.js` 5 个 stamping 点全部接入：reset button、cache inner button、back button、permission link row article、permission inner button
- `shared-shell-kit/kit.js` `backTopBar()` 扩展 `config.backButtonAttrs` 透传 identity attrs
- `a3-settings-general-action-identity.test.mjs` 12/12 通过，`a1-settings-general-identity.test.mjs` 9/9 通过（scope 已收紧到 r2.0-subcontrol）
- 全套件 135/135 通过，无回归

## 结论

本轮没有修改 Figma，没有 detach、删除、替换页面或 reaction，也没有进入 F2/F3。A3 本地侧已完成：9 个 a3-action 稳定 identity 落地、Songti SC 来源已明确（推荐 writer 在 macOS 上运行 Figma 会话）。F1 writer 继续保持 `false`，直到 Songti SC 在 writer 运行时可用、三个 responsive master 接入 canonical instance graph、Figma 补齐三个独立 Segment option node。
