# 本地 HTML 文件与文档要求（Local HTML File and Documentation Requirements）

本文定义 `docs/ui-design/**/frontend-input/*.html` 的文件角色、准入要求和相关文档写法。命名统一使用 `中文名称（English Name）` 格式。

## 重要边界（Important Boundary）

- 可见 UI 文案（Visible UI Text）：必须匹配 UI 设计图和文字稿，不为了双语格式把 App 内真实界面文字改成中英混排。
- 文件说明文案（Artifact Documentation Text）：HTML 标题、组件拆分页标题、README、组件规格、审计文档和路线图应使用 `中文名称（English Name）`。
- 文件名（File Name）：保持 `preview.html`、`state-matrix.html`、`components.html` 稳定，不为了双语格式重命名文件。
- 前端输入件（Frontend Input）：只认 manifest 管理的预览、状态矩阵、组件库预览、共享 Shell Kit、素材库预览和前端 demo 设计稿；历史临时 HTML 不作为输入件。

## 当前本地 HTML 清单（Current Local HTML Inventory）

| 中文名称（English Name） | 数量（Count） | 是否前端输入件（Frontend Input） | 说明（Notes） |
|---|---:|---|---|
| 页面预览页（Preview Page） | 30 | 是（Yes） | 每个页面一个 `preview.html`，展示默认或主要业务状态。 |
| 状态矩阵页（State Matrix Page） | 30 | 是（Yes） | 每个页面一个 `state-matrix.html`，覆盖关键状态、异常和变体。 |
| 组件拆分页（Component Reference Page） | 30 | 辅助输入（Reference Only） | 每个页面一个 `components.html`，用于拆分组件、复制结构和人工审计；默认不进入 manifest 截图目标。 |
| 组件库预览页（Component Library Preview Page） | 1 | 是（Yes） | `frontend-input/component-library/preview.html` 是公共组件库预览目标。 |
| 共享 Shell Kit 预览页（Shared Shell Kit Preview Page） | 1 | 是（Yes） | `frontend-input/shared-shell-kit/preview.html` 是五类 shell slot 结构预览目标。 |
| 素材库预览页（Asset Library Preview Page） | 1 | 是（Yes） | `frontend-input/asset-library/preview.html` 是 UI 设计图、封面和图标素材库预览目标。 |
| 前端 Demo 设计稿（Frontend Demo Draft Page） | 1 | 是（Yes） | `frontend-input/frontend-demo-draft/index.html` 是统一 shell 拼装的开发参考稿。 |
| 历史临时预览页（Legacy Preview Candidate） | 2 | 否（No） | `preview 2.html` 是历史临时文件，不进入 manifest，不作为真实前端输入件。 |
| 历史独立复刻页（Legacy Standalone Reproduction Page） | 3 | 否（No） | 早期独立 HTML 复刻页，仅作历史参考，不进入 manifest。 |
| 全部本地 HTML（All Local HTML） | 97 | 混合（Mixed） | 94 个 `frontend-input` 范围 HTML（87 个正式页面 HTML + 2 个历史临时预览页 + 4 个公共库/示例 HTML + 1 个人工审视 demo）+ 3 个历史独立复刻页。 |

## 页面组分布（Page Group Distribution）

| 中文名称（English Name） | 本地 HTML 数量（Local HTML Count） | 标准结构（Standard Structure） | 例外（Exceptions） |
|---|---:|---|---|
| 主标签页（Main Tabs） | 15 | 4 页 x `preview.html / state-matrix.html / components.html` | `书架/frontend-input/preview 2.html`、`bookshelf-cover-mode.html`、`frontend-demo/index.html` 为历史参考。 |
| 书架链路（Library Flow） | 24 | 8 页 x `preview.html / state-matrix.html / components.html` | 无（None）。 |
| 阅读链路（Reader Flow） | 35 | 11 页 x `preview.html / state-matrix.html / components.html` | `阅读控制层/frontend-input/preview 2.html`、`reader-control-layer.html` 为历史参考。 |
| 设置链路（Settings Flow） | 21 | 7 页 x `preview.html / state-matrix.html / components.html` | 无（None）。 |
| 公共组件库（Component Library） | 1 | `component-library/preview.html` | 无（None）。 |
| 共享 Shell Kit（Shared Shell Kit） | 1 | `shared-shell-kit/preview.html` | 无（None）。 |
| 公共素材库（Asset Library） | 1 | `asset-library/preview.html` | 无（None）。 |
| 前端 Demo 设计稿（Frontend Demo Draft） | 1 | `frontend-demo-draft/index.html` | 无（None）。 |

