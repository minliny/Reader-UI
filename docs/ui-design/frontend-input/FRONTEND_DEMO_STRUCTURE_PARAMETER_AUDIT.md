# 前端 Demo 参数与项目结构审计（Frontend Demo Parameter and Structure Audit）

本文审计当前本地 `frontend-demo-draft`、`shared-shell-kit`、`asset-library`、`component-library`、`manifest`、规划文档和相关副本文件。目标是判断全局 UI / 组件 / 框架参数是否存在重复、冗余、错误命名，以及当前项目结构是否适合作为后续前端输入件。

## 审计结论（Audit Conclusion）

当前 demo 已经能承载主要交互和页面结构，但还没有达到“参数干净、结构唯一、命名稳定”的状态。

| 维度（Dimension） | 结论（Conclusion） | 严重度（Severity） |
|---|---|---|
| 项目结构（Project Structure） | 存在大量 ` 2` 副本目录和副本文档，正式源与历史副本混在同一层。 | 高 |
| CSS 参数（CSS Parameters） | CSS 变量没有重复定义冲突，但视觉尺寸大量散落在 `styles.css`，没有全部归入 token / component parameter / viewport class。 | 高 |
| 交互参数（Interaction Parameters） | 阅读排版、主题、字体、亮度、朗读、阅读设置已集中到 `fixture.js`，但仍有部分图标映射、设置项、书源管理数据、弹窗文案硬编码在 `render.js`。 | 中高 |
| 路由命名（Route Naming） | 有重复标题和语义不准确命名，例如 `webdav-config` 复用同步备份标题、`source-edit-debug` 与 `source-rule-edit` 同名、`reader-full-*` key 仍用 `full` 表示实际的大半屏展开面板。 | 中高 |
| 文档同步（Documentation Sync） | demo 已移除或改造的内容，在 manifest / contracts / planning docs 中仍保留旧口径，例如独立缓存管理页、同步备份记录模型、协议入口。 | 高 |
| Shell 分层（Shell Structure） | `shared-shell-kit` 相对清晰，但 demo 业务页仍把大量页面内容、组件生成、状态操作写在一个 `render.js`。 | 中高 |

## 关键证据（Key Evidence）

| 项目（Item） | 当前数量 / 现象（Current Evidence） | 说明（Notes） |
|---|---:|---|
| `frontend-demo-draft/render.js` | 4587 行 | 路由、页面模板、状态、事件绑定、硬编码内容混在一个文件。 |
| `frontend-demo-draft/styles.css` | 8606 行 | 视觉样式过大，组件分区不够清晰。 |
| CSS `px` 值 | 1819 次，116 个唯一值 | 不是全部错误，但说明大量尺寸仍是局部散值。 |
| CSS media query | 2 个 | 仅覆盖局部 demo / source-switch，不是完整自适应体系。 |
| CSS 自定义属性定义 | 130 个，未发现重复定义冲突 | 覆盖 `tokens.css`、demo CSS、shell kit CSS、asset CSS；命名冲突不是主问题，主问题是 token 覆盖范围不足。 |
| 顶层 ` 2` 副本 | 20 项 | 包括 `asset-library 2`、`component-library 2`、`frontend-demo-draft 2`、`shared-shell-kit 2`、`manifest 2.json`、`tokens 2.css` 等。 |
| route 数量 | 47 个 | demo 已超过原 29 页范围，包含书源管理子流程和阅读展开态。 |
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
| `render.js` 的 `readerQuickActionIconMap` | 快捷动作图标映射是 UI 参数，不是路由逻辑；当前放在渲染层。 | 迁到 `fixture.js` 的 `reader.quickActions[].icon`，并由素材库 token 校验。 |
| `render.js` 的书源管理列表、检测步骤、日志、源码示例 | 业务 fixture 混在页面 renderer 中。 | 拆到 `fixture.js` 的 `sourceManagement`、`sourceDetection`、`sourceDebug`。 |
| `render.js` 的设置页分组、WebDAV 表单、同步恢复选项 | 设置内容和表单数据硬编码在 renderer。 | 拆到 `fixture.js` 的 `settings.pages` 或独立 `settingsFixtures`。 |
| `render.js` 的弹窗文案和 toast 文案 | 交互状态文案分散，不利于统一检查。 | 建立 `dialogCopy` / `toastCopy` fixture，按 route 和 action 索引。 |
| `render.js` 的 fallback 默认值 | 有容错价值，但容易和 fixture 默认值漂移。 | 保留最小兜底，但需要注释为 runtime guard；业务默认值只允许在 fixture。 |
| `styles.css` 中大量尺寸散值 | 视觉参数未分层，无法判断哪些是 token、哪些是页面局部值。 | 先做尺寸清单：global token、shell token、component token、page-only value。 |

