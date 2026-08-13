# 本地 Demo 设计图同步表

生成时间：2026-06-25T14:12:48.040Z

## 规则

- `frontend-demo/` 是当前 UI 设计图的视觉源头。
- 每个页面目录的 `UI设计图.png` 由对应 `captureRoute` 截图生成。
- `frontend-input/verify/design-draft-preview.png` 和 `design-draft-state-matrix.png` 仍是页面包结构验证产物，不作为新的视觉源头。
- 旧 `图片/` 目录中的候选稿只作历史参考；与本地 demo 冲突时，以当前 demo 和顶层 `UI设计图.png` 为准。

## 同步结果

- 页面图：30 张
- 已对齐正式 UI 设计稿：30 个
- 本次脚本实际改写正式稿：1 个

| 页面 | Demo route | 输出图 | 操作态 | 备注 |
| --- | --- | --- | --- | --- |
| 书架 | `bookshelf` | `docs/ui-design/02-主标签页/书架/UI设计图.png` | - | - |
| 发现 | `discover` | `docs/ui-design/02-主标签页/发现/UI设计图.png` | - | - |
| RSS | `rss` | `docs/ui-design/02-主标签页/RSS/UI设计图.png` | - | - |
| 设置 | `settings` | `docs/ui-design/02-主标签页/设置/UI设计图.png` | - | - |
| 书架空状态 | `bookshelf-empty` | `docs/ui-design/03-书架链路/书架空状态/UI设计图.png` | - | - |
| 书籍搜索 | `book-search` | `docs/ui-design/03-书架链路/书籍搜索/UI设计图.png` | - | - |
| 书籍详情 | `book-detail` | `docs/ui-design/03-书架链路/书籍详情/UI设计图.png` | - | - |
| 书籍目录 | `book-directory` | `docs/ui-design/03-书架链路/书籍目录/UI设计图.png` | - | - |
| 书籍操作底表 | `bookshelf` | `docs/ui-design/03-书架链路/书籍操作底表/UI设计图.png` | `open-book-focus` | 当前 demo 不再提供独立 book-action-sheet 路由，本图捕获书架封面长按/右键操作层。 |
| 排序与筛选 | `sort-filter` | `docs/ui-design/03-书架链路/排序与筛选/UI设计图.png` | - | - |
| 分组管理 | `group-management` | `docs/ui-design/03-书架链路/分组管理/UI设计图.png` | - | - |
| 本地书导入 | `local-import` | `docs/ui-design/03-书架链路/本地书导入/UI设计图.png` | - | - |
| 沉浸阅读 | `immersive-reading` | `docs/ui-design/04-阅读链路/沉浸阅读/UI设计图.png` | - | - |
| 阅读入口 | `immersive-reading` | `docs/ui-design/04-阅读链路/阅读入口/UI设计图.png` | - | 阅读入口不定义单独视觉路由，本图对齐当前沉浸阅读入口态。 |
| 阅读控制层 | `reader` | `docs/ui-design/04-阅读链路/阅读控制层/UI设计图.png` | - | - |
| 目录与书签 | `toc-bookmarks` | `docs/ui-design/04-阅读链路/目录与书签/UI设计图.png` | - | - |
| 朗读 | `tts` | `docs/ui-design/04-阅读链路/朗读/UI设计图.png` | - | - |
| 阅读外观 | `reader-appearance` | `docs/ui-design/04-阅读链路/阅读外观/UI设计图.png` | - | - |
| 阅读设置 | `reader-settings` | `docs/ui-design/04-阅读链路/阅读设置/UI设计图.png` | - | - |
| 自动翻页 | `auto-page` | `docs/ui-design/04-阅读链路/自动翻页/UI设计图.png` | - | - |
| 内容搜索 | `content-search` | `docs/ui-design/04-阅读链路/内容搜索/UI设计图.png` | - | - |
| 内容替换 | `content-replacement` | `docs/ui-design/04-阅读链路/内容替换/UI设计图.png` | - | - |
| 换源 | `source-switch` | `docs/ui-design/04-阅读链路/换源/UI设计图.png` | - | - |
| App通用设置 | `settings-general` | `docs/ui-design/05-设置链路/App通用设置/UI设计图.png` | - | - |
| 书架与搜索设置 | `bookshelf-search-settings` | `docs/ui-design/05-设置链路/书架与搜索设置/UI设计图.png` | - | - |
| 隐私与权限 | `privacy-permissions` | `docs/ui-design/05-设置链路/隐私与权限/UI设计图.png` | - | - |
| 缓存管理 | `cache-management` | `docs/ui-design/05-设置链路/缓存管理/UI设计图.png` | - | - |
| 关于与反馈 | `about-feedback` | `docs/ui-design/05-设置链路/关于与反馈/UI设计图.png` | - | - |
| 同步与备份 | `sync-backup` | `docs/ui-design/05-设置链路/同步与备份/UI设计图.png` | - | - |
| 书源管理 | `source-management` | `docs/ui-design/05-设置链路/书源管理/UI设计图.png` | - | - |
