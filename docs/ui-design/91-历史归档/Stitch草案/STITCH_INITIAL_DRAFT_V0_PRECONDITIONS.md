# Stitch Initial Draft v0 前置条件

> 状态：`STITCH_INITIAL_DRAFT_PRECONDITIONS_READY`
>
> 适用范围：仅用于组织 Stitch Initial Draft v0 输入，不代表设计冻结、开发交付或 Compose
> 实现基准。

## 1. 本轮补齐项

| P0 条件 | 结论 | 约束来源 |
| --- | --- | --- |
| DARK mode token | 已补齐基础草案 | `91-历史归档/freezes/阅读控制层V1预冻结/06_DESIGN_TOKENS_DRAFT.md` |
| 51 系列暖白覆盖 | 已补齐 | `stitch/STITCH_P0_INPUT_PACKAGE_V1/03_GLOBAL_STATE_TEMPLATES_PROMPT.md` |
| 49/50 缺图策略 | 已决策：允许先不生成 | 本文第 3 节 |
| C 类与历史图片排除 | 已补齐 | 本文第 4 节 |
| 主信息架构 | 已补齐 | 本文第 5 节 |
| 阅读页基线 | 已补齐 | 本文第 6 节 |
| 搜索/自动翻页弹层统一 | 已补齐 | 本文第 7 节 |
| 目录/书签覆盖层 | 已补齐 | 本文第 8 节 |
| 书源管理工具型布局 | 已补齐 | 本文第 9 节 |

以上 P0 条件已关闭到“可进入 Initial Draft v0”的粒度。图片视觉终审、精确 token 测量和
开发实现参数冻结仍未关闭。

## 2. 51 系列暖白覆盖

`51`～`51-4` 只提供 loading、empty、error、network error、permission、confirm 和
operation feedback 的结构与状态语义，不提供最终颜色母版。

- App background 使用暖白纸张体系；设置与管理页使用 `#FAF7F2`。
- 页面容器、状态卡片和空状态插画容器不得使用纯白或偏蓝冷白；卡片优先使用
  `#FFFCF7`。
- 按钮、弱文字、边框、状态图标必须与书架、详情、设置页的同类组件一致。
- 搜索、详情、书架、书源管理的 loading / empty / error 可从 `51` 系列推导结构，
  但必须重新套用当前 LIGHT 或 DARK token。
- 不继承 `51` 系列图中的默认 Material 蓝色、冷白大卡片或独立视觉语言。

## 3. 49/50 缺失图策略

**决策：Initial Draft v0 允许不先生成 `49`～`49-3` 和 `50`～`50-4` 九张图片。**

Stitch 应基于 `51` 系列通用状态模板自动补齐以下结构：

- `49` 系列：书架 empty、书籍操作底表、排序/筛选、分组管理。
- `50` 系列：搜索 loading / empty / error、书籍详情 loading / error。

推导时必须保留目标页面原有 App Shell、顶部栏、列表或详情骨架，只替换状态区域，并应用
暖白 token。不得把 `51` 系列直接复制成脱离业务上下文的独立页面。

风险：

- 49 的操作底表、排序/筛选和分组管理并非纯状态模板，Initial Draft v0 只能得到结构草案。
- 50 的搜索和详情骨架可能出现字段密度偏差。
- 这些推导结果必须在开发交付前人工验收；必要时再补独立 49/50 图集。

## 4. Stitch 图片输入排除清单

### 不进入视觉学习

- `docs/ui-design/91-历史归档/drafts/旧全局草稿目录/_rejected/`
- `docs/ui-design/91-历史归档/drafts/旧全局草稿目录/_contact_sheets/`
- `docs/ui-design/91-历史归档/drafts/旧全局草稿目录/_progress_restore_backup/`
- `34-reader-appearance-main-panel-standard.png`
- `45-2-reader-controls-side-portrait-tightened.png`
- `45-3-reader-controls-side-landscape-tightened.png`
- `45-7-reader-controls-side-bottom-landscape-geometry-v1.png`

### 只可读取信息结构

- `28`～`33`：只用于字段、分组和流程拆解，不作为视觉、尺寸或组件几何基准。

### 只可作为历史参考

