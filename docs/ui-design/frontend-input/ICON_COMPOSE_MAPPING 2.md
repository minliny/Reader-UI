# 图标到 Compose 映射清单（Icon to Compose Mapping）

本文把本地素材库图标 token 和当前 Android Compose 中直接使用的 Material Icons 做一次收敛清单。目标是后续真实前端实现时统一使用语义 token，而不是在页面内临时挑选图标。

## 当前规模（Current Scale）

| 项目（Item） | 数量（Count） | 说明（Notes） |
| --- | ---: | --- |
| 本地素材库图标 token（Local Icon Tokens） | 71 | 来自 `docs/ui-design/frontend-input/asset-library/icons.js` 的 `ReaderAssetIcons.icons`。 |
| Compose 语义 token 映射（Compose Semantic Token Mapping） | 32 | `ReaderIconToken` 已覆盖主导航、书架、发现、RSS、设置二级页、书源链路、共享状态组件和阅读控制层。 |
| Legacy 直连 Material 图标（Legacy Direct Material Icons） | 历史原型保留 | `ui/stitch/*` prototype 暂保留直接 Material Icons，不作为最终组件来源。 |
| Figma 缺源图标（Missing Figma Source Assets） | 19 | 见 `ICON_LIBRARY_AUDIT.md`；缺源图标不得直接进入最终 Figma 主组件。 |

## 使用规则（Usage Rules）

- 真实前端实现应优先使用语义 token：`bookshelf`、`discover`、`rss`、`settings`、`search`、`more` 等。
- Compose 可以继续使用 Material Icons 作为渲染载体，但必须通过统一映射层表达语义，不应在页面内直接散落 `Icons.Filled.*`。
- 如果 Material icon 没有本地语义 token，先在素材库补 token 或记录缺口，不在页面里临时画。
- 图标选中态、按下态只改变容器、图标颜色和文字颜色，不改变尺寸、间距和相对位置。
- 可点击图标命中区不小于 `48 x 48 dp`。

## 主导航图标（Main Navigation Icons）

| 主导航（Main Nav） | 目标 token（Target Token） | 当前 Compose 图标（Current Compose Icon） | 处理（Action） |
| --- | --- | --- | --- |
| 书架 | `bookshelf` | `MenuBook` | 已通过 `ReaderIconToken.Bookshelf` 统一。 |
| 发现 | `discover` | `Explore` | 已通过 `ReaderIconToken.Discover` 统一。 |
| RSS | `rss` | `RssFeed` | 已通过 `ReaderIconToken.Rss` 统一。 |
| 设置 | `settings` | `Settings` | 已通过 `ReaderIconToken.Settings` 统一，不再用 `Person`。 |

## Material 到本地 token 映射（Material to Local Token Mapping）

