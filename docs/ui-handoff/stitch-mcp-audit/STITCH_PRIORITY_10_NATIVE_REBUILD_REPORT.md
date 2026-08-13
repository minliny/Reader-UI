# Stitch Priority 10 Native Rebuild Report

## 1. 总体结论

STITCH_PRIORITY_10_NATIVE_REBUILD_READY

## 2. 输入视觉真源

| 源 | 路径 |
|----|------|
| Priority 10 audit | `docs/ui-handoff/stitch-mcp-audit/PRIORITY_10_STITCH_SCREEN_AUDIT.md` |
| raw-html | `docs/ui-handoff/stitch-mcp-audit/raw-html/` (20 files) |
| Screen count | 10 (6A + 4B) |
| P0/P1 | 0/0 |

## 3. 修改范围

### 新增文件（3 files）

| 文件 | 说明 |
|------|------|
| `ui/stitch/StitchAppShell.kt` | StitchBottomNav + StitchAppShell + 4 tab placeholders |
| `ui/stitch/StitchComponents.kt` | StitchPanel, StitchListItem, StitchSearchField, StitchErrorState, StitchActionButton |
| `ui/stitch/StitchScreens.kt` | StitchSearchScreen, StitchSearchResultsScreen, StitchBookDetailScreen, StitchReplaceOverlayContent |

## 4. Reader Stitch Component 结果

| 组件 | 状态 | 替代 Material3 |
|------|------|---------------|
| `StitchPanel` | ✅ | Material3 Card |
| `StitchListItem` | ✅ | Material3 ListItem |
| `StitchSearchField` | ✅ | Material3 TextField |
| `StitchErrorState` | ✅ | Material3 AlertDialog |
| `StitchActionButton` | ✅ | Material3 Button |
| `StitchChip` (inline) | ✅ | Material3 Chip |
| `StitchBottomNav` | ✅ | Material3 NavigationBar |
| `StitchIconButton` (inline) | ✅ | Material3 IconButton |

## 5. App Shell / 四主界面结果

| Screen | 实现 | 状态 |
|--------|------|------|
| App Shell | `StitchAppShell()` | ✅ 底栏 书架/发现/书源/我的 |
| 书架 | `StitchBookshelfPlaceholder` | ✅ placeholder |
| 发现 | `StitchDiscoverPlaceholder` | ✅ placeholder |
| 书源 | `StitchBookSourcePlaceholder` | ✅ placeholder |
| 我的 | `StitchMinePlaceholder` | ✅ placeholder |

## 6. 搜索 / 详情结果

| Screen | 实现 | 字段覆盖 |
|--------|------|---------|
| 搜索首页 | `StitchSearchScreen` | ✅ 输入框+历史+推荐 |
| 搜索结果 | `StitchSearchResultsScreen` | ✅ 书名/作者/来源/章/简介 |
| 书籍详情 | `StitchBookDetailScreen` | ✅ 全字段+TOC preview+action |

## 7. 阅读快捷 Overlay 结果

| Screen | 实现 | 状态 |
|--------|------|------|
| 内容替换 Overlay | `StitchReplaceOverlayContent` | ✅ name+scope+pattern+replacement+toggle |
| 搜索 Overlay | 复用现有 overlay zone + Stitch 样式 | ✅ |

## 8. 全局 Error 结果

| Screen | 实现 | 状态 |
|--------|------|------|
| 全局 Error | `StitchErrorState` | ✅ title+msg+code+retry+back, no stack trace |

## 9. 与当前业务状态集成

| 检查项 | 状态 |
|--------|------|
| 复用现有 UiState | ✅ |
| 保留 fake/real boundary | ✅ |
| 不影响 Progress/Cache/Bookmark | ✅ |
| 不影响 Search/Detail/Reader adapter | ✅ |
| 未引入 WebView | ✅ |
| 未引入 raw HTML runtime | ✅ |

## 10. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| 主底栏 书架/发现/书源/我的 | ✅ |
| 阅读页底栏不变 | ✅ |
| overlay 不全屏 | ✅ |
| 目录行布局未回归 | ✅ |
| 夜间正文不是白底黑字 | ✅ |
| 无 WebView | ✅ |
| 无 secret | ✅ |
| 未改 Core/parser/repository | ✅ |

## 11. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test` | BUILD SUCCESSFUL |
| `./gradlew assembleDebug` | BUILD SUCCESSFUL |
| `./gradlew lintDebug` | BUILD SUCCESSFUL |
| installDebug | 设备未连接 |

## 12. P0/P1

0/0。

## 13. 是否建议设备端人工复核

建议。重点看 App Shell 底栏是否 Stitch 风格，以及搜索/详情/Error 页面是否接近 Stitch normalized 设计。
