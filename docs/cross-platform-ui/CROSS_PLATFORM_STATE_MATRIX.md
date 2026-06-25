# Cross Platform State Matrix

| 模块 | 状态 | 说明 |
|---|---|---|
| 书架 | loading / empty / error / offline / cover / list | 默认首页，搜索入口在顶部 |
| 发现 | loading / empty / error / offline / recommendation | 内容发现与推荐，不接真实网络时使用 fixture |
| RSS | loading / empty / error / subscription disabled / unread / offline | 订阅流是一级主 Tab |
| 设置 | source list / source disabled / source test loading / source test success / source test failure / import error / WebDAV not configured / configured / auth error / backup enabled / sync running / conflict / permission | 设置、书源管理、同步、备份、关于和系统入口 |
| 搜索 | home / loading / results / empty / error | 二级功能，不是 App 主底栏 |
| 详情 | loading / detail / TOC preview / error | 从书架或搜索进入 |
| 阅读页 | base / search / auto scroll / replace / night / directory / tts / appearance / settings | 独立阅读控制层，不使用 App 主底栏 |
| 全局状态 | loading / empty / error / offline / permission required | 可由各模块复用 |

## Slice 16 Canonical Global States

| 状态 | Android UI 表达 | 说明 |
|---|---|---|
| loading | `ReaderUiState.Loading` | StatePage / 模块 loading 可复用 |
| empty | `ReaderUiState.Empty` | 书架、RSS、远程书籍等空态 |
| error | `ReaderUiState.Error` | 可重试或不可重试错误 |
| offline | `ReaderUiState.Offline` | 书架、阅读页、RSS、同步等离线态 |
| disabled | `ReaderUiState.Disabled` | 书源禁用、RSS 订阅禁用、功能停用 |
| permission required | `ReaderUiState.PermissionRequired` | 本地文件、隐私、系统授权入口 |
| local file error | `ReaderUiState.LocalFileError` | 本地导入/阅读本地书异常 |
| network source error | `ReaderUiState.NetworkSourceError` | 书源、搜索、详情来源异常 |
| import success | `ReaderUiState.ImportSuccess` | 书源导入等成功态 |
| import failure | `ReaderUiState.ImportFailure` | JSON / URL 导入失败态 |
| WebDAV auth error | `ReaderUiState.WebDavAuthError` | 只表达状态，不触发真实登录 |
| sync conflict | `ReaderUiState.SyncConflict` | 只表达冲突，不触发真实同步 |