## 命名审计（Naming Audit）

| 名称（Name） | 当前问题（Current Problem） | 建议命名（Suggested Naming） |
|---|---|---|
| `reader-full-directory` / `reader-full-tts` / `reader-full-appearance` / `reader-full-settings` | 当前页面标题已经标明“大半屏控制窗”，但 route key 仍使用 `full`，容易被误读为真正全屏页。 | 若表示大半屏：`reader-expanded-*`；若表示全屏：必须真的全屏并复用详情目录页结构。 |
| `webdav-config` | route 独立但标题仍是“同步与备份”；当前渲染分支会把它映射回 `sync-backup`，同步页本身已经包含 WebDAV 配置。 | 如果保留 route，命名为 `sync-backup-webdav-section`；否则删除 route。 |
| `source-edit-debug` | 标题与 `source-rule-edit` 重复，语义像规则编辑又像调测。 | 拆为 `source-rule-debug-entry` 或删除并合并到 `source-debug`。 |
| `source-detect` | 当前实现更像检测结果页，但 route key 使用动作名，容易和“点击检测”动作混淆。 | 若是结果页：`source-detection-result`；若是动作：不应作为 route。 |
| `settings-general` 中“恢复默认” | 用户多次要求避免多余复杂操作；恢复默认是否仍需要全局存在未重新确认。 | 先标记为待审，不作为默认 P0。 |
| `CacheManagement` | 当前 demo 的 App 通用设置已有“缓存清理”行，但正式 manifest / contracts / planning docs 仍保留独立缓存管理页。 | 若最新口径确认删除独立页，应从正式页面、manifest、contracts、planning docs 中移除独立页面，保留 App 通用设置里的缓存清理行。 |

## 文档与 Demo 不一致（Documentation vs Demo Drift）

| 漂移项（Drift Item） | 当前证据（Evidence） | 应处理方式（Fix Direction） |
|---|---|---|
| 独立缓存管理页 | `manifest.json`、`contracts.d.ts`、`EVENT_CALLBACK_MAPPING.md`、`PAGE_RELATIONSHIP_MAP.md`、`FRONTEND_PAGE_PLANNING_CARDS.md` 仍保留 `cache-management` / `CacheManagement`；校验脚本当前也仍按 30 个正式页面检查。 | 先确认正式页面集是否从 30 页降为 29 页；若降级，需同步更新 manifest、contracts、validation 和 Compose 覆盖守卫，再把缓存清理归入 `settings-general` 一行。 |
| 同步与备份的备份记录 | 当前 `sync-backup` demo 配置已经改为 WebDAV 配置、本地恢复、远程恢复和恢复范围；但通用 `settingsRecordsHtml` helper 仍保留“备份记录”模板，manifest / planning docs 仍写备份记录或 `BackupRecordRow`。 | 按当前 demo 口径改为 WebDAV 配置在前，本地恢复 / 远程恢复两个入口，点击后弹出备份数据选择；若保留历史记录组件，应标为历史/归档而不是 P0 页面结构。 |
| 隐私与权限的协议入口 | 多份规划仍写“协议入口”；用户已明确个人开源项目不需要法律协议。 | 删除用户协议/隐私协议口径；保留权限、隐私开关、清理数据、开源说明。 |
| 主 Tab 更多入口旧逻辑 | `render.js` 仍保留 Discover / RSS / Settings 更多入口反馈文案，但当前主 Tab 顶栏已不显示这些按钮。 | 删除不可达旧文案或迁入历史注释，避免后续误恢复。 |
| ` 2` 副本文档 | 多个 ` 2` 文档仍包含旧页面数、旧图标数、旧 shell 口径。 | 统一归档或删除，正式审计只读取无 ` 2` 文件。 |

