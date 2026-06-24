# Stitch Initial Draft v0 修正队列

> 更新日期：2026-06-12
>
> 当前状态：`STITCH_INITIAL_DRAFT_V0_CORRECTION_P0_STILL_BLOCKED`

## P0

| ID | Screen | 状态 | 证据 / 剩余工作 |
| --- | --- | --- | --- |
| P0-01 | 49/50 派生状态 | `DONE_PENDING_TARGETED_REVIEW` | 中文 loading / empty / error 完整；`DERIVED_NOT_FINAL` 保留；暖白模板成立 |
| P0-02 | DARK token 修订稿 | `BLOCKED` | token 方向、viewport、源文本和 footer 已修；可见正文密度、标题对齐、第五段可见范围仍未与初稿一致 |

## P1

| ID | Screen | 状态 | 证据 |
| --- | --- | --- | --- |
| P1-01 | 阅读沉浸页 | `DONE_PENDING_TARGETED_REVIEW` | 固定 `390×884`，四角信息与底部安全区完整 |
| P1-02 | 搜索弹层 | `DONE_PENDING_TARGETED_REVIEW` | 黑色设备框已移除，统一 overlay shell |
| P1-03 | 自动翻页弹层 | `DONE_PENDING_TARGETED_REVIEW` | 标题、关闭、控件和底部按钮语言统一 |
| P1-04 | 目录/书签弹层 | `DONE_PENDING_TARGETED_REVIEW` | 补搜索/菜单/摘要；无左竖线；增加“当前阅读” |

## P2

| ID | Screen | 状态 | Polish |
| --- | --- | --- | --- |
| P2-01 | 书架 | `DEFERRED` | 统一封面裁切、卡片明暗与元信息层级 |
| P2-02 | 书籍详情 | `DEFERRED` | 提高元信息和目录摘要的缩略可读性 |
| P2-03 | 书源管理 | `DEFERRED` | 增加批量检测/刷新入口，统一状态标签 |
| P2-04 | 设置/发现/RSS | `DEFERRED` | 对齐标题基线、底栏图标重量和卡片边界 |
| P2-05 | Light 全局 | `DEFERRED` | 清理残余冷白表面 |

## 下一执行项

1. 以 DARK 初稿 screen 为结构母版生成 token 版本，只替换颜色变量。
2. 确认标题对齐、正文行宽/字号/行高/段距、可见段落范围和四角坐标一致。
3. 更新 DARK PNG 与 manifest。
4. P0 关闭后执行 49/50、DARK、overlay、阅读 viewport 定向复审。

## 门禁

- 可以进入定向复审：`NO`。
- 可以进入开发交付：`NO`。
- 最终状态：`STITCH_INITIAL_DRAFT_V0_CORRECTION_P0_STILL_BLOCKED`。
> **DEPRECATED_DO_NOT_USE (2026-06-12)**
>
> This queue describes the unusable Stitch-generated initial-draft-v0 output.
> Do not continue prompt-based correction, redesign, redraw, or regeneration.
> The replacement project is upload-only and all source items remain
> `humanReviewResult: PENDING` and `usable: false` until human review.
