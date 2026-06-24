# Reader Control Layer Device Review Report

## 1. 总体结论

READER_CONTROL_LAYER_DEVICE_REVIEW_READY

（基于代码分析 + 测试验证 + build 验证；建议人工在设备端逐页复核）

## 2. 设备与安装结果

| 项目 | 结果 |
|------|------|
| `adb devices` | `dc54254d device` (IN2020, Android 13) |
| `assembleDebug` | BUILD SUCCESSFUL (clean rebuild) |
| `installDebug` | BUILD SUCCESSFUL, Installed on 1 device |
| App 启动 | `com.reader.android/.MainActivity` 启动成功 |
| UI dump | Prototype Gallery ("UI 原型预览") 可见，38 个条目正常渲染，`已选` 状态正常 |

## 3. 基础控制层复核

**源码验证** (`ReaderControlBase.kt`):

| 检查项 | 代码位置 | 结果 |
|--------|---------|------|
| 顶部第一行：返回/居中书名/refresh/swap/more | Line 146-180 | 通过 |
| 顶部第二行：当前章节/source chip | Line 181-212 | 通过 |
| 正文含章节标题（P1 修复） | `ReaderScreen.kt` ContentArea | 通过 |
| 左侧亮度条：Auto 图标/竖向 track/箭头/比例填充（P1 修复） | Line 222-263 | 通过 |
| 四圆形快捷按钮（无 Text composable） | Line 265-298 | 通过 |
| 页内控制条（本章语义，无 skip） | Line 300-352 | 通过 |
| 固定底栏（目录/朗读/界面/设置） | Line 354-398 | 通过 |
| 底部间距不重叠（已修复） | `quickActionsBottomInset` 计算 | 通过 |

**测试验证**: `ReaderControlBaseStructureTest` 全部 11 项通过，`ReaderControlBaselineRegressionTest` 全部 18 项通过。

## 4. 快捷 overlay 复核

### 搜索 overlay

**源码**: `ReaderQuickActionOverlay.kt:63-163` (ReaderSearchOverlay)
- 搜索输入框 + "搜索本章内容" placeholder
- "共 X 处结果" meta
- 结果片段 LazyColumn
- "上一个结果"/"下一个结果" 导航
- ✅ 测试: `ReaderQuickActionOverlayStructureTest` 验证

### 自动翻页 overlay

**源码**: `ReaderQuickActionOverlay.kt:165-288` (ReaderAutoScrollOverlay)
- 运行/暂停状态
- 开始/暂停/停止 按钮
- 速度 slider (Slow/Medium/Fast)
- 翻页方式 (滚动/点击翻页/连续滚动)
- ✅ 测试: 全部 3 档速度 + 3 种模式验证

### 内容替换 overlay

**源码**: `ReaderQuickActionOverlay.kt:290-386` (ReaderReplaceOverlay)
- "当前书籍：{bookName}" — 仅当前书籍规则
- "仅显示当前书籍匹配到的替换规则"
- 规则列表（toggle Switch）
- 应用/取消/恢复原文 按钮
- ✅ 测试: 全局规则相关禁止项全部排除

### 夜间状态

**源码**: `ReaderNightState.kt:29-74`
- 不是弹窗（无 Dialog/AlertDialog）
- 日间/夜间模式切换（`ReaderVisualMode.Day/Night`）
- Toast 提示 "已切换夜间/日间模式"
- 控制层结构不变（仅主题色切换）
- ✅ 测试: Night state 为 `BaseControlVisible` 非 overlay

## 5. 底栏 overlay 复核

### 目录/书签 overlay

**源码**: `ReaderBottomFunctionOverlay.kt:67-173` (ReaderDirectoryOverlay)
- 顶部 "目录"/"书签" segmented tabs
- 卷信息文本（volumeInfo）
- 层级缩进 `(level - 1) * 10` dp
- **P1 修复**: 右侧常驻进度条 `LinearProgressIndicator` (36dp × 4dp)
- **P1 修复**: 层级标识 `L{level}` 文字
- 书签标识 `Icons.Filled.ChevronRight`
- 当前阅读章节标识 `Icons.Filled.MyLocation` + isCurrent 蓝色背景
- 底部 "当前阅读章节：{currentChapter}"
- ✅ 测试: `ReaderDirectoryOverlayBaselineTest` 全部 11 项通过

