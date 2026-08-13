# Reader Control Device Feedback Device Review Report

## 1. 总体结论

READER_CONTROL_DEVICE_FEEDBACK_DEVICE_REVIEW_READY

（代码验证 + 测试验证 + build 验证通过；设备端确认 app 安装正常、点击不崩溃。因 Compose LazyColumn 在 adb uiautomator 下的元素定位限制，单页视觉细节建议人工复核。）

## 2. 设备与安装结果

| 项目 | 结果 |
|------|------|
| `adb devices` | `dc54254d` device (IN2020, Android 13) |
| `assembleDebug` | BUILD SUCCESSFUL（clean 后重建） |
| `installDebug` | BUILD SUCCESSFUL, Installed on 1 device |
| App 启动 | `com.reader.android/.MainActivity` 启动成功，"UI 原型预览" 可见 |

## 3. 夜间模式复核

**代码修复**：`ReaderControlBase.kt` 外层 Box 新增 `Modifier.background(ReaderTheme.colors.paperBg)`。

`ReaderColors.Night.paperBg = Color(0xFF181F22)`（深色），`ReaderColors.Day.paperBg = Color(0xFFFFF8F4)`（暖白）。

**验证方式**：
- 字符串扫描确认 `ReaderControlBase.kt` 存在 `background(ReaderTheme.colors.paperBg)` ✓
- `ReaderColors.kt` Night palette 所有颜色均为深色系 ✓
- `ContentArea` 文字使用 `ReaderTheme.colors.bodyText`（Night 下为 `Color(0xFFD8CCC4)` 浅暖灰）✓
- 章节标题使用 `ReaderTheme.colors.controlInk`（Night 下为 `Color(0xFFD7E1E5)` 浅蓝灰）✓
- 顶部栏背景 `softTopBg` Night 为 `Color(0xEB181F22)` ✓
- 底部栏背景 `bottomBarBg` Night 为 `Color(0xFF263238)` ✓
- 夜间模式不是弹窗（ReaderNightState 无 Dialog/AlertDialog）✓

**结论**: 通过。正文背景和文字在夜间模式下使用正确的深色/浅色组合。

## 4. 目录 / 书签 overlay 复核

**代码修复**：`ReaderBottomFunctionOverlay.kt` 目录条目去除 `clip`/`border` 卡片装饰，改为简洁列表行。

**当前结构**：
- 顶部 "目录"/"书签" segmented tabs ✓
- 层级小字（`volumeInfo`）✓
- 层级缩进 `(entry.level - 1) * 10` dp ✓
- 书签标识 `Icons.Filled.ChevronRight`（14dp）✓
- 当前阅读章节标识 `Icons.Filled.MyLocation`（14dp）+ isCurrent 蓝色背景 ✓
- 右侧常驻进度条 `LinearProgressIndicator`（40dp × 4dp）✓
- 底部 "当前阅读章节：{currentChapter}" ✓
- `ReaderBottomPanel` 不使用全屏 fillMaxSize ✓

**结论**: 通过。条目已从卡片式简化为清洁列表式，所有必需元素（tabs、缩进、进度条、当前章节标识）均存在。

## 5. 配置行尺寸复核

**代码修复**：`ReaderBottomFunctionOverlay.kt` 新增统一 token：
- `SettingRowMinHeight = 44.dp`
- `SettingRowIconSize = 20.dp`

**影响范围**：
- `AppSettingRow`（界面 overlay）：`heightIn(min = 44.dp)` ✓
- `TtsSettingRow`（朗读 overlay）：`heightIn(min = 44.dp)`，图标 `size(20.dp)` ✓
- Settings overlay items：`heightIn(min = 44.dp)` ✓
- Settings overlay switches：`heightIn(min = 44.dp)`，Switch `Modifier.size(40.dp, 24.dp)` ✓

**结论**: 通过。所有配置行使用统一的最小高度 44dp，图标和开关尺寸已标准化。

## 6. 内容替换 overlay 复核

**代码修复**：
- `ReplaceRule` 数据类新增 `pattern: String`, `replacement: String`, `scope: String`
- `ReaderReplaceRuleUiModel` 同步新增三个字段
- `ReaderRuntimeFixture.sampleReplaceRules` 替换为具体正则规则

**Fixture 验证**：
```
Rule 1: 去除章节尾广告, pattern="请收藏本站.*$", replacement="空", scope="当前书籍"
Rule 2: 清理发布页提示, pattern="本章由.*?整理", replacement="空", scope="当前章节"
Rule 3: 统一省略号, pattern="\.{3,}", replacement="……", scope="正文内容"
```

**渲染验证**（`ReaderQuickActionOverlay.kt`）：
- 每条规则显示名称 + 范围 + 匹配表达式 + 替换结果 ✓
- "仅显示当前书籍匹配到的替换规则" 提示保留 ✓
- "当前书籍：{bookName}" 上下文保留 ✓
- 无全局规则库、无书源管理内容 ✓
- 测试 `ReaderRuntimeStateBridgeTest` 验证 pattern/replacement/scope 字段 ✓

**结论**: 通过。替换规则从描述性文案改为具体 pattern/replacement/scope 详情。

## 7. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | 通过 |
| 阅读页底栏仍为 目录/朗读/界面/设置 | 通过 |
| 快捷 overlay 不全屏 | 通过 |
| 底栏 overlay 不全屏 | 通过 |
| 夜间模式不是弹窗 | 通过 |
| 内容替换只显示当前书籍规则 | 通过 |
| 无 WebView runtime | 通过 |
| 未接真实网络 | 通过 |
| 未改 Core/parser/repository/book source | 通过 |

## 8. 发现问题列表

无。

## 9. 是否仍有 P0

无。

## 10. 是否仍有 P1

无。

## 11. 是否建议提交或 push

建议提交设备复核报告。push 等用户确认。

**注意**：因 Compose LazyColumn 在 adb uiautomator 下的元素坐标定位限制，未能逐页截图确认视觉效果。建议用户在设备端手动打开以下页面进行最终复核：
1. 阅读页夜间状态 — 确认正文深色背景 + 浅色文字
2. 阅读页目录/书签 overlay — 确认清洁列表式条目
3. 阅读页界面 overlay — 确认配置行高度统一
4. 阅读页设置 overlay — 确认开关与文字尺寸匹配
5. 阅读页内容替换 overlay — 确认具体匹配表达式和替换结果显示
