# 前端 Demo 参数与项目结构审计（Frontend Demo Parameter and Structure Audit）

本文审计当前本地 `frontend-demo-draft`、`shared-shell-kit`、`asset-library`、`component-library`、`manifest` 和规划文档。目标是判断全局 UI / 组件 / 框架参数是否存在重复、冗余、错误命名，以及当前项目结构是否适合作为后续前端输入件。

## 审计结论（Audit Conclusion）

当前 demo 已经能承载主要交互和页面结构；` 2` 副本已从正式项目中删除，结构唯一性问题已收敛。`render.js` 与 `styles.css` 已拆成入口文件，route 契约、runtime 实现和 CSS 分层文件已落地；发现 / RSS / 设置深层链路由 `route-contract.js` 和验证脚本共同约束。

| 维度（Dimension） | 结论（Conclusion） | 严重度（Severity） |
|---|---|---|
| 项目结构（Project Structure） | ` 2` 副本已删除，正式源唯一；demo 入口、route 契约、runtime、CSS chunks 已拆分。 | 低 |
| CSS 参数（CSS Parameters） | CSS 入口已拆为 7 个分层文件；视觉尺寸仍需后续逐步归入 token / component parameter / viewport class。 | 中 |
| 交互参数（Interaction Parameters） | 阅读排版、主题、字体、亮度、朗读、阅读设置已集中到 `fixture.js`；部分设置项、书源管理数据、弹窗文案仍在 `render-runtime.js`，属于后续内部组件化范围。 | 中 |
| 路由命名（Route Naming） | 有重复标题和语义不准确命名，例如 `webdav-config` 复用同步备份标题、`source-edit-debug` 与 `source-rule-edit` 同名、`reader-full-*` key 仍用 `full` 表示实际的大半屏展开面板。 | 中高 |
| 文档同步（Documentation Sync） | 总览、书架规划、handoff、cross-platform 已按 demo 主导航收敛；深层页面闭合由验证契约覆盖。 | 低 |
| Shell 分层（Shell Structure） | `shared-shell-kit` 相对清晰；`render-runtime.js` 后续可继续拆到页面模块，但入口级单体风险已解除。 | 中 |

## 关键证据（Key Evidence）

| 项目（Item） | 当前数量 / 现象（Current Evidence） | 说明（Notes） |
|---|---:|---|
| `frontend-demo-draft/render.js` | 8 行 | 仅保留 runtime bootstrap。 |
| `frontend-demo-draft/render-runtime.js` | 5087 行 | 主渲染 runtime，后续内部组件化对象。 |
| `frontend-demo-draft/route-contract.js` | 176 行 | route 元数据和发现 / RSS / 设置深层闭合契约。 |
| `frontend-demo-draft/styles.css` | 9 行 | 仅保留 token 和分层 CSS import。 |
| `frontend-demo-draft/styles/*.css` | 7 个文件 | 按原级联顺序拆分为 foundation / shell / main-library / reader / settings-source / flow-adaptive / responsive。 |
| CSS `px` 值 | 2065 次，135 个唯一值 | 不是全部错误，但说明大量尺寸仍是局部散值。 |
| CSS media query | 2 个 | 仅覆盖局部 demo / source-switch，不是完整自适应体系。 |
| CSS 自定义属性定义 | 130 个，未发现重复定义冲突 | 覆盖 `tokens.css`、demo CSS、shell kit CSS、asset CSS；命名冲突不是主问题，主问题是 token 覆盖范围不足。 |
| ` 2` 副本 | 0 个已跟踪文件 | 499 个旧副本文件已删除，正式输入件只保留无 ` 2` 路径。 |
| route 数量 | 60 个 | demo 已超过原 30 页范围，包含 RSS 深层状态、缓存管理、书源管理子流程、同步恢复流程和阅读展开态。 |
| 重复 route 标题 | 2 组 | `sync-backup` / `webdav-config` 同为“同步与备份”；`source-rule-edit` / `source-edit-debug` 同为“规则编辑”。 |

## 参数审计（Parameter Audit）

### 已经合理统一的参数（Properly Unified Parameters）

| 参数组（Parameter Group） | 当前源头（Source） | 状态（Status） |
|---|---|---|
| 阅读排版当前值（Reader Typography Values） | `fixture.js` 的 `reader.typography` | 可保留。 |
| 阅读排版范围（Reader Typography Bounds） | `fixture.js` 的 `reader.typographyConfig` | 可保留。 |
| 阅读主题（Reader Themes） | `fixture.js` 的 `reader.themeDefault` / `reader.themeOptions` | 可保留。 |
| 阅读字体（Reader Fonts） | `fixture.js` 的 `reader.fontOptions` | 可保留。 |
| 章节进度（Chapter Progress） | `fixture.js` 的 `reader.chapterProgress` | 可保留。 |
| 亮度（Brightness） | `fixture.js` 的 `reader.brightness` | 可保留。 |
| 朗读（TTS） | `fixture.js` 的 `reader.tts` | 可保留。 |
| 阅读设置（Reader Settings） | `fixture.js` 的 `reader.controlSettings` | 可保留。 |
| 四个阅读模块（Reader Modules） | `fixture.js` 的 `reader.modules` | 可保留。 |

