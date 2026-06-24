# Figma Frame 规划

> 状态更新（2026-06-11）：46/47/48/51 系列已生成，可直接建立对应 frames；49/50
> 系列仍待补。Reader Control Layer 默认态改用 `04-2`，四个快捷模块等待标准重绘版。

| Figma Page | Frame 名称 | 对应模块 | 来源图片/待补图 | 优先级 |
| ---------- | -------- | ---- | -------- | --- |
| `00 Design Tokens` | Colors / Type / Spacing / Radius / Shadow | 全局视觉规范 | 待补 token | P0 |
| `01 Components` | AppBar / BottomNav / Card / ListRow / Button / Dialog | 全局组件 | 待补组件库 | P0 |
| `02 Global States` | Loading / Empty / Error / Network / Permission / Confirm | 全局状态 | `51`～`51-4` 已生成 | P0 |
| `03 Bookshelf` | Bookshelf Cover / Bookshelf List / Empty / Manage | 书架 | `01`、`02`、待补状态 | P1 |
| `04 Discovery` | Discovery Home | 发现 | `41-1` | P0 |
| `05 Search` | Search Home / Results / Loading / Empty / Error | 搜索 | `05`、`06`、待补状态 | P1 |
| `06 Book Detail` | Book Detail / Loading / Failed / Remove Confirm | 详情 | `07`、待补状态 | P1 |
| `07 Reader Base` | Immersive / Night / Loading / Failed | 阅读基础 | `03`、`23`、待补状态 | P0 |
| `08 Reader Control Layer` | Default / Directory Quick / TTS Quick / Settings Quick / Top More | 阅读控制层 | `04-2`、`16-6/18-4/21-2/22-3`；`25-4` 参考 | P0 |
| `09 Reader TOC Bookmark` | TOC Overlay / Bookmark / Search / Full TOC | 目录书签 | `16`、`16-1`、`16-2`、`16-3`、`17`、`17-1` | P1 |
| `10 Reader TTS` | TTS Quick / Running / Settings / Error | 朗读 | `18-3`、`19-1`、`20`、待补错误态 | P1 |
| `11 Reader Appearance` | Quick / Font / Theme / Theme Edit / Layout / Page Turn | 界面 | `21-1`、`35-39`、`40` | P1 |
| `12 Reader Settings` | Home / Display / Behavior / Assist / Preset | 阅读设置 | `46`～`46-5` 已生成 | P0 |
| `13 Source Management` | List / Detail / Create / Edit / Check / Logs | 书源管理 | `44`、`47`～`47-6` 已生成 | P0 |
| `14 App Settings` | Settings Home / Permissions / Sync / Backup / About / Feedback | App 全局设置 | `43`、`48`～`48-5` 已生成 | P0 |
| `15 RSS` | RSS Home | RSS/订阅 | `42` | P0 |
| `16 Flow Diagrams` | Reader Flow / Source Flow / App Shell Flow | 流程图 | 现有 flow + 待补 | P2 |
