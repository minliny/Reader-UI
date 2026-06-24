# Slice 14 Reader Runtime State Bridge Report

## 1. 总体结论

**SLICE_14_READER_RUNTIME_STATE_BRIDGE_READY**

---

## 2. Git 状态

| 项目 | 值 |
|---|---|
| 当前 HEAD | `9e6e059 feat: harden source management UI state` |
| Slice 13 是否提交 | 是，commit `9e6e059` |
| 是否 push | 否 |

---

## 3. 修改范围

### 新增生产文件（3 个）
- `app/src/main/kotlin/com/reader/android/ui/reader/ReaderRuntimeState.kt` — 14 个 model/data class，含 ReaderRuntimeUiState 综合状态
- `app/src/main/kotlin/com/reader/android/ui/reader/ReaderRuntimeMapper.kt` — state → control params 映射器
- `app/src/main/kotlin/com/reader/android/ui/reader/ReaderRuntimeFixture.kt` — 伪造 9 态 reading fixture

### 修改文件（1 个）
- `app/src/main/kotlin/com/reader/android/ui/reader/ReaderScreen.kt` — 新增 `runtimeState` 参数 + `StateDrivenReaderScreen()` composable

### 新增测试（3 个）
- `ReaderRuntimeStateBridgeTest.kt` — 10 tests
- `ReaderControlLayerStateTest.kt` — 12 tests
- `ReaderRuntimeBoundaryGuardTest.kt` — 8 tests

---

## 4. Reader Runtime State 结果

| 模型 | 说明 |
|---|---|
| `ReaderRuntimeUiState` | 综合运行时状态（book/chapter/content/progress/controlLayer/isNightMode/brightnessDock/tts/autoScroll/replaceRules/toc/search/loading/error） |
| `ReaderBookUiModel` | 书名 + 书源 + tocUrl |
| `ReaderChapterUiModel` | 章节标题 + 章节索引 |
| `ReaderContentUiModel` | 正文内容 + 上一页/下一页可用标志 |
| `ReaderPageProgressUiModel` | 本章内进度（0-1） |
| `ReaderControlLayerState` | sealed interface: BaseControlVisible / QuickActionOverlay / BottomFunctionOverlay |
| `ReaderOverlayType` | NONE/SEARCH/AUTO_SCROLL/REPLACE/DIRECTORY/TTS/APPEARANCE/SETTINGS |
| `ReaderBrightnessDockState` | 左/右停靠 + autoBrightness |
| `ReaderTtsState` | IDLE/PLAYING/PAUSED |
| `ReaderAutoScrollState` | IDLE/RUNNING/PAUSED |
| `ReaderReplaceRuleUiModel` | 当前书籍规则（名称/描述/启用） |
| `ReaderTocBookmarkState` | 目录/书签条目 + volumeInfo |
| `ReaderSearchUiModel` | 搜索查询 + 结果 |

---

## 5. ReaderScreen 接入结果

- 新增 `runtimeState: ReaderRuntimeUiState? = null` 参数
- 当 `runtimeState != null` 时，进入 `StateDrivenReaderScreen()` 路径
- `StateDrivenReaderScreen` 根据 `controlLayerState` 渲染对应 overlay
- 当 `runtimeState == null` 时，保留原有 ViewModel 路径（向后兼容）
- 9 个控制层状态均通过 fixture 可独立渲染

---

## 6. 控制层行为规则结果

| 规则 | 状态 |
|---|---|
| 夜间模式无弹窗（NightState 是 ReaderNightState wrapper，不产生 overlay） | PASS |
| QuickActionOverlay 隐藏亮度条（保留快捷按钮、浮动页内控制、底栏） | PASS |
| BottomFunctionOverlay 隐藏亮度条、快捷按钮、浮动页内控制（保留顶栏和底栏） | PASS |
| 内容替换只显示当前书籍规则（replaceRules 在 RuntimeUiState 中） | PASS |
| 页内控制使用本章进度（0-1 float），不使用 skip_previous/skip_next | PASS |
| 亮度条左右停靠通过 BrightnessDock enum | PASS |
| 阅读页设置不混入 WebDAV/书源/RSS | PASS |

---

## 7. Adapter / Mapper 结果

- `ReaderRuntimeMapper` 是纯 UI 层映射，无网络/数据库/Core 副作用
- `ReaderRuntimeFixture` 是纯内存 fixture，不访问真实网络
- ReaderScreen state-driven 路径不调用 Reader-Core bridge/parser

---

## 8. 测试结果

| 命令 | 结果 |
|---|---|
| `./gradlew test` | BUILD SUCCESSFUL in 6s，49 tasks |
| `./gradlew assembleDebug` | BUILD SUCCESSFUL in 10s（clean build） |
| `./gradlew lintDebug` | BUILD SUCCESSFUL in 45s |

---

## 9. 回归守卫

| 检查项 | 状态 |
|---|---|
| 无 Stitch 旧类（bg-surface-container 等） | PASS |
| 无旧色（#fdf6ec 等） | PASS |
| 无 WebView / normalized-html runtime | PASS |
| 未修改 Reader-Core bridge/parser/repository | PASS |
| fake/real boundary 未破坏 | PASS |
| 未重写阅读引擎 | PASS |
| skip_previous/skip_next 未使用 | PASS |
| 夜间模式非弹窗 | PASS |

---

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否允许进入 Slice 15

允许进入 Slice 15 WebDAV/RSS static-to-state adapter。