## HTML 文件角色（HTML File Roles）

### 页面预览页（Preview Page）

文件名（File Name）：`preview.html`

必须满足（Must Have）：

- 引入本页 `components.css`、`fixture.js`、`render.js`。
- 如果页面已迁入共享 shell kit，必须先引入对应 kit，例如 `shared-main-tab-kit/kit.js` 或 `shared-settings-kit/kit.js`。
- 只渲染一个主要页面画布，并保持 manifest 中的目标尺寸。
- 可见 UI 文案必须忠于设计图，不为了文档双语格式改界面文字。
- 必须进入 `manifest.json`，并由 `validate-frontend-inputs.js` 复验。

### 状态矩阵页（State Matrix Page）

文件名（File Name）：`state-matrix.html`

必须满足（Must Have）：

- 覆盖默认态、加载态、空态、错误态、权限态或模块展开态中与该页面相关的状态。
- 状态标题可以使用 `中文名称（English Name）`，但状态卡内部真实 UI 仍保持设计文案。
- 每个状态卡必须复用同一 renderer 和同一 shell，不得复制另一个临时页面。
- 必须进入 `manifest.json`，并声明 `stateModel.expectedStateCards`。

### 组件拆分页（Component Reference Page）

文件名（File Name）：`components.html`

必须满足（Must Have）：

- 用于展示组件拆分，不等同完整前端页面。
- 必须是独立 HTML 文档，包含 `<!doctype html>`、`html`、`head`、`body` 和本页 `components.css` 引用。
- 组件标题、注释和分组名使用 `中文名称（English Name）`。
- 可直接打开，不应有控制台错误或资源请求失败。
- 如果组件来自共享 shell 或公共组件库，应写明来源，例如 `主导航（MainNav）`、`设置行（SettingRow）`。
- 不默认进入 `manifest.json`；需要截图验收时再新增 manifest target。

### 组件库预览页（Component Library Preview Page）

文件名（File Name）：`frontend-input/component-library/preview.html`

必须满足（Must Have）：

- 展示公共组件库（Component Library）的可复用组件和状态。
- 组件命名使用 `中文名称（English Name）`。
- 必须进入 `manifest.json`，并校验 `expectedDomCount`。

### 素材库预览页（Asset Library Preview Page）

文件名（File Name）：`frontend-input/asset-library/preview.html`

必须满足（Must Have）：

- 展示 UI 设计图（UI Design Screens）、书籍封面素材（Book Cover Assets）和图标素材（Icon Assets）。
- 图标 token 必须来自 `asset-library/icons.js`，不得在页面中临时伪造。
- 必须进入 `manifest.json`，并校验 UI 图片加载、图标卡片数量和必需文案。

### 历史临时预览页（Legacy Preview Candidate）

文件名（File Name）：`preview 2.html`

处理规则（Handling Rule）：

- 不进入 `manifest.json`。
- 不作为前端输入件、组件拆分依据或截图验收依据。
- 后续清理时单独确认是否删除；未确认前只作为历史参考保留。

### 历史独立复刻页（Legacy Standalone Reproduction Page）

文件名（File Name）：`bookshelf-cover-mode.html`、`frontend-demo/index.html`、`reader-control-layer.html`

处理规则（Handling Rule）：

- 不进入 `manifest.json`。
- 不作为当前阶段的正式前端输入件。
- 只用于追溯早期本地复刻结果；后续删除或迁移必须单独确认。

## 相关文档要求（Related Documentation Requirements）

### 页面 README（Page README）

每个页面 `README.md` 应至少包含：

- 页面定位（Page Role）：说明页面属于哪条链路和哪个 shell。
- 本地 HTML 文件（Local HTML Files）：列出 `preview.html`、`state-matrix.html`、`components.html` 的用途。
- 复用组件（Reused Components）：使用 `中文名称（English Name）`。
- 新增组件（New Components）：使用 `中文名称（English Name）`。
- 不组件化内容（Non-componentized Content）：说明哪些业务内容只作为页面内容渲染。
- 验收要求（Acceptance Requirements）：说明尺寸、状态、图片、控制台错误和 manifest 校验。