### 仍然冗余或应迁出的参数（Redundant or Misplaced Parameters）

| 当前位置（Current Location） | 问题（Problem） | 建议（Recommendation） |
|---|---|---|
| `render-runtime.js` 的 `readerQuickActionIconMap` | 快捷动作图标映射是 UI 参数，不是路由逻辑；当前放在 runtime 层。 | 迁到 `fixture.js` 的 `reader.quickActions[].icon`，并由素材库 token 校验。 |
| `render-runtime.js` 的书源管理列表、检测步骤、日志、源码示例 | 业务 fixture 混在页面 runtime 中。 | 拆到 `fixture.js` 的 `sourceManagement`、`sourceDetection`、`sourceDebug`。 |
| `render-runtime.js` 的设置页分组、WebDAV 表单、同步恢复选项 | 设置内容和表单数据硬编码在 runtime。 | 拆到 `fixture.js` 的 `settings.pages` 或独立 `settingsFixtures`。 |
| `render-runtime.js` 的弹窗文案和 toast 文案 | 交互状态文案分散，不利于统一检查。 | 建立 `dialogCopy` / `toastCopy` fixture，按 route 和 action 索引。 |
| `render-runtime.js` 的 fallback 默认值 | 有容错价值，但容易和 fixture 默认值漂移。 | 保留最小兜底，但需要注释为 runtime guard；业务默认值只允许在 fixture。 |
| `styles/*.css` 中大量尺寸散值 | 视觉文件已分层，但尺寸仍未完全 token 化。 | 继续做尺寸清单：global token、shell token、component token、page-only value。 |

## 命名审计（Naming Audit）

| 名称（Name） | 当前问题（Current Problem） | 建议命名（Suggested Naming） |
|---|---|---|
| `reader-full-directory` / `reader-full-tts` / `reader-full-appearance` / `reader-full-settings` | 当前页面标题已经标明“大半屏控制窗”，但 route key 仍使用 `full`，容易被误读为真正全屏页。 | 若表示大半屏：`reader-expanded-*`；若表示全屏：必须真的全屏并复用详情目录页结构。 |
| `webdav-config` | route 独立但标题仍是“同步与备份”；当前渲染分支会把它映射回 `sync-backup`，同步页本身已经包含 WebDAV 配置。 | 如果保留 route，命名为 `sync-backup-webdav-section`；否则删除 route。 |
| `source-edit-debug` | 标题与 `source-rule-edit` 重复，语义像规则编辑又像调测。 | 拆为 `source-rule-debug-entry` 或删除并合并到 `source-debug`。 |
| `source-detect` | 当前实现更像检测结果页，但 route key 使用动作名，容易和“点击检测”动作混淆。 | 若是结果页：`source-detection-result`；若是动作：不应作为 route。 |
| `settings-general` 中“恢复默认” | 用户多次要求避免多余复杂操作；恢复默认是否仍需要全局存在未重新确认。 | 先标记为待审，不作为默认 P0。 |
| `CacheManagement` | 已按正式 manifest / contracts / planning docs 保留独立缓存管理页；设置首页进入 `cache-management`，页面覆盖缓存占用、缓存分类、策略和清理确认。 | 保留独立页；App 通用设置里的“缓存清理”只作为快捷危险操作，不替代完整缓存管理页。 |

## 文档与 Demo 不一致（Documentation vs Demo Drift）

