# Reader Control Device Feedback Fix Report

## 1. 总体结论

READER_CONTROL_DEVICE_FEEDBACK_FIX_READY

## 2. 输入反馈

| # | 问题 | 严重程度 |
|---|------|---------|
| 1 | 夜间模式的正文部分还是白底黑字，应该反过来 | P0 |
| 2 | 目录页结构很奇怪 | P0 |
| 3 | 控制弹层的配置文字和开关图标大小不匹配 | P1 |
| 4 | 内容替换页应该显示替换规则的具体内容，而不是规则描述 | P0 |

## 3. 修改范围

**修改文件（8 files）**:

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/.../reader/components/ReaderControlBase.kt` | 修改 | 外层 Box 新增 `background(ReaderTheme.colors.paperBg)`，夜间模式自动切换底色 |
| `app/.../reader/components/ReaderBottomFunctionOverlay.kt` | 修改 | 目录 overlay 去除卡片边框；统一配置行高 `SettingRowMinHeight=44dp`、`SettingRowIconSize=20dp`；Switch 尺寸统一 `Modifier.size(40dp, 24dp)` |
| `app/.../reader/components/ReaderQuickActionOverlay.kt` | 修改 | `ReplaceRule` 新增 pattern/replacement/scope 字段；Replace 规则渲染改为显示匹配/替换/范围详情 |
| `app/.../reader/ReaderRuntimeState.kt` | 修改 | `ReaderReplaceRuleUiModel` 新增 pattern/replacement/scope |
| `app/.../reader/ReaderRuntimeFixture.kt` | 修改 | sampleReplaceRules 改为具体正则规则（去除章节尾广告/清理发布页提示/统一省略号） |
| `app/.../reader/ReaderScreen.kt` | 修改 | ReplaceRule 映射适配新字段 |
| `app/.../reader/ReaderDirectoryOverlayBaselineTest.kt` | 修改 | 更新 level 测试为缩进驱动验证 |
| `app/.../reader/ReaderRuntimeStateBridgeTest.kt` | 修改 | 更新 replace rule 名称匹配和新增 pattern/replacement/scope 断言 |

## 4. 夜间模式修复结果

**修改**: `ReaderControlBase.kt` 外层 Box 新增 `Modifier.background(ReaderTheme.colors.paperBg)`

`ReaderColors.Night.paperBg = Color(0xFF181F22)`（深色）替代原来的透明/系统默认色，保证正文区域背景变为深色。

`ContentArea` 中的文字使用 `ReaderTheme.colors.bodyText`，在 `ReaderColors.Night` 下为 `Color(0xFFD8CCC4)`（浅暖灰）。控制层顶栏/底栏使用 `ReaderTheme.colors.softTopBg`/`bottomBarBg` 等，均为 Night palette 值。

快捷按钮夜间图标 `Icons.Filled.DarkMode` 表示当前夜间状态，点击后切换回日间模式。

## 5. 目录页结构修复结果

**修改**: 去除每项条目的 `clip`/`border` 卡片装饰，改为简洁列表行。

保留元素：
- 顶部 "目录"/"书签" segmented tabs
- 卷/层级信息小字（`volumeInfo`）
- 层级缩进 `(entry.level - 1) * 10` dp
- 书签标识（`Icons.Filled.ChevronRight`，14dp）
- 当前阅读章节标识（`Icons.Filled.MyLocation`，14dp，isCurrent 蓝色高亮背景）
- 标题（isCurrent 时用 primary 颜色 + 10% alpha 背景）
- 右侧常驻进度条（`LinearProgressIndicator`，40dp × 4dp）
- 底部 "当前阅读章节：{currentChapter}"

## 6. 配置 row 尺寸修复结果

统一 token：
- `SettingRowMinHeight = 44.dp`（所有配置行统一最小高度）
- `SettingRowIconSize = 20.dp`（ChevronRight 图标统一尺寸）
- Switch 统一 `Modifier.size(40.dp, 24.dp)`

影响范围：
- `AppSettingRow`（界面 overlay）
- `TtsSettingRow`（朗读 overlay）
- Settings overlay items/switches

## 7. 内容替换规则内容修复结果

**ReplaceRule 新字段**:
- `name: String` — 规则名称
- `pattern: String` — 匹配表达式
- `replacement: String` — 替换结果
- `scope: String` — 匹配范围
- `enabled: Boolean` — 启用状态

**Fixture 示例**:
1. 去除章节尾广告：匹配 `请收藏本站.*$` → 替换：空 → 范围：当前书籍
2. 清理发布页提示：匹配 `本章由.*?整理` → 替换：空 → 范围：当前章节
3. 统一省略号：匹配 `\.{3,}` → 替换：…… → 范围：正文内容

**渲染**: 每条规则显示名称、范围、匹配表达式、替换结果，附带启用/禁用 Switch。

## 8. 测试结果

| 检查项 | 结果 |
|--------|------|
| `./gradlew test --no-daemon` | BUILD SUCCESSFUL (644 tests, 0 failures) |
| `./gradlew assembleDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew lintDebug --no-daemon` | BUILD SUCCESSFUL |
| `./gradlew installDebug --no-daemon` | BUILD SUCCESSFUL (Installed on IN2020) |

## 9. 回归守卫

| 守卫项 | 状态 |
|--------|------|
| App 主底栏仍为 书架/发现/书源/我的 | 通过 |
| 阅读页底栏仍为 目录/朗读/界面/设置 | 通过 |
| Quick overlay 不全屏 | 通过 |
| Bottom overlay 不全屏 | 通过 |
| 夜间模式不是弹窗 | 通过 |
| 内容替换只显示当前书籍匹配规则 | 通过 |
| 设置 overlay 不包含 WebDAV/书源/RSS/关于 | 通过 |
| 无 Stitch 旧色/旧类 | 通过 |
| 无 WebView runtime | 通过 |
| 未改 Core/parser/repository/book source | 通过 |

## 10. 是否仍有 P0

无。

## 11. 是否仍有 P1

无。

## 12. 是否建议设备端复核

建议重新安装 debug app，重点复核：
- 夜间模式：正文背景为深色，文字为浅色
- 目录/书签 overlay：条目简洁清晰，有缩进、书签标识、当前章节标识、进度条
- 界面/设置 overlay：配置行文字与开关尺寸协调
- 内容替换 overlay：显示具体匹配表达式和替换结果
