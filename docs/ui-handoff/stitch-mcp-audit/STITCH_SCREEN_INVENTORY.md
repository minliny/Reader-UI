# Stitch MCP Screen Inventory

Audit date: 2026-05-25

Project: `14245818599411324705` / `Markdown Design System`

Repository state before audit:

- `git status --short`: `?? .claude/scheduled_tasks.lock`
- `git log --oneline -10`: latest commit `feab56a fix: apply Stitch MCP color palette and flat UI style`

MCP read result:

- `get_project`: success
- `list_screens`: success
- Exportable screens returned by `list_screens`: 20
- HTML/CSS export: available for 19 HTML screens and 1 markdown report screen
- Screenshot metadata: available for most screens, but bulk screenshot files were not downloaded in this audit pass
- Local raw export path: `docs/ui-handoff/stitch-mcp-audit/raw-html/`

Important scope note:

The Stitch project canvas contains many hidden or historical `screenInstances`, including repeated source screens and older reader-control variants. This inventory treats the 20 screens returned by `list_screens` as the currently exportable MCP surface. Hidden canvas instances are not considered direct-use candidates unless they are also reachable via `list_screens` or explicitly verified by `get_screen`.

## Inventory

| Screen name | Screen ID | Module | Device size | Mobile | HTML/CSS | Latest | Duplicate / deprecated | Formal UI candidate | Notes |
|---|---|---:|---|---:|---:|---:|---|---:|---|
| Reader App Navigation Flow | `1f1857d5789640229ea805a6cb70cdee` | A. App Shell / main navigation | 390x884 metadata, 780x1768 export | Yes | Yes | Unclear | Possible duplicate: exported HTML is effectively the bookshelf list shell; nav labels are old `书架 / 发现 / RSS / 设置` | No | Does not match required `书架 / 发现 / 书源 / 我的`; no real target screens for 3 tabs. |
| 书架 (封面模式) | `6ffdff871ea04640b8f317379401e373` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Yes, visual source | Covers cover mode, progress, group chip, bottom nav, search/menu affordances. |
| 书架 (列表模式) | `3abe3f06b1524b42b84acd1c6d00a3e6` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Yes, visual source | Covers list mode and bottom nav but keeps old `RSS/设置` tabs. |
| 书架 (空状态) | `cb27d49d6e28462895e5662661058445` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | Empty state exists, but copy routes users to `发现` and `导入书源`; main nav is old. |
| 书架 (更多菜单) | `82cdd809d8f649a3b6cb35754dbc6e0b` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | More menu contains refresh, source display, cache/download entries. |
| 书架布局与排序 (变体1: 经典卡片) | `fecce1704ab740279f8b994b4ad8308c` | B. Bookshelf | 780x4052 export | Yes | Yes | Yes | Variant only | Partial | Covers layout/sort controls but only one variant and no state matrix. |
| 书架分组管理 (空状态) | `5ef14cc87eae4ec8bf527d663c568954` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | Group-management empty state. |
| 书架分组管理 (操作弹层) - 纯列表版 | `b2c1bcc15cea4ffdb3d7a402020c4ca5` | B. Bookshelf | 780x1784 export | Yes | Yes | Yes | No | Partial | Action sheet / group list interactions. |
| 分组管理 - 默认列表 (修正版) | `fa117b0bd63a400983418295c7591795` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | Group-management list state. |
| 分组管理 - 新增弹窗 (修正版) | `f1949f7327af41e8b321c0fb6f57e28e` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | Add-group dialog. |
| 分组管理 - 删除确认 (修正版) | `6fd883da195a486880b6924f98e823f7` | B. Bookshelf | 780x1768 export | Yes | Yes | Yes | No | Partial | Delete-confirm dialog. |
| 导入本地书籍 - 体系化修正版 | `54b5bee893cf4568930c0e8d1df80f80` | L. Other / local import | 780x1768 export | Yes | Yes | Yes | No | Partial | Useful for local import, not one of the four requested main modules. |
| 下载 / 缓存管理 - 体系化修正版 | `ebac4a751ef84da099b974f301410232` | L. Other / cache management | 780x1768 export | Yes | Yes | Yes | No | Partial | Useful cache-management visual, no route/data binding contract. |
| 阅读页控制层参照模板 - 基于修正版含亮度条 (P1 Fixed) - 箭头修复版 | `f0413fa7d1024d1b8766aba2939ff266` | H. Reader base control layer | 780x3050 export | Yes | Yes | Yes | Many old hidden variants exist | Yes, visual source | Best available base template; includes top controls, source chip, quick buttons, bottom bar. |
| 阅读页 - 目录底栏功能展开 (规格统一版) | `1a6e2721fe5749f5bf4bec7aed9236d9` | J. Reader bottom overlay | 780x1768 export | Yes | Yes | Yes | No | Partial | TOC/bookmark bottom overlay candidate; right index exists per report. |
| 阅读页 - 朗读底栏功能展开 (规格统一重构版) | `710788cf83434bca87f41c0ec83813bc` | J. Reader bottom overlay | 780x1768 export | Yes | Yes | Yes | No | Partial | TTS overlay candidate; should hide quick/page controls in final mapping. |
| 阅读页 - 界面底栏功能展开 (规格统一版) | `28d6c937bf85461592efa8fd9690e78a` | J. Reader bottom overlay | 780x1768 export | Yes | Yes | Yes | No | Partial | Appearance overlay candidate; contains brightness/theme controls. |
| 阅读页 - 设置底栏功能展开 (规格统一版) | `bc377fd501a7492a99112ce2613dcea6` | J. Reader bottom overlay | 780x1768 export | Yes | Yes | Yes | No | Partial | Reading settings overlay; does not include WebDAV/source/RSS/about in raw keyword scan. |
| 阅读页 (文本选择) - 纯色版 V3 | `ba79793c60c1482b922d79a299caa893` | L. Other / reader text selection | 780x2130 export | Yes | Yes | Yes | No | Partial | Text-selection state, not part of requested overlay set. |
| Bottom Bar Derivatives Unified Fix Report | `49eaa613f5a74dde9c8c28594e657094` | L. Other / report | 0x0 markdown | No | Markdown only | Yes | Report artifact | No | Useful as Stitch-side self-report, not app UI. |