| 漂移项（Drift Item） | 当前证据（Evidence） | 应处理方式（Fix Direction） |
|---|---|---|
| 独立缓存管理页 | `manifest.json`、`contracts.d.ts`、`EVENT_CALLBACK_MAPPING.md`、`PAGE_RELATIONSHIP_MAP.md`、`FRONTEND_PAGE_PLANNING_CARDS.md` 均保留 `cache-management` / `CacheManagement`；demo 已补 `cache-management` route 和 SettingsShell 页面。 | 已按 30 个正式页面口径闭合；后续只需把缓存数据继续从 runtime 迁入 fixture。 |
| 同步与备份的备份记录 | 当前 `sync-backup` demo 配置已经改为 WebDAV 配置、本地恢复、远程恢复和恢复范围；但通用 `settingsRecordsHtml` helper 仍保留“备份记录”模板，manifest / planning docs 仍写备份记录或 `BackupRecordRow`。 | 按当前 demo 口径改为 WebDAV 配置在前，本地恢复 / 远程恢复两个入口，点击后弹出备份数据选择；若保留历史记录组件，应标为历史/归档而不是 P0 页面结构。 |
| 隐私与权限的协议入口 | 多份规划仍写“协议入口”；用户已明确个人开源项目不需要法律协议。 | 删除用户协议/隐私协议口径；保留权限、隐私开关、清理数据、开源说明。 |
| 主 Tab 更多入口旧逻辑 | `render-runtime.js` 仍保留 Discover / RSS / Settings 更多入口反馈文案，但当前主 Tab 顶栏已不显示这些按钮。 | 删除不可达旧文案或迁入历史注释，避免后续误恢复。 |
| ` 2` 副本文档 | 已删除 | 正式审计只读取无 ` 2` 文件。 |

## 项目结构审计（Project Structure Audit）

### 当前结构问题（Current Structure Problems）

| 问题（Problem） | 影响（Impact） |
|---|---|
| `render-runtime.js` 仍承担页面模板和事件运行时 | 已从入口文件拆出；后续可继续按页面模块拆成薄适配器。 |
| `styles/*.css` 已拆分但仍按机械分层 | 已解除 `styles.css` 单体风险；后续可继续按组件语义重命名和归并。 |

### 建议目标结构（Suggested Target Structure）

```text
docs/ui-design/frontend-input/
├─ tokens.css
├─ design-tokens.json
├─ manifest.json
├─ contracts.d.ts
├─ shared-shell-kit/
├─ asset-library/
├─ component-library/
├─ frontend-demo-draft/
│  ├─ index.html
│  ├─ fixture.js
│  ├─ render.js
│  ├─ render-runtime.js
│  ├─ route-contract.js
│  ├─ styles.css
│  ├─ pages/
│  │  ├─ main-tabs.js
│  │  ├─ library.js
│  │  ├─ reader.js
│  │  ├─ settings.js
│  │  └─ source-management.js
│  ├─ styles/
│  │  ├─ 00-foundation.css
│  │  ├─ 01-shell-layout.css
│  │  ├─ 02-main-library.css
│  │  ├─ 03-reader.css
│  │  ├─ 04-settings-source.css
│  │  ├─ 05-flow-adaptive.css
│  │  └─ 06-responsive.css
│  └─ README.md
└─ audits/
```

说明：

- `shared-shell-kit` 只放 shell renderer 和 shell CSS。
- `asset-library` 只放图标、位图、素材说明。
- `component-library` 只放可复用组件规格和预览。
- `frontend-demo-draft` 只做可互动 demo；页面数据进入 `fixture.js`，页面模板按 workflow 拆分。
- ` 2` 副本已删除；后续不得重新把同名 Finder 副本提交为正式输入件。

## 优先处理顺序（Recommended Fix Order）

1. **修正过期页面口径（Remove Stale Page Model）**：同步备份记录模型、协议入口等过期规划继续按 demo 口径清理；缓存管理页已保留为独立正式页面，不再作为待确认删除项。
2. **修正 route 命名（Normalize Routes）**：处理 `reader-full-*`、`webdav-config`、`source-edit-debug`、`source-detect`。
3. **继续拆分 runtime 内部（Split Runtime Internals）**：按 `main-tabs / library / reader / settings / source-management` 拆 `render-runtime.js`。
4. **语义化 CSS chunks（Semantic CSS Chunks）**：在现有 7 个 chunk 基础上继续按 `tokens / shell / components / page` 归并散落 px。
5. **迁出硬编码 fixture（Move Hardcoded Data）**：书源管理、同步备份、设置页、弹窗文案迁入 fixture。
6. **补参数校验（Add Parameter Validation）**：校验 route 唯一、标题唯一或显式别名、无 ` 2` 正式输入、无过期页面、图标全部来自素材库。

## 当前不可宣称（Not Yet True）

- 不能说所有参数已经全局统一。
- 不能说 `render-runtime.js` 内部已经完成长期组件化。
- 不能说当前 `frontend-demo-draft` 可以直接作为长期工程结构。
- 不能说 `manifest`、`contracts`、planning docs 与当前 demo 完全一致。

当前可以宣称的是：

- 阅读核心参数已经有一批集中到 `fixture.js`。
- CSS 变量没有发现重复定义冲突。
- 当前 demo 的交互覆盖已经比较完整，入口文件已经完成结构化拆分。
- 正式源已收敛为无 ` 2` 路径；发现 / RSS / 设置深层链路闭合已经进入验证契约。
