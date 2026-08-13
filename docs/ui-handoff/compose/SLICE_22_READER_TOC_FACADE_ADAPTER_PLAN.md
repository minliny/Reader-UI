# Slice 22 Reader TOC Facade Adapter Plan

## 1. 总体结论

SLICE_22_READER_TOC_FACADE_ADAPTER_PLAN_READY

接入等级：**C. NEEDS_LOCAL_STATE_JOIN**。Core getTOC() public facade 可用，但 isCurrent/bookmark/progress 需 join 本地状态。

## 2. Git 状态

| 项目 | 值 |
|------|-----|
| 当前 HEAD | `b8deb85` |
| Slice 21 是否提交 | 是 |
| 是否 push | 否 |

## 3. 输入基线

| 文件 | 用途 |
|------|------|
| `ReaderBottomFunctionOverlay.kt` | 目录 overlay UI + `TocEntry` 数据类 |
| `ReaderRuntimeState.kt` | `ReaderTocEntryUiModel` + `ReaderTocBookmarkState` |
| `ReaderRuntimeFixture.kt` | TOC fixture (7 章, level=2) |
| `BookDetailFacadeResultMapper.kt` | `flattenChapters()` — 可复用 |
| `data/bridge/CoreBridge.kt` | CoreBridge.getTOC() public facade |
| `data/model/DomainModels.kt` | TOCItem(title, url, children) |

## 4. 当前 Reader TOC UI 状态

目录 overlay 已完成：

| 元素 | 状态 | 代码位置 |
|------|------|---------|
| 目录/书签 tabs | ✅ | `ReaderBottomFunctionOverlay.kt:83` |
| 层级小字 breadcrumb | ✅ | `volumeInfo` Text |
| 层级缩进 | ✅ | `(entry.level - 1) * 10` dp |
| 当前阅读章节标识 | ✅ | `Icons.Filled.MyLocation` 20dp slot |
| 书签标识 | ✅ | `Icons.Filled.Bookmark` 20dp slot |
| 右侧进度条 | ✅ | `LinearProgressIndicator` 40dp slot |
| 底部当前章节提示 | ✅ | `"当前阅读章节：$currentChapter"` |
| 行布局 | ✅ | `[indent] [title w1f] [🔖] [📍] [📊]` |
| overlay 不全屏 | ✅ | zone Box 约束 |

**TocEntry 字段** (5): title, level, isCurrent, hasBookmark, progress
**ReaderTocEntryUiModel 字段** (5): title, level, isCurrent, hasBookmark, progress
**Fixture**: 7 条，全部 level=2

## 5. CoreBridge.getTOC facade 审计

### 候选 facade
- `CoreBridge.getTOC(tocUrl, source) → List<TOCItem>` — 已实现
- `ReaderCoreBridge.getTOC(tocUrl, source) → BridgeResult<List<TOCItem>>` — 增强版

### Core TOCItem 结构
```
TOCItem(title, url, children: List<TOCItem>)
```
- 树形嵌套（url="" 为卷标题节点）
- 无内置 level 字段 — 需从树深度计算
- 无 isCurrent/bookmark/progress — 需本地状态 join

### 可复用字段

| Core TOCItem | Reader TocEntry | 映射方式 |
|-------------|-----------------|---------|
| title | title | 直接 |
| url | id/chapterUrl | 直接 |
| children | (递归) | 递归展平 + 计算 level |
| - | level | 从树深度派生 |
| - | isCurrent | 需本地 ReadingProgress join |
| - | hasBookmark | 需本地 bookmark storage join |
| - | progress | 需本地 ReadingProgress join |

### 接入等级：**C. NEEDS_LOCAL_STATE_JOIN**

Core TOC DTO 覆盖基本字段（title、url、树结构）。level 可从树深度计算。isCurrent/bookmark/progress 需要在 adapter 层 join 本地状态。

## 6. Reader TOC 字段映射矩阵

| UI 字段 | Fixture 来源 | Core DTO | 可映射 | Local join | 缺口 | 风险 |
|---------|-------------|---------|--------|-----------|------|------|
| title | 硬编码 | TOCItem.title | ✅ | - | - | - |
| level | 硬编码 2 | - | ❌ | 树深度计算 | - | 低 |
| isCurrent | 硬编码 | - | ❌ | ReadingProgress | 需 current chapter match | 低 |
| hasBookmark | 硬编码 | - | ❌ | Bookmark storage | 需 bookmark list 查询 | 低 |
| progress | 硬编码 | - | ❌ | ReadingProgress | 需 per-chapter progress | 低 |
| id/url | 硬编码 | TOCItem.url | ✅ | - | - | - |
| children | - | TOCItem.children | ✅ | - | - | - |
| order/index | 列表位置 | 列表位置 | ✅ | - | - | - |