### 朗读 overlay

**源码**: `ReaderBottomFunctionOverlay.kt:177-267` (ReaderTtsOverlay)
- 朗读状态（正在朗读/已暂停）
- 播放/暂停 + 停止 按钮
- 朗读进度（时间 + progress bar）
- 语速 slider (0.5x..3x)
- 音量 slider
- 定时关闭 + 朗读音色 设置行
- "当前章节" 信息
- ✅ 测试: 无 skip_previous/skip_next 等章节跳转语义

### 界面 overlay

**源码**: `ReaderBottomFunctionOverlay.kt:334-406` (ReaderAppearanceOverlay)
- 文字: 字体/字号/字距/繁简
- 段落: 缩进/行距/段距
- 界面: 信息/翻页动画/主题
- ✅ 测试: 全部 12 个字段验证通过

### 设置 overlay

**源码**: `ReaderBottomFunctionOverlay.kt:409-480` (ReaderSettingsOverlay)
- 标题 "设置" + "阅读行为" subtitle
- AppSettingItem: 屏幕方向/屏幕超时/单双页/进度条行为
- AppSwitchItem: 隐藏状态栏/文字两端对齐/文字底部对齐/音量键翻页/单手翻页
- ✅ 排除项: 无 WebDAV/书源/RSS/备份/关于/全局设置
- ✅ 测试: 全部禁止项验证通过

## 6. zone-based overlay 结果

| 检查项 | 实现 | 状态 |
|--------|------|------|
| 快捷 overlay 不全屏 | zone Box `top=92dp, bottom=quickActionsBottomInset` | 通过 |
| 底栏 overlay 不全屏 | zone Box `top=92dp, bottom=bottomOverlayBottomInset` | 通过 |
| QuickActionOverlay 隐藏亮度条 | `!isQuickOverlay && !isBottomOverlay` | 通过 |
| QuickActionOverlay 保留快捷按钮 | `showQuickActions = !isBottomOverlay` | 通过 |
| QuickActionOverlay 保留页内控制条 | `showPageControl = !isBottomOverlay` | 通过 |
| QuickActionOverlay 保留底栏 | 无条件渲染 | 通过 |
| BottomFunctionOverlay 隐藏亮度条 | `showBrightness` 规则 | 通过 |
| BottomFunctionOverlay 隐藏快捷按钮 | `showQuickActions` 规则 | 通过 |
| BottomFunctionOverlay 隐藏页内控制条 | `showPageControl` 规则 | 通过 |
| BottomFunctionOverlay 保留底栏 | 无条件渲染 | 通过 |
| 顶栏始终可见 | 无条件渲染 | 通过 |
| 无重叠（底部间距已修正） | `quickActionsBottomInset` 正确计算 | 通过 |

**源码位置**: `ReaderControlBase.kt:81-130`

## 7. 发现问题列表

无。

基于代码分析和测试验证，未发现 P0/P1/P2 问题。

注意：因 adb LazyColumn 导航限制，以下项目未能通过 UI dump 逐帧核实，建议人工复核：
- overlay panel 的具体视觉大小（约 3/4 正文区域）
- 颜色 Token 的视觉一致性
- 字体大小和间距的视觉比例
- overlay panel 与底栏/顶栏的边界是否有 1-2dp 视觉异常

## 8. 是否仍有 P0

无。

## 9. 是否仍有 P1

无。

## 10. 是否建议提交或 push

当前已提交（commit `8127730`），不建议自动 push；等待用户手动确认后 push。

建议用户在设备端完成以下人工复核后再 push：
1. 在 Prototype Gallery Reader 分组依次打开 9 个页面
2. 确认 overlay 不全屏，保留的外围控件可见
3. 确认目录 overlay 有层级标识和进度条
4. 确认设置 overlay 无 WebDAV/书源/RSS/关于
5. 确认夜间模式不弹出弹窗