## 项目结构审计（Project Structure Audit）

### 当前结构问题（Current Structure Problems）

| 问题（Problem） | 影响（Impact） |
|---|---|
| 正式目录与 ` 2` 副本同级混放 | 容易误读、误改、误同步到 Figma 或 manifest。 |
| `frontend-demo-draft` 同时承担可互动 demo、页面设计稿、状态验证、Figma capture 源 | 职责过多，`render.js` 和 `styles.css` 持续膨胀。 |
| `render.js` 单文件包含 47 个 route 的模板和事件 | 修改一个页面容易影响全局事件和返回栈。 |
| `styles.css` 单文件承载所有页面视觉 | 无法清晰区分 token、shell、component、page override。 |
| `asset-library` 与 `asset-library 2` 并存 | 图标来源不唯一，后续“从素材库替换”会出现歧义。 |
| `component-library` 与 `component-library 2` 并存 | 公共组件库来源不唯一。 |
| `shared-shell-kit` 与 `shared-shell-kit 2` 并存 | Shell 实现来源不唯一。 |
| `manifest.json` 与 `manifest 2.json` 并存 | 正式输入件目标不唯一。 |

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
│  ├─ styles.css
│  ├─ pages/
│  │  ├─ main-tabs.js
│  │  ├─ library.js
│  │  ├─ reader.js
│  │  ├─ settings.js
│  │  └─ source-management.js
│  ├─ styles/
│  │  ├─ shell.css
│  │  ├─ reader.css
│  │  ├─ settings.css
│  │  ├─ library.css
│  │  └─ source-management.css
│  └─ README.md
└─ audits/
```

说明：

- `shared-shell-kit` 只放 shell renderer 和 shell CSS。
- `asset-library` 只放图标、位图、素材说明。
- `component-library` 只放可复用组件规格和预览。
- `frontend-demo-draft` 只做可互动 demo；页面数据进入 `fixture.js`，页面模板按 workflow 拆分。
- ` 2` 副本不得作为正式输入件；如需保留，移入 `archive/` 并从 manifest / validation 中排除。

## 优先处理顺序（Recommended Fix Order）

1. **冻结正式源（Freeze Source of Truth）**：确认无 ` 2` 的目录和文件为唯一正式源，` 2` 副本全部归档或删除。
2. **修正过期页面口径（Remove Stale Page Model）**：清理独立缓存管理页、同步备份记录模型、协议入口等过期规划；缓存页若从正式页面集中移除，必须同步更新 manifest、contracts、validation 和 Compose 覆盖守卫。
3. **修正 route 命名（Normalize Routes）**：处理 `reader-full-*`、`webdav-config`、`source-edit-debug`、`source-detect`。
4. **拆分 demo renderer（Split Renderer）**：按 `main-tabs / library / reader / settings / source-management` 拆 `render.js`。
5. **拆分 CSS（Split Styles）**：按 `tokens / shell / components / page` 分层，逐步减少散落 px。
6. **迁出硬编码 fixture（Move Hardcoded Data）**：书源管理、同步备份、设置页、弹窗文案迁入 fixture。
7. **补参数校验（Add Parameter Validation）**：校验 route 唯一、标题唯一或显式别名、无 ` 2` 正式输入、无过期页面、图标全部来自素材库。

## 当前不可宣称（Not Yet True）

- 不能说所有参数已经全局统一。
- 不能说项目结构已经干净。
- 不能说当前 `frontend-demo-draft` 可以直接作为长期工程结构。
- 不能说 `manifest`、`contracts`、planning docs 与当前 demo 完全一致。

当前可以宣称的是：

- 阅读核心参数已经有一批集中到 `fixture.js`。
- CSS 变量没有发现重复定义冲突。
- 当前 demo 的交互覆盖已经比较完整，但需要结构化拆分。
- 后续清理有明确优先级，先清源、再修过期规划、再拆代码和样式。
