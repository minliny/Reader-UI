# Loop 013 Report

## 当前 Slice
Slice 4：Reader control layer Compose prototype — Phase 4.3 BottomFunction overlays

## 本轮任务
LOOP-013：创建 `ui/reader/components/ReaderBottomFunctionOverlay.kt` — 实现 Directory/Tts/Appearance/Settings 四个底部功能 overlay

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/reader/components/ReaderBottomFunctionOverlay.kt`（新增，350+ lines）：
  - `TocEntry` / `AppSettingItem` / `AppSwitchItem` data types
  - `ReaderDirectoryOverlay()` — 目录书签弹窗：目录/书签分段 tab + 卷信息 + TOC 列表（层级缩进 + 书签标记 + 当前阅读位置 my_location） + 当前章节提示
  - `ReaderTtsOverlay()` — 朗读弹窗：状态头 + 当前章节 + 播放/暂停/停止按钮 + 进度条 + 语速/音量 slider + 定时关闭/朗读音色设置行。**不使用上一章/下一章语义**
  - `ReaderAppearanceOverlay()` — 界面弹窗：文字/段落/界面 三个分组，每组含设置项（字体/字号/字距/繁简/缩进/行距/段距/信息/翻页动画/主题）
  - `ReaderSettingsOverlay()` — 设置弹窗（仅阅读行为）：设置项 + Switch 项列表。**不含 WebDAV/书源/RSS/全局设置**
  - `ReaderBottomPanel()` — 共享底部面板容器
  - `TtsGroup` / `TtsSliderRow` / `TtsSettingRow` — TTS 子组件
  - `AppGroup` / `AppSettingRow` — 界面子组件

## 编译修复
- `AppSettingItem` data class 与 composable 函数命名冲突 → 函数重命名为 `AppSettingRow`

## 测试命令
```bash
./gradlew test
```

## 测试结果
**PASS** — BUILD SUCCESSFUL in 7m 14s，49 actionable tasks

## P0/P1
- P0：0
- P1：0

## 是否允许继续
允许。进入 LOOP-014。

## 下一轮建议
LOOP-014：为 BottomFunction overlays 新增测试 — 验证 设置 overlay 不混入 WebDAV/书源/RSS、目录页书签/进度标识、TTS 无上一章/下一章
