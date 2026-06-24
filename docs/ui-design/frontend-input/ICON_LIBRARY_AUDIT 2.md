# UI 图标素材库全量梳理（UI Icon Asset Library Audit）

## 当前 Figma 结构（Current Figma Structure）

- 图标素材库页面（Icon asset page）：`04_Icon_Library_图标素材库`
- 已确认组件区（Confirmed component area）：`Icon Library / Confirmed Components（已确认组件）`
- 组件命名规则（Component naming rule）：`Icon/<semantic-name>`
- 当前已确认图标组件（Confirmed icon components）：65
- 已覆盖本地语义（Covered local semantics）：60 / 79
- 待补源素材（Missing source assets）：19

## 已确认规则（Confirmed Rules）

- 页面只能引用 `Icon/*` 主组件或其实例（Screens may only reference `Icon/*` master components or instances）。
- 缺源图标只能进入待补清单（Missing-source icons stay in the missing list）。
- 不允许在页面内临时手画 SVG、Vector 或文本符号来冒充图标（No one-off SVG, Vector, or text-symbol icons in final screens）。
- 可点击图标必须放入 `IconButton` 或等价 hit area，命中区不小于 `48 x 48 dp`（Clickable icons require at least a `48 x 48 dp` hit area）。
- selected / pressed 状态只改变容器、图标颜色和文字颜色，不改变尺寸和相对位置（Selected / pressed states must not move or resize controls）。

## 待补源素材（Missing Source Assets）

这些语义来自 fixture 或页面数据，但当前没有可靠本地 SVG 源，不能作为已完成图标使用。

| Semantic ID | 中文用途（Chinese Usage） | English Usage | 状态（Status） |
| --- | --- | --- | --- |
| `Icon/add` | 新增 | add | missing source |
| `Icon/badge` | 标记 | badge | missing source |
| `Icon/battery` | 电池优化 | battery | missing source |
| `Icon/bell` | 通知 | notification | missing source |
| `Icon/bug` | 崩溃日志 | bug / crash log | missing source |
| `Icon/columns` | 列数 | columns | missing source |
| `Icon/download` | 下载 / 恢复 | download / restore | missing source |
| `Icon/edit` | 编辑 | edit | missing source |
| `Icon/eyeOff` | 隐私隐藏 | privacy hidden | missing source |
| `Icon/home` | 启动页 | home / start page | missing source |
| `Icon/image` | 封面缓存 | image / cover cache | missing source |
| `Icon/link` | 开源许可 / 链接 | link | missing source |
| `Icon/log` | 日志 | log | missing source |
| `Icon/message` | 反馈 | message / feedback | missing source |
| `Icon/motion` | 动画效果 | motion | missing source |
| `Icon/palette` | 主题 / 外观 | palette / theme | missing source |
| `Icon/people` | 合并作者 | people / authors | missing source |
| `Icon/top` | 返回顶部 / 顶部行为 | top | missing source |
| `Icon/upload` | 导出 / 上传 | upload / export | missing source |

## 页面引用审计（Page Usage Audit）

| 页面（Page） | English | 当前状态（Current State） | 后续动作（Next Action） |
| --- | --- | --- | --- |
| `10_Screens_MainTabShell_主标签页` | MainTabShell | 大量使用 `Icon/*` 实例；仍有少量小号普通 `Icon` frame。 | 将普通 `Icon` frame 替换为 `Icon/*` 实例或明确为非图标容器。 |
| `11_Screens_LibraryShell_书架链路` | LibraryShell | 返回、搜索、章节入口已使用 `Icon/*` 实例。 | 继续保持实例引用。 |
| `12_Screens_ReaderShell_阅读链路` | ReaderShell | 自动翻页、内容搜索、内容替换、阅读入口、沉浸阅读已改用 `ReaderShellKit` / `ReaderAssetIcons` 语义图标；补齐 `clear`、`offline`、`sparkle` 等本地 token。 | 后续同步到 Figma `Icon/*` 主组件或缺源清单，不在页面内新增文本符号图标。 |
| `19_Audit_ReaderControl_阅读控制层` | Reader Control Audit | 52 个 `Icon/*` 实例，结构可追溯。 | 后续同步到最终 ReaderShell 屏幕。 |
| `15_Screens_ForestUtility_森林工具流` | ForestUtility | 当前未检测到 `Icon/*` 实例。 | 后续工具流补图标时必须从 `04_Icon_Library_图标素材库` 引用。 |

## 验收标准（Acceptance Criteria）

- Figma 图标组件无重名（No duplicate `Icon/*` master components）。
- 页面内不得出现伪装成 `Icon/*` 的普通图层（No normal layer named like an icon component）。
- 缺源图标不能进入最终屏幕（Missing-source icons cannot enter final screens）。
- 前端 Demo 只从 `04_Icon_Library_图标素材库` 取图标语义（Frontend demo uses the icon semantics from `04_Icon_Library_图标素材库`）。