### 页面组件规格（Page Component Spec）

每个页面 `COMPONENT_SPEC.md` 应至少包含：

- 属性（Props）：只描述数据输入，不描述截图切片。
- 状态（States）：列出默认、加载、空、错误、权限或模块状态。
- 事件（Events）：列出前端需要接出的交互事件。
- 组件边界（Component Boundary）：明确哪些是框架、哪些是组件、哪些是页面内容。
- 验收要求（Acceptance）：使用 `中文名称（English Name）` 命名关键组件和状态。

### 全局架构文档（Global Architecture Docs）

全局文档必须保持一致：

- 框架与组件路线图（Framework and Component Roadmap）：`FRAMEWORK_COMPONENT_ROADMAP.md`
- 页面框架归一架构（Page Framework Architecture）：`PAGE_FRAMEWORK_ARCHITECTURE.md`
- 页面框架使用审计（Page Framework Audit）：`PAGE_FRAMEWORK_AUDIT.md`
- 公共组件库（Component Library）：`component-library/COMPONENT_LIBRARY.md`
- 公共素材库（Asset Library）：`asset-library/ASSET_LIBRARY.md`
- 转换优先级（Conversion Priority）：`component-library/CONVERSION_PRIORITY.md`
- 本地 HTML 文件与文档要求（Local HTML File and Documentation Requirements）：本文

## 准入规则（Acceptance Rules）

新增或重构任何本地 HTML 时必须满足：

1. 页面预览页（Preview Page）和状态矩阵页（State Matrix Page）必须进入 `manifest.json`。
2. 组件拆分页（Component Reference Page）必须可直接打开，不能有控制台错误或资源请求失败。
3. 文件说明、组件标题和文档条目必须使用 `中文名称（English Name）`。
4. 可见 App UI 文案必须忠于设计图，不强制双语。
5. 同一页面不得出现多个互相竞争的正式预览页；`preview 2.html` 这类临时文件不得作为输入件。
6. 共享 shell 已存在时，HTML 必须先加载共享 kit，再加载 fixture 和 renderer。
7. 页面文档必须说明使用哪个页面框架（Page Shell）和哪些组件类别。
8. manifest 正式目标集合必须保持 62 个目标：29 个页面预览、29 个状态矩阵和 4 个公共库/示例目标；不得加入 `preview 2.html` 或 `components.html`。

## 验证要求（Validation Requirements）

- 全量渲染验证（Full Render Validation）：运行 `validate-frontend-inputs.js`，覆盖 manifest 中的 preview、state matrix、组件库、共享 Shell Kit、素材库和前端 demo 设计稿。
- 组件参考烟测（Component Reference Smoke Test）：`validate-frontend-inputs.js` 批量打开 29 个 `components.html`，确认它们是独立 HTML 文档、无 console error、无 failed request、无缺失图片。
- 文档一致性检查（Documentation Consistency Check）：检查 README、COMPONENT_SPEC、路线图和架构文档是否使用一致的 `中文名称（English Name）`。
- 例外清单检查（Exception List Check）：确认 `preview 2.html` 不在 manifest 中，也没有被文档标记为正式输入件。
- 本地 HTML 库存检查（Local HTML Inventory Check）：运行 `FrontendInputHtmlInventoryTest`，确认 97 个本地 HTML、94 个 `frontend-input` 范围 HTML、29 个预览页、29 个状态矩阵、29 个组件参考页、2 个 `preview 2.html`、4 个公共库/示例页、1 个人工审视 demo 和 3 个历史独立复刻页的角色分类一致。
- Manifest 目标集合检查（Manifest Target Set Check）：运行 `FrontendInputComposeCoverageTest`，确认 manifest 只包含正式页面预览、状态矩阵和公共库/示例目标，并且每个 target 的 `shellName/pageRole/slots` 与正式 shell taxonomy 完全一致。
- 验证报告同步检查（Validation Report Sync Check）：运行 `FrontendInputComposeCoverageTest`，确认 `frontend-input-design-draft-validation.json` 已通过、无失败数组，并且报告中的 62 个正式目标和 29 个组件参考页与当前 manifest/UI 设计图目录一致。