**可映射率**: 3/8 (38%) 直接映射，5/8 (62%) 需 local state join 或派生。

## 7. Bookmark 字段映射矩阵

| Bookmark 字段 | Fixture 来源 | Core DTO | 可映射 | Local join | 缺口 |
|--------------|-------------|---------|--------|-----------|------|
| id | - | TOCItem.url | ✅ | - | hash |
| chapterTitle | 硬编码 | TOCItem.title | ✅ | - | - |
| snippet | - | - | ❌ | 需正文片段 | 需 getContent |
| chapterUrl | 硬编码 | TOCItem.url | ✅ | - | - |
| order/index | 列表位置 | 列表位置 | ✅ | - | - |
| progress | 硬编码 | - | ❌ | ReadingProgress | per-chapter |
| createdAt | - | - | ❌ | Bookmark storage | 需 timestamp |
| isCurrent | 硬编码 | - | ❌ | ReadingProgress | current match |

**注**: Bookmark 的 snippet（正文片段）需要 getContent() 获取，本轮不实现。

## 8. Local state join 需求

| 状态字段 | 来源 | 当前可用 | 优先级 |
|---------|------|---------|--------|
| currentChapter | 当前阅读的章节 URL/title | 无本地接口 | P1 — 需 current chapter url |
| bookmark list | 用户书签集合 | 无本地接口 | P1 — 需 bookmark storage |
| per-chapter progress | 每章阅读进度 (0-1) | 无本地接口 | P2 — 可只显示 current |
| scroll progress | 全书阅读进度 % | 无本地接口 | P2 — 可只显示 per-chapter |
| volume/chapter hierarchy | 卷/章节层级 | 可从 TOC tree 计算 | P1 — 树深度 → level |

**建议**: Slice 23 实现时，先只做 Core TOC → TocEntry 的 title/url/level 映射。isCurrent/bookmark/progress 保留 fixture 默认值，记录为 TODO。后续 Slice 实现 local state join。

## 9. Mapper 复用规划

| Mapper | 用途 | 复用关系 |
|--------|------|---------|
| `BookDetailFacadeResultMapper.flattenChapters()` | 展平 TOC tree → 章节数 | ✅ Reader TOC 可复用 |
| `CoreTocToReaderTocMapper` (新) | TOCItem tree → List\<ReaderTocEntryUiModel\> | 🆕 Slice 23 实现 |
| `ReaderTocLocalStateJoiner` (新) | join current/bookmark/progress | 🆕 后续 Slice |
| `ReaderBookmarkLocalStateJoiner` (新) | join bookmark snippet/time | 🆕 需 getContent |

**复用策略**:
- BookDetail preview: `flattenChapters()` + 首尾提取 → 已够用
- Reader full TOC: 需要完整 tree walk + level 计算
- 两者不共用同一个 mapper，但 `flattenChapters()` 可被 Reader TOC mapper 内部调用

## 10. 风险与阻塞

| 风险 | 级别 | 缓解 |
|------|------|------|
| Core TOC DTO 缺 level | 低 | 从 tree depth 计算 |
| 无本地 current chapter state | 中 | Slice 23 先用 fixture default，记录 TODO |
| 无 bookmark list | 中 | Slice 23 先用 fixture default，记录 TODO |
| 无 per-chapter progress | 低 | progress 已有 fixture 值，可暂用 |
| 目录 UI 布局已稳定 | 无 | 已确认，不变更 |
| parser internals 风险 | 无 | CoreBridge.getTOC() 封装 |

**无阻塞项**。所有缺口均为 local state join，不阻止 Core TOC → TocEntry 基础映射。

## 11. 下一步建议

允许进入 Slice 23 Reader TOC facade adapter implementation。

建议 Slice 23 实现顺序：
1. 新增 `CoreTocToReaderTocMapper`：递归遍历 TOCItem tree → `List<ReaderTocEntryUiModel>`
   - title → title
   - url → (reserved for id)
   - tree depth → level (根节点 depth 0)
2. 新增 `ReaderDirectoryAdapterShell`（或扩展现有 shell）：Mode.REAL 调用 `CoreBridge.getTOC()`
3. isCurrent/bookmark/progress 保留 fixture 默认值，标注 TODO
4. 测试：Core TOC tree → Reader TocEntry 映射、level 计算、空 TOC、嵌套 TOC

## 12. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (~731 tests) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |

## 13. 是否仍有 P0

无。

## 14. 是否仍有 P1

无。
