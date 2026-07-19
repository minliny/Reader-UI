# 素材库清单（Asset Library Inventory）

## 当前纳入内容（Included Assets）

| 中文名称（English Name） | 数量（Count） | 说明（Notes） |
|---|---:|---|
| UI 设计图（UI Design Screens） | 30 | 当前 `UI设计图.png` 已按页面组进入 `fixture.json`。 |
| 书籍封面素材（Book Cover Assets） | 6 | 当前书架封面图已进入素材库。 |
| 静态使用图标语义（Static Used Semantics） | 111 | 从 `frontend-demo-optimized` 的 renderer、fixture 和 Shell 调用中扫描得出。 |
| 完整图标语义（All Semantic IDs） | 128 | 以 `tabler-icon-map.json` 为唯一语义映射。 |
| Tabler outline 源图（Outline Source SVGs） | 110 | 固定为 `@tabler/icons@3.44.0`，多个 Reader 语义允许复用同一上游图形。 |
| Tabler filled 源图（Filled Source SVGs） | 10 | 覆盖 11 个关键选中态语义；`settings` 被主 Tab 与阅读控制共同复用。 |
| 验证截图（Validation Screenshots） | 60 | 作为验证素材集合登记，不在预览页逐张加载。 |

## 图标来源（Icon Source）

- 唯一通用图标源：`@tabler/icons@3.44.0`。
- 许可证：MIT；完整文本位于 `icons/tabler/3.44.0/LICENSE.txt`。
- 上游版本、tarball 地址和 SHA-256 位于 `icons/tabler/3.44.0/SOURCE.json`。
- 语义到上游文件的映射位于 `tabler-icon-map.json`。
- `icons.js` 由 `tools/icons/generate-tabler-icon-registry.mjs` 生成，禁止手工编辑。
- 旧 PNG / potrace / 手绘 SVG 已移除，不再作为 Reader 专属图标来源。

## 状态资产（State Assets）

主 Tab 同时提供 outline / filled：

- `bookshelf` → `library`
- `discover` → `compass`
- `rss` → `file-rss`
- `settings` → `settings`

阅读控制同时提供 outline / filled：

- `reader-module-directory` → `list`
- `reader-module-tts` → `headphones`
- `reader-module-appearance` → `palette`
- `reader-module-settings` → `settings`
- `reader-auto-page` → `player-track-next`
- `reader-content-search` → `search`
- `reader-content-replace` → `replace`

## 准入规则（Acceptance Rules）

- 新增语义前先查询 `tabler-icon-map.json`；不得新增同义名称。
- 缺少图标时先固定 Tabler 上游名称、补入版本化源文件，再重新生成 `icons.js`。
- 页面不得手绘、描摹或临时内联同义 SVG。
- `renderIcon()` 遇到未知名称必须返回空字符串并报告错误，不得退化为 `warning`。
- outline 统一使用 Tabler 24×24 viewBox 与 1.75 stroke；Figma 主件为 48×48，对应 3.5 stroke。
- 颜色使用 `currentColor`；Figma 绑定 `color/runtime/ink`。
- 运行 `node tools/icons/verify-tabler-icon-registry.mjs` 必须得到 `staticGaps=0`。
- 素材库变更后必须重新生成并检查 `UI_RELEASE_MANIFEST.json`。

## 图标尺寸规划（Icon Size Plan）

| 使用位置（Usage） | CSS / Token | 外框尺寸（Frame Size） | 说明（Notes） |
|---|---|---:|---|
| 状态栏图标（Status Bar） | `fd-signal` / `fd-wifi` / `fd-battery` | 12–15 px | 只用于设计稿 QA。 |
| 小图标（Small Icon） | `fd-small-icon` | 20 px | 列表行、章节标识、行内动作。 |
| 常规图标（Regular Icon） | `fd-icon` / `fd-nav-icon` | 24 px | 顶栏、主导航、普通 IconButton。 |
| 阅读控制图标（Reader Control Icon） | `fd-reader-actions .fd-medium-icon` | 24 px | 使用 Reader 语义映射，不再维护专属描摹图。 |
| 中号图标（Medium Icon） | `fd-medium-icon` | 28 px | 卡片、状态块和非密集功能入口。 |
| 空状态图标（Empty / State Icon） | `fd-empty-icon` 等 | 36–44 px | 不进入工具栏，不与操作按钮混用。 |

## 裁切与占位规则（Crop and Placeholder Rules）

| 素材类型（Asset Type） | 裁切规则（Crop Rule） | 占位规则（Placeholder Rule） |
|---|---|---|
| 书架封面（Bookshelf Cover） | 默认 2:3；优先 contain 或 center crop，不能裁掉标题主体。 | 使用语义占位封面，显示书名首字或 `book-open`。 |
| 详情封面（Detail Cover） | 保持原始比例，不为了填满 Hero 拉伸。 | 使用同一封面占位策略，保留书名和作者文本。 |
| 搜索 / 列表小封面（List Cover） | 小尺寸优先 contain，允许留背景。 | 使用小封面占位，不影响列表行高度。 |
| 状态插图（State Illustration） | 不压缩主动作。 | 无图时使用状态图标、标题和主动作。 |
| UI 设计图（UI Screen） | 只作为源证据，不作为页面整屏背景。 | 缺失时页面不能进入完成状态。 |
| 图标（Icon） | 只使用语义 ID 与 Tabler 源图。 | 先补映射和源文件，再进入 renderer。 |
