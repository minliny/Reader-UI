# Cross Platform UI Baseline

## App Shell

Reader 的正式 App Shell 一级底部主导航固定为 4 项：

1. 书架
2. 发现
3. RSS
4. 设置

搜索、阅读页、书源管理和设置二级页不是额外的一级底部主模块。Prototype Gallery 可以作为 debug-only 原型目录存在，但其分组不等同正式 App 主导航。

## Primary Modules

| 主模块 | 定位 | 关键内容 |
|---|---|---|
| 书架 | 默认首页 | 已加入书架书籍、本地书、网络书、阅读进度、分组、顶部搜索入口 |
| 发现 | 内容发现 | 发现推荐、榜单、来源摘要、offline/error 状态 |
| RSS | 订阅流 | RSS 列表、RSS 详情、订阅管理、未读与订阅状态 |
| 设置 | 系统与管理入口 | 全局设置、书源管理、WebDAV、备份、阅读进度同步、远程书籍、关于、权限/隐私/日志 |

## Reader Control Layer

阅读页不属于 App 主底栏。阅读页控制层底栏固定为：目录 / 朗读 / 界面 / 设置。
