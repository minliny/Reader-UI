# Loop 009 Report

## 当前 Slice
Slice 4：Reader control layer Compose prototype — Phase 4.1 基座组件

## 本轮任务
LOOP-009：创建 `ui/reader/components/ReaderControlBase.kt` — 实现 `BaseControlVisible` 状态：底栏 + 浮动页内控制 + 快捷按钮 + 亮度条，参照 `control-layer-base-v2.html`

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/reader/components/ReaderControlBase.kt`（新增，277 lines）：
  - `BrightnessDock` enum — Left/Right
  - `ReaderControlBase()` — 主入口 composable，Box 叠加 5 个控制区 + content slot
  - `ReaderTopArea()` — 顶部栏 + 元信息行（返回/刷新/换源/更多 + 章节标题 + 书源 chip）
  - `ReaderFloatingBrightness()` — 竖向亮度条（auto 图标 + track + 箭头），支持左右停靠
  - `ReaderFloatingQuickActions()` — 4 个圆形快捷按钮（搜索/自动翻页/内容替换/夜间模式），无可见文字标签
  - `ReaderFloatingPageControl()` — 浮动翻页控制（上一页/进度条/下一页），使用「本章内上一页/下一页」语义
  - `ReaderControlBottomBar()` — 底栏 4 项（目录/朗读/界面/设置），带可见标签
  - 全部使用 `ReaderTheme` tokens
  - 所有 icon-only 控件有 `contentDescription`
  - 快捷按钮无 visible text label（纯圆形图标）
  - 页内控制使用「本章内上一页/下一页」，不使用「上一章/下一章」
  - 夜间模式作为快捷按钮（toggle），不是弹窗

## 新增/更新测试
无（测试将在 LOOP-010 新增）

## 测试命令
```bash
./gradlew test
```

## 测试结果
**PASS** — BUILD SUCCESSFUL in 5m，49 actionable tasks，16 executed

## 回归扫描
- 旧 class/色值：无
- `skip_previous`/`skip_next`：无
- 上一章/下一章：无（使用本章内上一页/下一页）
- 本章阅读进度 + 百分比语义：正确
- 夜间模式作为快捷按钮 toggle：正确

## P0/P1
- P0：0
- P1：0

## 是否允许继续
允许。进入 LOOP-010。

## 下一轮建议
LOOP-010：为 `ReaderControlBase` 新增 UI 测试 — 验证底部栏高度 68dp、快捷按钮无文字标签、浮动页内控制语义、亮度条
