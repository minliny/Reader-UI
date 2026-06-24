# 阅读器 UI 设计示意图

本目录保存当前已接受的 UI 方向示意图。

逐图实现文字稿统一收录在
[`../90-审计与索引/01-图片文字稿总册.md`](../90-审计与索引/01-图片文字稿总册.md)。该总册覆盖正式稿、
历史稿、废弃稿、备份图、拼图和 Stitch 初稿，并逐图记录文字/UI、风格、字号、比例、
尺寸、交互、跳转和动效。新增或移动图片后必须运行：

```bash
python3 scripts/audit_ui_image_text_specs.py
```

## 风格基线

- 主视觉方向：柔和卡片 + 分区式信息块
- 阅读页基线：适合长时间阅读的极简沉浸页
- 阅读覆盖层：作为图层叠加在已确认的阅读页之上，不重排正文
- 手机竖屏逻辑基准：`390×884`。高分辨率导出图按相对比例映射，不直接用导出像素反推全部 dp。

## 阅读控制层图片优先级

| 图片 | 职责 |
| --- | --- |
| `04-1-reader-control-layer-module-plan.svg` | 解释模块关系和结构规划 |
| `04-reader-controls.png` | 定义默认总控态包含哪些功能 |
| `04-2-reader-controls-opaque-icon-aligned.png` | 定义当前视觉、图标、尺寸和相对位置 |

模块派生图只负责对应模块的内容参考，不得反向覆盖 `04-2` 的顶部控制条、
底部 sheet 外壳、右侧亮度栏和底部模块导航。

## 平板阅读控制层设计稿说明

- 当前侧置悬浮阅读控制层以 `../04-阅读链路/阅读控制层/05-平板规格.md` 的专项规则和
  `../04-阅读链路/阅读控制层/03-几何规格.md` 的统一参数为准。
- `04-reader-controls.png` 和 `04-2-reader-controls-opaque-icon-aligned.png` 只作为
  平板控制面板的功能结构和视觉语言来源，不代表平板最终画布布局。
- `45-reader-controls-tablet-portrait.png` 和
  `45-1-reader-controls-tablet-landscape.png` 是收紧响应式规格之前生成的首版方向稿，
  仅用于记录右侧悬浮和左侧停靠的探索结果，不作为尺寸、位置或最终视觉依据。
- `45-2-reader-controls-side-portrait-tightened.png` 和
  `45-3-reader-controls-side-landscape-tightened.png` 因正文比例、错误底部进度、侧边
  锚点和横竖屏密度不一致而不采用，仅保留问题记录。
- `45-4-reader-controls-side-bottom-portrait.png` 和
  `45-5-reader-controls-side-bottom-landscape.png` 是统一正文网格前的中间候选，不作为
  当前几何依据。
- `45-9-reader-control-panel-master-390x343.png` 是侧置控制层唯一合成母版，导出尺寸
  `483×425px`，对应逻辑尺寸 `390×343`。横竖屏不得重新生成、拉伸或分别调整该图层。
- `45-10-reader-controls-side-portrait-fixed-ratio-final.png` 和
  `45-11-reader-controls-side-landscape-fixed-ratio-final.png` 直接复用同一个 `45-9`
  母版，仅改变外部锚点，是当前固定比例配对定稿。
- `45-6-reader-controls-side-bottom-portrait-geometry-v1.png` 和
  `45-8-reader-controls-side-bottom-landscape-ratio-final.png` 已由固定母版合成版本取代。
- `45-7-reader-controls-side-bottom-landscape-geometry-v1.png` 因横屏控制层长宽比例失衡
  而降级为历史候选，不作为定稿依据。
- 生成失败的平板 demo、低保真草图或未登记图片不得作为正式设计依据。
- 平板设计图不得反向修改手机端控制层的固定结构或图片优先级。

## 图片保存规则

- 已接受的主示意图不得被新生成图片覆盖。
- 为已有页面补充状态、标签页、菜单或弹窗时，使用派生编号命名：`原编号-序号-页面说明.png`。
- 示例：`16-1-toc-overlay-bookmark-tab.png` 表示 `16-toc-overlay.png` 的书签标签状态；`17-1-toc-full-bookmark-tab.png` 表示 `17-toc-full.png` 的书签标签状态。
- 派生图必须在本索引中单独登记，并在对应规格文档中说明它和主图的关系。
- 排查用临时图不进入正式索引，应放入 `_debug/` 或 `_contact_sheets/`，不得作为设计依据。