- `16-4-reader-toc-quick-panel.png`
- `16-5-reader-toc-quick-panel-height-aligned.png`
- `18-1-read-aloud-quick-panel.png`
- `18-2-read-aloud-quick-panel-revised.png`
- `18-3-read-aloud-quick-panel-height-aligned.png`
- `19-read-aloud-running-capsule.png`
- `21-1-reader-appearance-quick-panel.png`
- `22-1-reader-settings-quick-panel.png`
- `22-2-reader-settings-quick-panel-height-aligned.png`

历史图片不得覆盖 `03`、`04-2` 或对应 `04-2-standard` 当前候选的视觉和几何。

## 5. 主信息架构硬约束

- 主底栏固定为：`书架 / 发现 / RSS / 设置`。
- 阅读页、搜索、书源管理均不是主 Tab。
- 当前路由不存在“我的”主页面，不新增“我的”主 Tab，不用账户或头像替代设置。
- 二级页不强行保留主底栏。
- 大屏允许增加辅助面板、双栏或侧置控制层，但不得改变主 Tab 数量、入口语义或主流程。

## 6. 阅读页唯一基线

- `03-reader-immersive.png` 是阅读沉浸页唯一基线。
- `04-2-reader-controls-opaque-icon-aligned.png` 是阅读控制层当前视觉与几何唯一基线。
- 阅读页左上书名/章节、右上时间、左下阅读百分比、右下章节进度的位置不得任意重排。
- 正文区域优先级最高；控制层必须轻量、低干扰、可隐藏。
- 阅读页不得改成卡片信息流、详情页、Dashboard 或普通设置页。
- 大屏响应式只改变外部锚点和辅助面板，不得反向改写手机阅读基线。

## 7. 搜索与自动翻页弹层

- `08-content-search-overlay.png` 是阅读内 lightweight overlay 的统一风格基准。
- 自动翻页设置覆盖层必须向搜索弹层统一层级、表面、圆角、间距、关闭方式和阅读上下文
  保留方式。
- 两者都叠加在阅读页上，不另起卡片体系、主底栏或按钮体系。
- 自动翻页可以使用自身的速度与模式控件，但组件视觉必须来自同一阅读弹层系统。
- 不得把任一弹层扩展成全屏设置页；完整设置必须走独立入口。

## 8. 目录与书签覆盖层

- 目录和书签是同一覆盖层中的两个核心入口，不得删除书签入口或拆成互不相关的页面。
- 多级目录滚动时，父级目录上下文必须以顶部吸顶路径保留。
- 当前章节状态区固定；当前章节图标/标识与已添加书签图标使用固定槽位，不随行内容漂移。
- 目录覆盖层只处理阅读中快速导航，不得与书籍详情进入的独立完整目录页混淆。
- 章节行不得混入书源管理、全局设置或未读状态。

## 9. 书源管理工具型布局

- 书源管理是高密度管理型页面，不是普通设置页或低密度大卡片页面。
- 首页和流程必须覆盖：搜索、筛选、启用/禁用、分组、检测状态、导入入口、错误提示。
- 可借鉴 Carbon / Ant Design 的信息密度、状态标签与批量管理思路，但必须压缩为移动端
  可扫描列表，不照搬桌面表格。
- 列表应优先行级信息、紧凑标签、稳定对齐和明确状态，不使用 hero、大插画或营销卡片。
- 视觉 token 仍以暖白纸张体系和 `SETTINGS_PAGE_DESIGN_SPEC.md` 为准。

## 10. 进入条件与剩余风险

Initial Draft v0 允许进入的条件：

1. 使用本文件、P0 input package、正式 specs 和 DARK token 草案共同作为输入。
2. 应用第 4 节排除清单，不让历史或 rejected 图片进入视觉学习。
3. 49/50 缺图按第 3 节从 51 结构推导，并标记为 `DERIVED_NOT_FINAL`。
4. 生成结果保留人工终审标记，不直接转换为开发任务或实现参数。

剩余 P1/P2 非阻塞风险：

- `43/44/46/47/48/51` 图片组仍需人工视觉终审。
- 49/50 推导态仍需业务字段和密度验收。
- DARK token 是 v0 草案，尚未经过真机、OLED、低亮度和无障碍对比度测试。
- 图标、字体、间距、阴影等 token 仍有人工测量与跨页面一致性风险。
- 大屏辅助面板和侧置控制层仍需独立响应式验收。

## 11. 交付边界

当前状态允许进入 Stitch Initial Draft v0，但**不能作为开发交付基准**。任何 Android /
Compose 实现必须等待页面人工验收、状态覆盖确认、LIGHT/DARK token 冻结和最终路由映射。
