# Reader Control Layer Zone Overlay Refactor Report

## 1. 总体结论

READER_CONTROL_LAYER_ZONE_OVERLAY_REFACTOR_READY

## 2. 输入审计

引用基线审计报告：`docs/ui-handoff/compose/READER_CONTROL_LAYER_BASELINE_AUDIT.md`（commit `c796528`）

审计结论 `READER_CONTROL_LAYER_BASELINE_NOT_READY`，P0=3（全屏 overlay）、P1=4（亮度/章节标题/TOC进度/分级文字）。

## 3. 修改范围

### 修改文件（5 files）

| 文件 | 变更 | 说明 |
|------|------|------|
| `app/.../reader/components/ReaderControlBase.kt` | +145 lines | overlay-aware 重构：新增 `overlayState`/`overlayContent` 参数、zone 定位、显隐规则、亮度值、底部间距修正 |
| `app/.../reader/ReaderScreen.kt` | +289 lines | 移除 Box 内全屏 overlay 渲染，改为通过 `overlayContent` lambda 传递给 `ReaderControlBase`；新增 `ContentArea` 组件（含章节标题）；新增 `OverlayContent` 集中路由 |
| `app/.../reader/ReaderRuntimeMapper.kt` | +6 lines | `ControlBaseParams` 新增 `brightnessValue` 字段 |
| `app/.../reader/components/ReaderBottomFunctionOverlay.kt` | +31 lines | `TocEntry` 新增 `progress` 字段；目录 overlay 渲染右侧进度条、层级标识 L{n}；移除 `ReaderBottomPanel` 冗余横向 padding |
| `app/.../reader/components/ReaderQuickActionOverlay.kt` | -1 line | 移除 `ReaderQuickActionPanel` 冗余横向 padding（zone Box 已提供） |

### 新增测试文件（4 files）

| 文件 | 内容 |
|------|------|
| `app/.../reader/ReaderControlZoneOverlayTest.kt` | 15 tests：zone 参数、zone 定位、overlay 不使用 fillMaxSize 全屏、visibility 变量、顶栏/底栏始终可见 |
| `app/.../reader/ReaderControlOverlayVisibilityTest.kt` | 12 tests：显隐规则、night state 无弹窗、zone 定位、content area 含章节标题、overlay 不接收 fillMaxSize |
| `app/.../reader/ReaderDirectoryOverlayBaselineTest.kt` | 11 tests：目录/书签 tabs、卷信息、当前章节底部、level 字段、进度条、层级标识 L{n}、书签/当前标识、model 字段完整性 |
| `app/.../reader/ReaderControlBaselineRegressionTest.kt` | 18 tests：底栏标签、快捷按钮无文字、页内控制语义、夜间模式非弹窗、设置不含全局模块、App 主底栏、替换仅当前书籍、无旧 Stitch tokens、无 WebView、回调槽位、TocEntry 字段 |

## 4. Zone-based overlay 架构结果

### 架构变更

**重构前**：
```
ReaderScreen.Box(fillMaxSize)
├── content
├── ReaderControlBase (全组件)
└── ReaderSearchOverlay(fillMaxSize) ← 全屏 opaque，覆盖一切
```

**重构后**：
```
ReaderScreen
└── ReaderControlBase(overlayState, overlayContent)
    └── Box(fillMaxSize)
        ├── content()
        ├── ReaderTopArea          ← 始终可见
        ├── [ReaderFloatingBrightness]  ← showBrightness 控制
        ├── [ReaderFloatingQuickActions] ← showQuickActions 控制
        ├── [ReaderFloatingPageControl]  ← showPageControl 控制
        ├── ReaderControlBottomBar ← 始终可见
        └── [Zone Box]            ← overlay 在限定 zone 内
            └── overlayContent()
```

### Zone 定义

| Zone | 定位 |
|------|------|
| Quick overlay panel | `top = topZoneHeight(92dp)`, `bottom = quickActionsBottomInset`, `horizontal = 18dp` |
| Bottom overlay panel | `top = topZoneHeight(92dp)`, `bottom = bottomOverlayBottomInset`, `horizontal = 18dp` |

### 显隐规则

| Overlay 类型 | 亮度条 | 快捷按钮 | 页内控制条 | 顶栏 | 底栏 |
|-------------|--------|---------|-----------|------|------|
| BaseControlVisible | 显示 | 显示 | 显示 | 显示 | 显示 |
| QuickActionOverlay | 隐藏 | 显示 | 显示 | 显示 | 显示 |
| BottomFunctionOverlay | 隐藏 | 隐藏 | 隐藏 | 显示 | 显示 |

实现方式：`ReaderControlBase` 内通过 `isQuickOverlay`/`isBottomOverlay` 布尔值驱动条件渲染。