## 示意图索引

书架主 Tab 相关图片已迁出到
`docs/ui-design/03-书架链路/`，并以中文页面名重命名。本目录不再登记书架、书籍搜索、书籍详情的 Tab 专属候选图。

四个底部主标签页根页面的当前交付入口已整理到
`docs/ui-design/02-主标签页/`。其中 `41-1-discovery-source-category.png`、
`42-rss-home.png`、`43-settings-home.png` 已复制为中文命名的主标签页图片示例。
本目录中的原图保留为来源历史和通用草稿索引，不作为主标签页根页面包的入口。

| 文件 | 页面 |
| --- | --- |
| `03-reader-immersive.png` | 阅读沉浸页基线：正文 + 四角信息层 |
| `04-reader-controls.png` | 阅读控制层默认总控态功能基线 |
| `04-1-reader-control-layer-module-plan.svg` | 阅读控制层模块关系与结构规划图 |
| `04-2-reader-controls-opaque-icon-aligned.png` | 阅读控制层当前视觉、图标、尺寸和相对位置基线 |
| `08-content-search-overlay.png` | 阅读中内容搜索覆盖层 |
| `09-content-search-page.png` | 完整内容搜索页 |
| `10-auto-page-turn-setup-overlay.png` | 自动翻页设置覆盖层 |
| `11-auto-page-turn-running-capsule.png` | 自动翻页运行胶囊 |
| `12-auto-page-turn-settings.png` | 自动翻页设置页 |
| `13-replacement-quick-overlay.png` | 内容替换快捷覆盖层 |
| `14-replacement-rules.png` | 替换规则管理页 |
| `15-replacement-rule-edit.png` | 替换规则编辑页 |
| `16-toc-overlay.png` | 目录覆盖层 |
| `16-1-toc-overlay-bookmark-tab.png` | 目录覆盖层，书签标签状态 |
| `16-2-toc-overlay-search-state.png` | 目录覆盖层，搜索输入状态 |
| `16-3-toc-overlay-more-menu.png` | 目录覆盖层，三点菜单状态 |
| `16-4-reader-toc-quick-panel.png` | 阅读控制层，目录快捷模块，高度对齐前版本 |
| `16-5-reader-toc-quick-panel-height-aligned.png` | 阅读控制层目录模块内容参考；固定结构仍以 04-2 为准 |
| `16-6-reader-toc-quick-panel-04-2-standard.png` | 阅读控制层目录模块 04-2 标准候选 |
| `17-toc-full.png` | 完整目录页 |
| `17-1-toc-full-bookmark-tab.png` | 完整目录页，书签标签状态 |
| `18-read-aloud-overlay.png` | 朗读控制覆盖层 |
| `18-1-read-aloud-quick-panel.png` | 阅读控制层，朗读快捷模块上一版 |
| `18-2-read-aloud-quick-panel-revised.png` | 阅读控制层，朗读快捷模块高度对齐前版本 |
| `18-3-read-aloud-quick-panel-height-aligned.png` | 阅读控制层朗读模块内容参考；固定结构仍以 04-2 为准 |
| `18-4-read-aloud-quick-panel-04-2-standard.png` | 阅读控制层朗读模块 04-2 标准候选 |
| `19-read-aloud-running-capsule.png` | 朗读运行胶囊，高度对齐前版本 |
| `19-1-read-aloud-running-capsule-height-aligned.png` | 朗读运行胶囊当前采用版，高度对齐 04 |
| `20-read-aloud-settings.png` | 朗读设置页 |
| `21-reader-appearance-flow.png` | 阅读界面流程示意图 |
| `21-1-reader-appearance-quick-panel.png` | 阅读控制层，界面快捷模块 |
| `22-reader-settings-flow.png` | 阅读设置流程示意图 |
| `22-1-reader-settings-quick-panel.png` | 阅读控制层，设置快捷模块，高度对齐前版本 |
| `22-2-reader-settings-quick-panel-height-aligned.png` | 阅读控制层设置模块内容参考；固定结构仍以 04-2 为准 |
| `21-2-reader-appearance-quick-panel-04-2-standard.png` | 阅读控制层界面模块 04-2 标准候选 |
| `22-3-reader-settings-quick-panel-04-2-standard.png` | 阅读控制层设置模块 04-2 标准候选 |
| `23-reader-night-mode-state.png` | 阅读夜间模式状态示意图 |
| `24-reader-source-switch-flow.png` | 阅读页换源流程示意图 |
| `24-1-reader-source-switch-list.png` | 阅读页换源，来源列表 |
| `24-2-reader-source-checking-state.png` | 阅读页换源，来源检查中 |
| `24-3-reader-source-check-result.png` | 阅读页换源，来源检查结果 |
| `25-reader-top-more-menu-flow.png` | 阅读页顶部更多菜单示意图 |
| `25-1-reader-top-more-menu.png` | 阅读页顶部更多菜单展开，高度对齐前版本 |
| `25-4-reader-top-more-menu-height-aligned.png` | 阅读页顶部更多菜单展开当前采用版，高度对齐 04 |
| `25-2-reader-refresh-feedback.png` | 阅读页刷新本章轻反馈 |
| `25-3-reader-debug-info-sheet.png` | 阅读页调试信息底表 |
| `26-reader-brightness-system-state.png` | 阅读亮度系统模式状态示意图 |
| `27-reader-chapter-progress-flow.png` | 阅读章节进度控制示意图 |
| `28-reader-appearance-main-panel.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `29-reader-appearance-font-selection.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `30-reader-appearance-theme-selection.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `31-reader-appearance-theme-edit.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `32-reader-appearance-layout-advanced.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `33-reader-appearance-page-turn-animation.png` | 外观信息结构/字段/流程拆解参考，不作为视觉或尺寸基准 |
| `34-reader-appearance-main-panel-standard.png` | **废弃 / 不采用 / 仅保留历史记录** |
| `35-reader-appearance-font-selection-standard.png` | 阅读界面字体选择标准比例图，基于 21 拆解重绘 |
| `36-reader-appearance-theme-selection-standard.png` | 阅读界面主题选择标准比例图，基于 21 拆解重绘 |
| `37-reader-appearance-theme-edit-standard.png` | 阅读界面主题编辑标准比例图，基于 21 拆解重绘 |
| `38-reader-appearance-layout-advanced-standard.png` | 阅读界面版式高级标准比例图，基于 21 拆解重绘 |
| `39-reader-appearance-page-turn-animation-standard.png` | 阅读界面翻页动画标准比例图，基于 21 拆解重绘 |
| `40-reader-appearance-font-management-states.png` | 字体选择/管理全屏多状态示意图 |
| `41-discovery-default.png` | 发现页默认态上一版，未体现信息源与来源分类切换 |
| `41-1-discovery-source-category.png` | 发现页默认态当前采用版，信息源与来源分类切换 |
| `42-rss-home.png` | RSS/订阅首页主页面暂定版 |
| `43-settings-home.png` | 设置首页主页面暂定版 |
| `44-source-management-home.png` | 书源管理首页默认态暂定版 |
| `45-reader-controls-tablet-portrait.png` | 平板阅读控制层竖屏首版：右侧中下部悬浮控制面板 |
| `45-1-reader-controls-tablet-landscape.png` | 平板阅读控制层横屏首版：左侧停靠控制面板 |
| `45-2-reader-controls-side-portrait-tightened.png` | **不采用**：正文比例、底部进度和右侧锚点不符合最新规格 |
| `45-3-reader-controls-side-landscape-tightened.png` | **不采用**：底部进度、左侧锚点和横竖屏密度不符合最新规格 |
| `45-4-reader-controls-side-bottom-portrait.png` | **中间候选**：统一正文网格前的竖向侧边底部方案 |
| `45-5-reader-controls-side-bottom-landscape.png` | **中间候选**：统一正文网格前的横向侧边底部方案 |
| `45-6-reader-controls-side-bottom-portrait-geometry-v1.png` | **历史候选**：已由固定母版合成版本取代 |
| `45-7-reader-controls-side-bottom-landscape-geometry-v1.png` | **不采用**：横屏控制层长宽比例失衡 |
| `45-8-reader-controls-side-bottom-landscape-ratio-final.png` | **历史候选**：仍是独立生成图，已由固定母版合成版本取代 |
| `45-9-reader-control-panel-master-390x343.png` | 侧置控制层唯一母版：逻辑比例固定为 `390:343` |
| `45-10-reader-controls-side-portrait-fixed-ratio-final.png` | 当前竖向侧置定稿：同一母版固定在右下侧 |
| `45-11-reader-controls-side-landscape-fixed-ratio-final.png` | 当前横向侧置定稿：同一母版固定在左下侧 |
| `46-reader-settings-home.png` | 阅读内完整设置首页 |
| `46-1-reader-settings-display.png` | 阅读设置：屏幕与显示 |
| `46-2-reader-settings-behavior.png` | 阅读设置：翻页与手势 |
| `46-3-reader-settings-assist.png` | 阅读设置：阅读辅助 |
| `46-4-reader-settings-progress-info.png` | 阅读设置：进度与信息 |
| `46-5-reader-settings-presets.png` | 阅读设置：预设管理 |
| `47-source-detail.png` | 书源详情 |
| `47-1-source-create.png` | 新增书源 |
| `47-2-source-edit.png` | 编辑书源 |
| `47-3-source-check-running.png` | 书源检测中 |
| `47-4-source-check-result.png` | 书源检测结果 |
| `47-5-source-debug-info.png` | 书源调试信息 |
| `47-6-source-error-logs.png` | 书源错误日志 |
| `48-app-settings-general.png` | App 通用设置 |
| `48-1-app-settings-bookshelf-search.png` | App 书架与搜索设置 |
| `48-2-app-settings-cache.png` | App 缓存管理 |
| `48-3-app-settings-sync-backup.png` | App 同步与备份 |
| `48-4-app-settings-privacy-permissions.png` | App 隐私与权限 |
| `48-5-app-settings-about-feedback.png` | App 关于与反馈 |
| `51-global-state-loading.png` | 全局状态模板：Loading |
| `51-1-global-state-empty.png` | 全局状态模板：Empty |
| `51-2-global-state-error-network.png` | 全局状态模板：Error / Network Error |
| `51-3-global-state-permission-delete-confirm.png` | 全局状态模板：Permission Required / Delete Confirm |
| `51-4-global-state-operation-feedback.png` | 全局状态模板：Operation Success / Failed |

## 说明

- `03-reader-immersive.png` 的显性内容为正文和四角信息层：左上书名章节、右上时间、
  左下阅读百分比、右下章节进度。透明点击热区属于交互规格，不是图片中的显性 UI。
- 阅读控制层详细规则以 `../04-阅读链路/阅读控制层/00-阅读控制层规格.md`、
  `../04-阅读链路/阅读控制层/01-操作流程.md`、
  `../04-阅读链路/阅读控制层/02-响应式规则.md`、
  `../04-阅读链路/阅读控制层/03-几何规格.md` 和
  `../04-阅读链路/阅读控制层/04-图片使用规则.md` 为准。
- `28–33` 不得用于反推控制层尺寸、底部 sheet 高度、字体大小、按钮布局或最终视觉基准。
- `34-reader-appearance-main-panel-standard.png` 不得被任何新规格引用为界面模块、
  外观主面板或标准比例依据。
- 书架卡片不展示书源。
- 书籍搜索结果会将相同书名和作者合并为一个书籍实体，书源切换作为属性或操作展示。
- 内容搜索独立于书籍搜索，只搜索当前书籍内部。
- 目录章节行目前只显示缓存和书签状态，已移除未读标记。
- `_rejected/41-reader-directory-full-page-flow.png` 是后续误生成的目录方案，不属于已接受示意图，不作为目录或书签页面设计依据。
- `_rejected/22-1-reader-settings-main-panel.png` 是被否决的阅读设置快捷面板方案：它改变了最开始阅读控制层中四个主按钮、快捷区、章节进度和亮度条的空间关系，不作为设计依据。
- `_contact_sheets/`、`_progress_restore_backup/` 和 `_rejected/` 均不作为正式设计依据。
