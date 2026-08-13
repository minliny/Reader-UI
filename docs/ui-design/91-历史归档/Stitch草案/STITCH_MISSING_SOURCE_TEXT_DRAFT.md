# Stitch 缺失 Source 图片文字草案

状态：`DRAFT / PENDING_HUMAN_REVIEW / NOT_DESIGN_AUTHORITY`

本文为16个 `NEED_NEW_SOURCE` 或 `NEED_NEW_SOURCE_CONFIRMED` 页面提供补图文字说明。
> 状态更正（2026-06-12）：本文件基于已被推翻的 source-gap 判断生成，
> 仅保留为历史文字草稿，不再表示需要补图。当前逐项复核以
> `STITCH_MISSING_CURRENT_SOURCE_PAGES.md` 为准；真实缺少图片的页面为 0。

本文不创建图片、不批准布局，也不将页面设为 `usable=true`。

## 通用验收约束

- 画布：`390 x 884` 手机竖屏。
- 主题：暖白 Light。
- 每张图片只表达一个明确页面和状态，不得使用流程图或多屏拼图。
- 图片必须遵循对应页面规格和交互规格。
- 必须记录 `sourcePath`、文件大小、SHA256、目标页面、主题和生成/截取日期。
- 新图片在获得明确的 SHA256 绑定人工视觉 PASS 前，必须保持
  `humanReviewResult=PENDING`、`usable=false`。

## 页面文字稿


### `16-4-reader-toc-quick-panel`

- 页面目标：展示阅读控制层内部的目录快捷模块。
- 主要区域：当前章节上下文、紧凑章节列表、目录/书签切换、回到当前操作，以及位置不变的底部模块导航和亮度条。
- 要求状态：目录标签已选中，当前章节可见。
- 关键约束：只替换左侧主内容区，不得变成独立目录页或全高底部弹层。
- 相关规格：`toc.md`、`READER_CONTROL_LAYER_SPEC.md`、`READER_CONTROL_ACTION_FLOWS.md`。

### `16-5-reader-toc-quick-panel-height-aligned`

- 页面目标：展示高度与标准控制面板对齐的目录快捷模块。
- 区域和行为：与 `16-4` 相同，但内容必须适配标准控制层几何尺寸。
- 要求状态：当前章节行和 `完整目录` 入口均可见，且不得压缩模块导航或亮度条。
- 关键约束：不得增加屏幕底部进度线，不得引起正文重排。
- 相关规格：`toc.md`、`READER_CONTROL_GEOMETRY_SPEC.md`。

### `18-1-read-aloud-quick-panel`

- 页面目标：展示阅读控制层内可读、可操作的 TTS 快捷模块。
- 主要区域：当前句预览、上一段/开始/下一段、位置控制，以及语速、音色、范围、定时的大尺寸入口。
- 要求状态：尚未开始朗读，可直接启动。
- 关键约束：不得显示段落数量，不得使用过小操作控件。
- 相关规格：`read-aloud.md`、`READER_CONTROL_LAYER_SPEC.md`。

### `18-2-read-aloud-quick-panel-revised`

- 页面目标：展示层级修正后的 TTS 快捷模块。
- 必须修正：移除段落数量强调；放大语速、音色、范围、定时入口；保留四个阅读模块按钮和亮度条。
- 要求状态：朗读停止，当前句可见，显示默认音色和 `1.0x` 语速。
- 相关规格：`read-aloud.md`、`READER_CONTROL_ACTION_FLOWS.md`。

### `18-3-read-aloud-quick-panel-height-aligned`

- 页面目标：展示与标准高度对齐的 TTS 快捷模块。
- 主要区域：当前句、播放控制、进度、两列快捷设置、试听操作。
- 要求状态：可开始朗读，所有快捷设置均位于固定左侧模块区内。
- 关键约束：面板尺寸和常驻控件必须符合标准阅读控制层几何规则。
- 相关规格：`read-aloud.md`、`READER_CONTROL_GEOMETRY_SPEC.md`。

### `21-1-reader-appearance-quick-panel`