| Material Icon | 建议 token（Suggested Token） | 状态（Status） | 说明（Notes） |
| --- | --- | --- | --- |
| `Add` | `add` | 可映射 | Figma 当前标为缺源；Compose 可先走语义 token。 |
| `ArrowBack` | `back` | 可映射 | 返回入口。 |
| `ArrowDropDown` | `chevron` | 需方向规则 | 下拉箭头可用 `chevron` 旋转或补 `chevron-down`。 |
| `AutoMode` | `auto-page` | 可映射 | 自动翻页。 |
| `Book` | `book` / `bookshelf` | 需按上下文 | 书籍对象用 `book`，主导航书架用 `bookshelf`。 |
| `Bookmark` | `bookmark` | 可映射 | 书签。 |
| `BrightnessAuto` | `sun` | 需确认 | 自动亮度没有独立 token；可先映射到亮度/日间语义，后续可补 `brightness-auto`。 |
| `ChevronLeft` | `back` / `chevron` | 需按上下文 | 返回用 `back`；翻页方向用 `chevron` 旋转或补方向 token。 |
| `ChevronRight` | `chevron` | 可映射 | 进入详情或右向翻页。 |
| `Close` | `close` | 可映射 | 关闭、清除面板。 |
| `CloudOff` | `offline` | 可映射 | 离线状态。 |
| `DarkMode` | `night-mode` | 已映射 | 阅读控制层夜间模式通过 `ReaderIconToken.NightMode` 表达；素材库缺源状态仍按 `ICON_LIBRARY_AUDIT.md` 回流。 |
| `Delete` | `trash` | 可映射 | 删除、移除。 |
| `Edit` | `edit` | 可映射 | Figma 当前标为缺源；Compose 可先走语义 token。 |
| `ErrorOutline` | `warning` | 可映射 | 错误或警告状态。 |
| `Explore` | `discover` | 可映射 | 发现。 |
| `FileOpen` | `file` | 可映射 | 文件选择或导入。 |
| `Folder` | `folder` | 可映射 | 文件夹导入。 |
| `FolderOff` | `folder-off` | 已映射 | 空文件夹或无文件状态通过 `ReaderIconToken.FolderOff` 表达；素材库缺源状态仍按 `ICON_LIBRARY_AUDIT.md` 回流。 |
| `GridView` | `grid` | 可映射 | 宫格视图。 |
| `Hub` | `source-stack` | 需降级为设置二级入口 | 书源不再作为主 tab。 |
| `Lock` | `shield` | 可映射 | 权限、隐私保护。 |
| `MenuBook` | `directory` / `book-open` | 需按上下文 | 目录用 `directory`，打开书籍用 `book-open`。 |
| `MoreVert` | `more` | 可映射 | 更多操作。 |
| `MyLocation` | `current-location` | 已映射 | 当前章节、定位或当前项通过 `ReaderIconToken.CurrentLocation` 表达；素材库缺源状态仍按 `ICON_LIBRARY_AUDIT.md` 回流。 |
| `Person` | `people` / 待移除 | 需产品确认 | 主 tab 不再使用 `我的`；作者/用户语义需另定。 |
| `PlayArrow` | `play` | 可映射 | 播放、朗读开始。 |
| `RecordVoiceOver` | `tts` | 可映射 | 朗读。 |
| `Refresh` | `refresh` | 可映射 | 刷新。 |
| `Search` | `search` | 可映射 | 搜索。 |
| `Settings` | `settings` / `gear` | 可映射 | 设置主入口用 `settings`，齿轮操作可用 `gear`。 |
| `Stop` | 待补 `stop` | 缺口 | 停止自动翻页或朗读。 |
| `SwapHoriz` | `replace` / `source` | 需按上下文 | 内容替换用 `replace`，换源用 `source`。 |
| `TextFormat` | `typo` | 可映射 | 字体、排版。 |
| `Tune` | `appearance` | 可映射 | 界面/显示调整。 |
| `ViewList` | `list` | 可映射 | 列表视图。 |
| `VolumeUp` | `volume` | 可映射 | 声音、音量。 |

## 需要回流素材库的缺口（Asset Backflow Gaps）

| 建议 token（Suggested Token） | 用途（Usage） | 来源（Current Trigger） |
| --- | --- | --- |
| `stop` | 停止自动翻页或停止朗读 | `Stop`。 |
| `night-mode` | 夜间模式切换 | Compose 已有 `ReaderIconToken.NightMode`，Figma 源图标状态仍需回流审计。 |
| `folder-off` | 文件夹空态或不可用 | Compose 已有 `ReaderIconToken.FolderOff`，Figma 源图标状态仍需回流审计。 |
| `current-location` | 当前章节定位、当前位置 | Compose 已有 `ReaderIconToken.CurrentLocation`，Figma 源图标状态仍需回流审计。 |
| `chevron-left` | 左向翻页或返回以外的左向动作 | Compose 已有 `ReaderIconToken.ChevronLeft`，Figma 可复用旋转规则或补方向 variant。 |

## 代码落点（Code Targets）

