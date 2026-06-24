# Stitch Style Visual Alignment Report

## 1. 总体结论

STITCH_STYLE_VISUAL_ALIGNMENT_READY

## 2. 输入视觉真源

| 源 | 用途 |
|----|------|
| `docs/ui-handoff/css/reader-design-tokens.css` | 颜色/间距 token 真源 |
| `app/.../theme/ReaderColors.kt` | 已有 CSS→Compose 映射（已验证对齐） |
| `app/.../theme/ReaderTypography.kt` | 已有字体阶梯 |
| `app/.../theme/ReaderSpacing.kt` | 已有间距 token |

## 3. 修改范围

### 新增文件（3 files）

| 文件 | 说明 |
|------|------|
| `ui/components/ReaderNativeComponents.kt` (new) | 8 个自定义组件 |
| `test/.../ReaderNativeComponentContractTest.kt` (new) | 7 tests |
| `docs/.../STITCH_STYLE_VISUAL_ALIGNMENT_REPORT.md` (new) | 本报告 |

### 修改文件（2 files）

| 文件 | 说明 |
|------|------|
| `reader/components/ReaderControlBase.kt` | IconButton→ReaderIconButton, LinearProgressIndicator→ReaderProgressRail |
| `reader/components/ReaderBottomFunctionOverlay.kt` | Material3 Switch→ReaderSwitch |

## 4. Reader Native Visual System 结果

8 个自定义组件已建立：

| 组件 | 替代对象 | 关键特征 |
|------|---------|---------|
| `ReaderPanel` | Material3 Card | 12dp 圆角，0.5dp 轻边框，floatingControlBg |
| `ReaderIconButton` | Material3 IconButton | 无水波(indication=null)，统一 40dp touch area |
| `ReaderActionButton` | Material3 Button | 40dp 高度，轻边框，不是 Material 系统按钮 |
| `ReaderSwitch` | Material3 Switch | 36×22dp 紧凑尺寸，自定义 track/thumb 色 |
| `ReaderSlider` | Material3 Slider | 3dp 细轨道，无 Material 系统 thumb |
| `ReaderProgressRail` | LinearProgressIndicator | 水平/竖向，轻量无 stop indicator |
| `ReaderChip` | Material3 Chip | 0.5dp 轻边框，轻量填充 |
| `ReaderSettingRow` | 自定义 Row | minHeight 44dp，统一 label/value/icon |

## 5. 阅读页 Stitch 风格对齐结果

| 区域 | 变更 | 状态 |
|------|------|------|
| 顶部返回按钮 | IconButton→ReaderIconButton | ✅ |
| 顶部右侧图标 | IconButton→ReaderIconButton | ✅ |
| 页内控制 prev/next | IconButton→ReaderIconButton | ✅ |
| 页内进度条 | LinearProgressIndicator→ReaderProgressRail | ✅ |
| 设置/界面 Switch | Material3 Switch→ReaderSwitch | ✅ |
| 夜间模式 | 不是弹窗（不变） | ✅ |
| 目录行布局 | 不回归（不变） | ✅ |
| overlay zone | 不全屏（不变） | ✅ |

## 6. 去 Material3 化范围

| 组件 | 状态 |
|------|------|
| IconButton | ✅ 已替换为 ReaderIconButton |
| LinearProgressIndicator | ✅ 已替换为 ReaderProgressRail |
| Switch | ✅ 已替换为 ReaderSwitch |
| Slider | ⚠️ Material3 Slider 保留（TTS 语速/音量），可使用 ReaderSlider 替代 |
| Card | ⚠️ Material3 Card 部分保留（CommonComponents），可使用 ReaderPanel |

## 7. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| 主底栏不变 | ✅ |
| 阅读页底栏不变 | ✅ |
| overlay 不全屏 | ✅ |
| 目录行布局未回归 | ✅ |
| 夜间正文不是白底黑字 | ✅ |
| 无 WebView | ✅ |
| 未改 Core/parser/repository | ✅ |
| fake/real boundary 未破坏 | ✅ |

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test` | BUILD SUCCESSFUL (~899 tests) |
| `./gradlew assembleDebug` | BUILD SUCCESSFUL |
| `./gradlew lintDebug` | BUILD SUCCESSFUL |

## 9. P0/P1

0/0。

## 10. 是否建议设备端复核

建议安装 debug app，重点看阅读页是否更接近 Reader 风格，而不是 Material3 系统风格。
