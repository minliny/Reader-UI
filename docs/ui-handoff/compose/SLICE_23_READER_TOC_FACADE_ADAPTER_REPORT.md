# Slice 23 Reader TOC Facade Adapter Report

## 1. 总体结论

SLICE_23_READER_TOC_FACADE_ADAPTER_READY

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `240d132`（Slice 22） |
| Slice 22 是否提交 | 是 |
| 是否 push | 否 |

## 3. 修改范围

### 新增文件（7 files）

| 文件 | 说明 |
|------|------|
| `app/.../reader/CoreTocToReaderTocMapper.kt` | 递归 TOCItem tree → flat ReaderTocEntryUiModel list + level 计算 |
| `app/.../reader/ReaderTocLocalStateJoiner.kt` | 本地状态 join（current/bookmark/progress）— 当前为 default pass-through |
| `app/.../reader/ReaderTocFacadeErrorMapper.kt` | CoreBridge error → ReaderTocBookmarkState 错误状态 |
| `app/.../reader/ReaderDirectoryAdapterShell.kt` | FAKE/REAL 边界：tocFake() / tocReal() |
| `app/.../reader/CoreTocToReaderTocMapperTest.kt` | 7 tests：tree walk、level、defaults、fallback |
| `app/.../reader/ReaderTocFacadeAdapterTest.kt` | 7 tests：fake/real mode、boundary |
| `docs/.../SLICE_23_READER_TOC_FACADE_ADAPTER_REPORT.md` | 本报告 |

## 4. Reader TOC facade adapter 结果

### CoreTocToReaderTocMapper
- `map(List<TOCItem>) → List<ReaderTocEntryUiModel>` — 递归层级遍历
- tree depth → level（root=1）
- parentPath 构建（parent + " / " + title）
- blank title → "未命名章节" fallback
- `flattenChapters()` — 提取纯章节（有 url 的节点）

### ReaderTocLocalStateJoiner
- `join(entries) → entries` — 数据类含 currentChapterUrl/bookmarkedUrls/chapterProgress
- 当前 pass-through（所有值保持默认 false/null）
- TODO: 接入 ReadingProgress / BookmarkStorage

### ReaderTocFacadeErrorMapper
- 7 错误码 → 用户友好 volumeInfo 消息
- emptyToc → volumeInfo="暂无章节"
- mapException → 通用 "目录加载失败"

### ReaderDirectoryAdapterShell
- `tocFake(volumeInfo)` → fixture TOC（7 entries）
- `tocReal(tocUrl, volumeInfo, source)` — suspend
  - 调用 `CoreBridge.getTOC()` public facade
  - 空 URL → empty state
  - Mode.FAKE → fixture fallback
  - getTOC 成功 → CoreTocToReaderTocMapper → local state join
  - getTOC 失败 → ReaderTocFacadeErrorMapper

## 5. TOC 字段映射结果

| UI 字段 | Core DTO | 映射 | 完成 | 缺口 |
|---------|---------|------|------|------|
| title | TOCItem.title | 直接 + fallback | ✅ | - |
| level | tree depth | parentLevel + 1 | ✅ | - |
| isCurrent | - | false (TODO) | ⚠️ | ReadingProgress |
| hasBookmark | - | false (TODO) | ⚠️ | BookmarkStorage |
| progress | - | null (TODO) | ⚠️ | ReadingProgress |
| id | TOCItem.url | (reserved) | - | 需 ReaderTocEntryUiModel 加 url 字段 |

## 6. Local state join 结果

| 状态 | 当前 | 计划 |
|------|------|------|
| isCurrent | false | ReaderTocLocalStateJoiner.currentChapterUrl 匹配 |
| hasBookmark | false | bookmarkedUrls set 匹配 |
| progress | null | chapterProgress map 查询 |

所有 local join 字段已预留接口，当前注入默认值。不访问真实数据库。

## 7. 错误 / 空状态结果

| 场景 | 结果 |
|------|------|
| blank tocUrl | emptyToc(), entries=empty |
| getTOC 返回空 list | emptyToc() |
| getTOC 异常 | mapError() 含用户友好 volumeInfo |
| Mode.FAKE | fixture fallback |
| Mode.REAL 成功 | mapped entries |

## 8. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| 目录行布局仍为 [indent] [title w1f] [bookmark] [current] [progress] | ✅ 未修改 |
| 图标未回到章节名前 | ✅ 未修改 |
| bottom overlay 不全屏 | ✅ 未修改 |
| App 主底栏 书架/发现/书源/我的 | ✅ 未修改 |
| 阅读页底栏 目录/朗读/界面/设置 | ✅ 未修改 |
| 无 WebView runtime | ✅ |
| 无 Stitch 旧色/旧类 | ✅ |
| 无 secret | ✅ |
| 未改 Core/parser/repository/book source | ✅ |

## 9. 本轮未做事项

| 未做 | 说明 |
|------|------|
| getContent 正文接入 | 未实现 |
| 真实 bookmark repository | 未实现 |
| 真实 reading progress repository | 未实现 |
| Reader-Core 内部改造 | 未修改 |
| ReaderTocEntryUiModel 加 url 字段 | 预留后续 |

## 10. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (754 tests, 0 failures) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

**新增测试 (14 tests)**:
- CoreTocToReaderTocMapperTest: 7 — tree walk, level, defaults, blank title, flat, empty, flattenChapters
- ReaderTocFacadeAdapterTest: 7 — fake/real mode, blank url, boundary guard

## 11. 是否仍有 P0

无。

## 12. 是否仍有 P1

无。

## 13. 是否允许进入 Slice 24

允许进入 Slice 24 Reader content facade adapter planning。
