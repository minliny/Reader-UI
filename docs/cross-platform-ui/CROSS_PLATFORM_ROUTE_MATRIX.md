# Cross Platform Route Matrix

| 层级 | route | 页面 | 主模块 |
|---|---|---|---|
| 主 Tab | `bookshelf` | 书架 | 书架 |
| 主 Tab | `discover` | 发现首页 | 发现 |
| 主 Tab | `sources` | 书源管理 | 书源 |
| 主 Tab | `mine` | 我的 | 我的 |
| 二级 | `search` | 搜索 | 书架 / 全局功能 |
| 二级 | `detail/{detailUrl}` | 书籍详情 | 书架 / 搜索 |
| 二级 | `reader` / `reader_content/{contentUrl}/{chapterTitle}` | 阅读页 | 书架 / 详情 |
| 二级 | `rss_list` | RSS 列表 | 发现 |
| 二级 | `rss_detail/{rssId}` | RSS 详情 | 发现 |
| 二级 | `rss_subscription` | RSS 订阅管理 | 发现 |
| 二级 | `source_detail/{sourceId}` | 书源详情 | 书源 |
| 二级 | `source_edit/{sourceId}` | 书源编辑 | 书源 |
| 二级 | `source_import` | 书源导入 | 书源 |
| 二级 | `global_settings` | 全局阅读设置 | 我的 |
| 二级 | `webdav_config` | WebDAV 配置 | 我的 |
| 二级 | `backup_settings` | 备份设置 | 我的 |
| 二级 | `progress_sync` | 阅读进度同步 | 我的 |
| 二级 | `remote_webdav_books` | 远程 WebDAV 书籍 | 我的 |
| 二级 | `about` | 关于版本 | 我的 |
| 状态 | `state/error/{message}` | 错误状态 | 全局状态 / 我的 |
| 状态 | `state/offline` | 离线状态 | 全局状态 / 我的 |

`prototype_gallery` 仅用于 debug UI 校对，不作为正式跨端主导航。