## 5. P0 修复结果

| P0 | 描述 | 修复 | 验证 |
|----|------|------|------|
| P0-1 | 快捷弹窗全屏覆盖 | overlay 改为 zone Box（top=92dp, bottom=quickActionsBottomInset），不再使用 fillMaxSize opaque | `ReaderControlZoneOverlayTest` 验证 zone 定位 |
| P0-2 | 底栏弹窗全屏覆盖 | overlay 改为 zone Box（top=92dp, bottom=bottomOverlayBottomInset），不再使用 fillMaxSize opaque | `ReaderControlZoneOverlayTest` 验证 zone 定位 |
| P0-3 | ReaderControlBase 无 overlay-aware 显隐 | 新增 `overlayState` 参数 + `isQuickOverlay`/`isBottomOverlay` 驱动 `showBrightness`/`showQuickActions`/`showPageControl` | `ReaderControlOverlayVisibilityTest` 验证显隐规则 |

全部 3 个 P0 已修复。

## 6. P1 修复结果

| P1 | 描述 | 修复 | 验证 |
|----|------|------|------|
| P1-1 | 亮度 slider 静态占位 | 新增 `brightnessValue` 和 `onBrightnessChange` 参数，亮度 track 使用 `fillMaxHeight(brightnessValue)` 比例填充 | `ReaderControlBaselineRegressionTest` 验证新参数 |
| P1-2 | 正文缺章节标题 | 新增 `ContentArea` 组件，渲染章节标题 + 正文 | `ReaderControlOverlayVisibilityTest` 验证 ContentArea |
| P1-3 | TOC 缺右侧进度条 | `TocEntry` 新增 `progress: Float?`，目录 overlay 渲染 `LinearProgressIndicator` | `ReaderDirectoryOverlayBaselineTest` 验证进度条 |
| P1-4 | TOC 缺章节分级小字 | 目录 overlay 渲染 `L{level}` 层级标识 | `ReaderDirectoryOverlayBaselineTest` 验证 level badge |

全部 4 个 P1 已修复。

### 附修：底部间距 Bug
修复 `quickActionsBottomInset` 计算错误（原快操按钮与页内控制条 bottom padding 同为 76dp 导致重叠），正确的 quick actions bottom inset = `bottomBarHeight + bottomSafeGap + floatingPageControlHeight + controlGap + quickCircleSize + controlGap`。

## 7. 阅读页基线回归结果

| 基线项 | 状态 | 备注 |
|--------|------|------|
| 顶部第一行（返回/书名/refresh/swap/more） | 通过 | 无改动 |
| 顶部第二行（章节/source chip） | 通过 | 无改动 |
| 正文（章节标题+正文） | 通过 | 新增 ContentArea 含章节标题 |
| 亮度条（Auto图标+竖向track+箭头） | 通过 | brightnessValue 比例填充 |
| 四个圆形快捷按钮（无文字标签） | 通过 | 无改动 |
| 浮动页内控制条（本章翻页语义） | 通过 | 间距修正 |
| 固定底栏（目录/朗读/界面/设置） | 通过 | 无改动 |
| 快捷 overlay（搜索/自动翻页/内容替换） | 通过 | zone 定位 |
| 底栏 overlay（目录/朗读/界面/设置） | 通过 | zone 定位 + 显隐规则 |
| 目录（tabs/层级/进度/书签/当前章节） | 通过 | 新增进度条+层级标识 |
| 朗读 | 通过 | 无改动 |
| 界面（文字/段落/界面三部分） | 通过 | 无改动 |
| 设置（阅读行为 only） | 通过 | 无改动 |

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (18s), 53 actionable |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL (6s), 38 actionable |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL (40s), 29 actionable |

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | 通过 |
| 阅读页底栏仍为 目录/朗读/界面/设置 | 通过 |
| 快捷按钮无文字标签 | 通过 |
| 夜间模式无弹窗 | 通过 |
| 内容替换只显示当前书籍规则 | 通过 |
| 无 WebView runtime | 通过 |
| 未改 Core/parser/repository/book source | 通过 |
| 无 Stitch 旧色/旧类 | 通过 |
| 页内控制不使用 skip_previous/skip_next | 通过 |

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否建议设备端人工复核

建议重新安装 debug app，在 Reader 分组逐页复核阅读页控制层。重点验证：
- 阅读页基础控制层显示完整（所有 zone 可见）
- 点击搜索/自动翻页/内容替换：overlay 仅覆盖正文区，快捷按钮/页内控制/底栏仍可见
- 点击目录/朗读/界面/设置：overlay 仅覆盖正文区，顶栏/底栏仍可见，亮度条/快捷按钮/页内控制隐藏
- 目录 overlay 显示层级标识和右侧进度条
- 夜间模式不弹出 overlay