| 文件组（File Group） | 当前情况（Current State） | 后续动作（Next Action） |
| --- | --- | --- |
| `AppNavigation.kt` | `AppScreen` 已持有 `ReaderIconToken`，并通过 `asImageVector()` 暴露兼容图标。 | 后续禁止主 tab 直接新增 `ImageVector` 字段。 |
| `ReaderRouteHost.kt` | 底栏读取 `appScreens`，图标从 `ReaderIconToken` 解析，并由 `ReaderMainTabShell` 输出统一主导航。 | 后续主 tab 只能扩展 `ReaderMainTabShell`，不再恢复临时 `StitchBottomNav`。 |
| `ui/components/*` | 顶栏返回、搜索、设置下拉、状态组件和 reader setting chevron 已接入 `ReaderIconToken`。 | 后续新增共享组件不得直接 import Material Icons。 |
| `ui/bookshelf/*` | 书架布局切换、搜索 FAB 和更多操作已接入 `ReaderIconToken`。 | 后续书架操作继续从 token 扩展。 |
| `ui/reader/components/*` | 阅读顶部栏、亮度条、快捷操作、页内翻页、底栏、目录指示和清除按钮已接入 `ReaderIconToken`。 | 后续新增阅读控制图标必须先扩展 token。 |
| `ui/stitch/*` | 原型代码大量直接引用 Material Icons。 | 保留为历史参考，不作为最终图标规则来源。 |
| `ui/booksource/*`、`ui/settings/*`、`ui/discover/*` | 顶栏更多、导入、删除、文件导入、RSS 入口已接入 `ReaderIconToken`。 | 后续按页面新增 token，不再页面内直连 Material Icons。 |

## 建议实现形态（Suggested Implementation Shape）

当前已经建立 `ReaderIconToken` 和 `asImageVector()`，主导航已接入。真实实现可以继续保留 Material `ImageVector` 作为渲染载体，但必须通过统一函数完成映射：

```kotlin
fun ReaderIconToken.asImageVector(): ImageVector = when (this) {
    ReaderIconToken.Bookshelf -> Icons.AutoMirrored.Filled.MenuBook
    ReaderIconToken.Discover -> Icons.Filled.Explore
    ReaderIconToken.Rss -> Icons.Filled.RssFeed
    ReaderIconToken.Settings -> Icons.Filled.Settings
    ReaderIconToken.Search -> Icons.Filled.Search
    ReaderIconToken.More -> Icons.Filled.MoreVert
    ReaderIconToken.Back -> Icons.AutoMirrored.Filled.ArrowBack
    ReaderIconToken.Chevron -> Icons.Filled.ChevronRight
    ReaderIconToken.ChevronDown -> Icons.Filled.ArrowDropDown
    ReaderIconToken.ViewList -> Icons.AutoMirrored.Filled.ViewList
    ReaderIconToken.Grid -> Icons.Filled.GridView
    ReaderIconToken.Add -> Icons.Filled.Add
    ReaderIconToken.Delete -> Icons.Filled.Delete
    ReaderIconToken.FileOpen -> Icons.Filled.FileOpen
    ReaderIconToken.FolderOff -> Icons.Filled.FolderOff
    ReaderIconToken.Warning -> Icons.Filled.ErrorOutline
    ReaderIconToken.Offline -> Icons.Filled.CloudOff
    ReaderIconToken.Permission -> Icons.Filled.Lock
    ReaderIconToken.Directory -> Icons.AutoMirrored.Filled.MenuBook
    ReaderIconToken.Refresh -> Icons.Filled.Refresh
    ReaderIconToken.SourceSwitch -> Icons.Filled.SwapHoriz
    ReaderIconToken.AutoBrightness -> Icons.Filled.BrightnessAuto
    ReaderIconToken.ChevronLeft -> Icons.Filled.ChevronLeft
    ReaderIconToken.AutoScroll -> Icons.Filled.AutoMode
    ReaderIconToken.ContentReplace -> Icons.Filled.SwapHoriz
    ReaderIconToken.NightMode -> Icons.Filled.DarkMode
    ReaderIconToken.Tts -> Icons.Filled.RecordVoiceOver
    ReaderIconToken.Appearance -> Icons.Filled.Tune
    ReaderIconToken.ReadingSettings -> Icons.Filled.Settings
    ReaderIconToken.Bookmark -> Icons.Filled.Bookmark
    ReaderIconToken.CurrentLocation -> Icons.Filled.MyLocation
    ReaderIconToken.Close -> Icons.Filled.Close
}
```

上面代码表达当前已落地的 Compose token。后续新增 token 必须先进入本清单和素材库审计，再补充映射。

## 验收标准（Acceptance Criteria）

- 新增页面不得直接新增散落的 `Icons.Filled.*` 使用点。
- 主导航、阅读模块导航、设置入口必须用语义 token。
- 没有本地 token 的 Material icon 必须先进入“需要补 token 的缺口”。
- Figma 缺源图标仍按 `ICON_LIBRARY_AUDIT.md` 处理，不因为 Compose 有 Material icon 就视为 Figma 已完成。