## Module Summary

| Module | Exportable screen count | Direct-use candidates | Coverage conclusion |
|---|---:|---|---|
| A. App Shell / main navigation | 1 | 0 | Old nav labels, not aligned with Android `书架 / 发现 / 书源 / 我的`. |
| B. Bookshelf | 10 | 2 visual candidates + 8 partial states | Strongest module, but missing loading/error and route-correct main nav. |
| C. Discover / RSS | 0 | 0 | Not covered by current Stitch MCP export. |
| D. Book sources | 0 | 0 | Not covered by current Stitch MCP export. |
| E. Mine / WebDAV / Backup / Sync | 0 | 0 | Not covered by current Stitch MCP export. |
| F. Search | 0 | 0 | Not covered by current Stitch MCP export. |
| G. Book detail | 0 | 0 | Not covered by current Stitch MCP export. |
| H. Reader base control layer | 1 | 1 visual candidate | Best available reader source, but not a complete runtime state matrix. |
| I. Reader quick overlay | 0 | 0 | Quick buttons exist; actual quick overlays for search/auto/replacement/night are not exportable as separate screens. |
| J. Reader bottom overlay | 4 | 4 partial candidates | Covered visually for TOC/TTS/appearance/settings; needs interaction/state binding. |
| K. Global state pages | 0 | 0 | Not covered by current Stitch MCP export. |
| L. Other / old / unclassified | 4 | 0 | Local import, cache, text selection, and Stitch-side report only. |