- 页面目标：在阅读控制层内展示阅读外观快捷设置。
- 主要区域：字号、行距、主题、版式快捷入口，以及完整外观设置入口。
- 要求状态：显示当前值，不展示重置或危险操作确认。
- 关键约束：这是快捷模块，不是完整外观页；正文必须保留在不透明控制层后方且不移动。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`、
  `READER_CONTROL_ACTION_FLOWS.md`。

### `22-1-reader-settings-quick-panel`

- 页面目标：在阅读控制层内展示高频阅读设置。
- 主要区域：常用开关和选择项、当前值摘要、完整阅读设置入口。
- 要求状态：默认设置概览，显示当前值。
- 关键约束：不得复制完整设置层级，不得混入 App 全局设置。
- 相关规格：`reader-settings.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `22-2-reader-settings-quick-panel-height-aligned`

- 页面目标：展示与标准高度对齐的阅读设置快捷模块。
- 要求状态：功能范围与 `22-1` 一致，适配标准控制层几何尺寸且不缩小触控区域。
- 关键约束：保留模块导航和亮度条。
- 相关规格：`reader-settings.md`、`READER_CONTROL_GEOMETRY_SPEC.md`。

### `25-1-reader-top-more-menu`

- 页面目标：在当前阅读页上展示顶部栏更多菜单。
- 主要区域：锚定在右上操作下方的菜单、分组后的阅读专属命令、轻微暗化的阅读背景。
- 要求状态：菜单已打开。
- 关键约束：不得加入 App 全局设置、RSS、WebDAV、账户或书源管理命令。
- 相关规格：`reader-control-auxiliary.md`、`READER_CONTROL_ACTION_FLOWS.md`。

### `28-reader-appearance-main-panel`

- 页面目标：展示完整阅读外观设置页。
- 主要区域：页面标题、预览、字体、主题、版式、翻页动画、字体管理入口，以及规格要求的保存/重置操作。
- 要求状态：已加载现有设置值。
- 关键约束：使用完整设置页视觉语言，不得沿用阅读控制层面板几何。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `29-reader-appearance-font-selection`

- 页面目标：选择阅读字体。
- 主要区域：当前字体摘要、可用/系统/导入字体分组、示例文字、选中态、字体管理入口。
- 要求状态：一个当前字体已选中。
- 关键约束：不可用或缺失字体必须明确显示，不得在选中态中静默替换字体。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `30-reader-appearance-theme-selection`

- 页面目标：选择阅读主题。
- 主要区域：当前预览、暖色浅色预设、深色预设、自定义主题入口。
- 要求状态：一个主题已选中。
- 关键约束：默认方向为暖白 Light，不得复用已拒绝的51系列冷白风格。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `31-reader-appearance-theme-edit`

- 页面目标：编辑自定义阅读主题。
- 主要区域：页面色、文字色、强调色、实时预览、重置、取消、保存。
- 要求状态：正在编辑一个已有自定义主题。
- 关键约束：必须保证可读对比度，并清楚区分草稿修改与已保存值。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `32-reader-appearance-layout-advanced`

- 页面目标：编辑高级阅读版式。
- 主要区域：页边距、段间距、行高、对齐、缩进、分栏/分页行为、实时预览。
- 要求状态：已加载当前版式值。
- 关键约束：只有明确应用或保存后才影响阅读排版；设置页本身遵循标准设置页几何。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `33-reader-appearance-page-turn-animation`

- 页面目标：选择翻页行为。
- 主要区域：动画选项、减少动态/无动画选项、预览、保存。
- 要求状态：当前行为已选中。
- 关键约束：选项必须说明真实行为和无障碍影响，不得只依赖装饰缩略图。
- 相关规格：`reader-appearance.md`、`SETTINGS_PAGE_DESIGN_SPEC.md`。

### `41-discovery-default`

- 页面目标：展示当前发现首页，不使用已废弃的固定全局推荐布局。
- 主要区域：标题/搜索/更多、来源类型、当前来源、来源自有分类、内容模块、来源状态、四项主导航。
- 要求状态：`全部来源`，至少一个来源可用且内容已加载。
- 关键约束：分类必须跟随当前来源，不得虚构固定全局分类体系。
- 相关规格：`discovery.md`。

最终状态：`TEXT_DRAFT_ONLY / SOURCE_IMAGES_STILL_REQUIRED`
