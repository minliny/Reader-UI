# UI 图标素材库全量梳理（UI Icon Asset Library Audit）

## 当前 Figma 结构（Current Figma Structure）

- 图标素材库页面（Icon asset page）：`04_Icon_Library_图标素材库`
- 已确认组件区（Confirmed component area）：`Icon Library / Confirmed Components（已确认组件）`
- 组件命名规则（Component naming rule）：`Icon/<semantic-name>`
- 当前已确认图标组件（Confirmed icon components）：79
- 已覆盖本地语义（Covered local semantics）：79 / 81
- 本地待同步 Figma 语义（Pending Figma semantics）：`signal`、`wifi`
- 待补源素材（Missing source assets）：0
- 开源图标来源（Open-source icon source）：`lucide-static@1.21.0`，许可证 `ISC`。

## 已确认规则（Confirmed Rules）

- 页面只能引用 `Icon/*` 主组件或其实例（Screens may only reference `Icon/*` master components or instances）。
- 缺源图标只能进入待补清单；当前缺源清单已通过开源 Lucide 图标补齐（Missing-source icons stay in the missing list; the current missing list is now resolved with open-source Lucide icons）。
- 不允许在页面内临时手画 SVG、Vector 或文本符号来冒充图标（No one-off SVG, Vector, or text-symbol icons in final screens）。
- 可点击图标必须放入 `IconButton` 或等价 hit area，命中区不小于 `48 x 48 dp`（Clickable icons require at least a `48 x 48 dp` hit area）。
- selected / pressed 状态只改变容器、图标颜色和文字颜色，不改变尺寸和相对位置（Selected / pressed states must not move or resize controls）。

## 已补源素材（Resolved Source Assets）

以下原缺源语义已经在 Figma 图标库中补为 `Icon/*` 主组件。补源方式不是手绘 SVG，而是从 `lucide-static@1.21.0` 的开源 SVG 映射到本地语义 token。

| Semantic ID | 中文用途（Chinese Usage） | English Usage | Figma 状态（Figma Status） |
| --- | --- | --- | --- |
| `Icon/add` | 新增 | add | resolved with Lucide |
| `Icon/badge` | 标记 | badge | resolved with Lucide |
| `Icon/battery` | 电池优化 | battery | resolved with Lucide |
| `Icon/bell` | 通知 | notification | resolved with Lucide |
| `Icon/bug` | 崩溃日志 | bug / crash log | resolved with Lucide |
| `Icon/columns` | 列数 | columns | resolved with Lucide |
| `Icon/download` | 下载 / 恢复 | download / restore | resolved with Lucide |
| `Icon/edit` | 编辑 | edit | resolved with Lucide |
| `Icon/eyeOff` | 隐私隐藏 | privacy hidden | resolved with Lucide |
| `Icon/home` | 启动页 | home / start page | resolved with Lucide |
| `Icon/image` | 封面缓存 | image / cover cache | resolved with Lucide |
| `Icon/link` | 开源许可 / 链接 | link | resolved with Lucide |
| `Icon/log` | 日志 | log | resolved with Lucide |
| `Icon/message` | 反馈 | message / feedback | resolved with Lucide |
| `Icon/motion` | 动画效果 | motion | resolved with Lucide |
| `Icon/palette` | 主题 / 外观 | palette / theme | resolved with Lucide |
| `Icon/people` | 合并作者 | people / authors | resolved with Lucide |
| `Icon/top` | 返回顶部 / 顶部行为 | top | resolved with Lucide |
| `Icon/upload` | 导出 / 上传 | upload / export | resolved with Lucide |

## 页面引用审计（Page Usage Audit）

| 页面（Page） | English | 当前状态（Current State） | 后续动作（Next Action） |
| --- | --- | --- | --- |
| `10_Screens_MainTabShell_主标签页` | MainTabShell | 大量使用 `Icon/*` 实例；仍有少量小号普通 `Icon` frame。 | 将普通 `Icon` frame 替换为 `Icon/*` 实例或明确为非图标容器。 |
| `11_Screens_LibraryShell_书架链路` | LibraryShell | 返回、搜索、章节入口已使用 `Icon/*` 实例。 | 继续保持实例引用。 |
| `12_Screens_ReaderShell_阅读链路` | ReaderShell | 自动翻页、内容搜索、内容替换、沉浸阅读已改用 `ReaderShellKit` / `ReaderAssetIcons` 语义图标；补齐 `clear`、`offline`、`sparkle` 等本地 token。 | 后续同步到 Figma `Icon/*` 主组件，不在页面内新增文本符号图标。 |
| `19_Audit_ReaderControl_阅读控制层` | Reader Control Audit | 52 个 `Icon/*` 实例，结构可追溯。 | 后续同步到最终 ReaderShell 屏幕。 |
| `15_Screens_ForestUtility_森林工具流` | ForestUtility | 当前未检测到 `Icon/*` 实例。 | 后续工具流补图标时必须从 `04_Icon_Library_图标素材库` 引用。 |

## 验收标准（Acceptance Criteria）

- Figma 图标组件无重名（No duplicate `Icon/*` master components）。
- 页面内不得出现伪装成 `Icon/*` 的普通图层（No normal layer named like an icon component）。
- 缺源图标不能进入最终屏幕；当前 Figma 图标库已无缺源语义（Missing-source icons cannot enter final screens; the current Figma icon library has no missing-source semantics）。
- 前端 Demo 只从 `04_Icon_Library_图标素材库` 取图标语义（Frontend demo uses the icon semantics from `04_Icon_Library_图标素材库`）。
- 状态栏图标也必须先进入本地素材库 token，再同步为 Figma `Icon/*` 主组件（Status bar icons must also be tokenized before Figma sync）。
