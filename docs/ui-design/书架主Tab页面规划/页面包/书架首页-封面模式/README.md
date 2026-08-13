# 书架首页封面模式 Stitch 输入包

本目录用于让 Stitch 复原书架首页封面模式。

## 文件

- `01-page-spec.md`：页面结构。
- `02-component-spec.md`：组件和视觉规格。
- `03-interaction-spec.md`：交互规则。
- `04-state-spec.md`：状态规则。
- `05-copy.md`：中文文案。
- `06-do-not.md`：禁止项。
- `images/default.png`：页面候选图。

## 使用方式

Stitch 生成时必须同时读取本目录全部 Markdown 和 `images/default.png`。图片只作为结构和视觉方向参考；响应式、自适应、组件复用和 token 约束以 Markdown 为准。

视觉 token 和组件约束必须读取 `../../18-书架首页组件视觉规格.md`。如果页面包图片与该视觉规格冲突，以视觉规格为准。

## 自适应核心要求

封面网格按可用宽度计算列数；顶部信息卡片在窄屏可纵向堆叠；底部导航固定复用 App Shell；短屏优先保证首屏能看到书架内容。
