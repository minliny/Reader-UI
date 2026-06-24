# Stitch 页面 source gap 重新复核

- 项目 ID：`6080030181007410630`
- 复核日期：`2026-06-12`
- 复核对象：原 37 条 source gap
- 真实缺少合格当前 source 的页面：`5`
- 自动人工 PASS：`0`
- 页面级 `usable=true`：`0`
- 本文件只纠正“是否缺 source”的判断，不批准上传。

## 复核结论

原缺口表混淆了四类对象：

1. 已被当前采用版替代的旧编号；
2. 当前模块内容图与对应的 04-2 标准候选；
3. 流程图、运行态、状态说明等非独立页面材料；
4. 已由人工明确否决并排除的 48/51 组。

这些对象都不应继续统计为“需要新 source 图片的页面”。其中现行候选仍需按
准确 SHA256 进行人工视觉审核；流程和状态材料只可按限定角色使用；48/51 继续排除。

## 37 项逐项复核

| 原页面名 | 复核类型 | 当前依据或替代材料 | 修正结论 | 仍需人工处理 | pageUsable |
| --- | --- | --- | --- | --- | --- |
| 11-auto-page-turn-running-capsule | 当前运行态参考 | `11-auto-page-turn-running-capsule.png` | 不是独立全屏页面；保留 `RUNNING_STATE_REFERENCE`，人工已确认 referenceOnly | 不需要补图 | false |
| 16-4-reader-toc-quick-panel | 旧编号 | `16-6-reader-toc-quick-panel-04-2-standard.png`；`16-5` 仅作模块内容参考 | `16-4` 为历史旧版，不建立独立页面，不需要补图 | 审核 `16-6` 候选 | false |
| 16-5-reader-toc-quick-panel-height-aligned | 模块内容参考 | `16-6-reader-toc-quick-panel-04-2-standard.png` + `16-5` 内容参考 + `04-2` 固定结构 | 已有当前候选，不是 source gap | 审核 `16-6` 候选及组合关系 | false |
| 18-1-read-aloud-quick-panel | 旧编号 | `18-4-read-aloud-quick-panel-04-2-standard.png`；`18-3` 仅作模块内容参考 | `18-1` 为历史旧版，不建立独立页面，不需要补图 | 审核 `18-4` 候选 | false |
| 18-2-read-aloud-quick-panel-revised | 旧编号 | `18-4-read-aloud-quick-panel-04-2-standard.png`；`18-3` 仅作模块内容参考 | `18-2` 为历史旧版，不建立独立页面，不需要补图 | 审核 `18-4` 候选 | false |
| 18-3-read-aloud-quick-panel-height-aligned | 模块内容参考 | `18-4-read-aloud-quick-panel-04-2-standard.png` + `18-3` 内容参考 + `04-2` 固定结构 | 已有当前候选，不是 source gap | 审核 `18-4` 候选及组合关系 | false |
| 19-1-read-aloud-running-capsule-height-aligned | 当前运行态参考 | `19-1-read-aloud-running-capsule-height-aligned.png` | 当前朗读运行态，不是独立全屏页面，不需要补图 | 确认限定为 `RUNNING_STATE_REFERENCE` | false |
| 19-read-aloud-running-capsule | 旧编号 | `19-1-read-aloud-running-capsule-height-aligned.png` | `19` 为高度对齐前旧版，不建立独立页面 | 无 | false |
| 21-1-reader-appearance-quick-panel | 模块内容参考 | `21-2-reader-appearance-quick-panel-04-2-standard.png` + `21-1` 内容参考 + `04-2` 固定结构 | 已有当前候选，不是 source gap | 审核 `21-2` 候选及组合关系 | false |
| 21-reader-appearance-flow | 流程材料 | `21-reader-appearance-flow.png` | 不是目标页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 22-1-reader-settings-quick-panel | 旧编号 | `22-3-reader-settings-quick-panel-04-2-standard.png`；`22-2` 仅作模块内容参考 | `22-1` 为历史旧版，不建立独立页面 | 审核 `22-3` 候选 | false |
| 22-2-reader-settings-quick-panel-height-aligned | 模块内容参考 | `22-3-reader-settings-quick-panel-04-2-standard.png` + `22-2` 内容参考 + `04-2` 固定结构 | 已有当前候选，不是 source gap | 审核 `22-3` 候选及组合关系 | false |
| 22-reader-settings-flow | 流程材料 | `22-reader-settings-flow.png` | 不是目标页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 23-reader-night-mode-state | 状态材料 | `23-reader-night-mode-state.png` | 多状态说明，不是单独主页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 24-reader-source-switch-flow | 流程材料 | `24-1` / `24-2` / `24-3` + `24` 流程图 | `24` 不是页面；三个状态图已存在，但外观需按 `04-2` 修正 | 设计冻结前确认修正规则，不是补图缺口 | false |
| 25-1-reader-top-more-menu | 旧编号 | `25-4-reader-top-more-menu-height-aligned.png` | `25-1` 为旧版；`25-4` 是当前采用版，已按准确 SHA256 获得人工 PASS，不需要补图 | 图片级审核已完成；页面仍等待 final token 和页面级审核 | false |
| 25-reader-top-more-menu-flow | 流程材料 | `25` 流程图 + `25-4` 当前菜单 + `25-2/25-3` 状态材料 | `25` 不是页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 26-reader-brightness-system-state | 状态材料 | `26-reader-brightness-system-state.png` | 多状态说明，不是单独主页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 27-reader-chapter-progress-flow | 流程材料 | `27-reader-chapter-progress-flow.png` | 流程说明，不是单独主页面；只作 `FLOW_REFERENCE` | 不需要补图 | false |
| 28-reader-appearance-main-panel | 信息结构参考 | `21-2-reader-appearance-quick-panel-04-2-standard.png` + `28` 字段拆解 | 当前主面板由 `21-2` 表达；`28` 不作为视觉基准，不需要补图 | 审核 `21-2` 候选 | false |
| 29-reader-appearance-font-selection | 现有参考稿不合格 | `35-reader-appearance-font-selection-standard.png` | 图片存在，但缺少规格要求的字体管理内容且视口不符；不能作为最终 source | 需要修正版 source | false |
| 30-reader-appearance-theme-selection | 现有参考稿不合格 | `36-reader-appearance-theme-selection-standard.png` | 图片存在，但主题卡缺正文预览且视口不符；不能作为最终 source | 需要修正版 source | false |
| 31-reader-appearance-theme-edit | 强参考但非最终稿 | `37-reader-appearance-theme-edit-standard.png` | 内容基本完整，但视口与 final token 门禁未满足 | 需要按目标视口和 final token 定稿 | false |
| 32-reader-appearance-layout-advanced | 强参考但非最终稿 | `38-reader-appearance-layout-advanced-standard.png` | 内容基本完整，但视口与 final token 门禁未满足 | 需要按目标视口和 final token 定稿 | false |
| 33-reader-appearance-page-turn-animation | 现有参考稿不合格 | `39-reader-appearance-page-turn-animation-standard.png` | 存在 iOS 状态栏、视口不符及 final token 未冻结问题 | 需要 Android 修正版 source | false |
| 41-discovery-default | 旧编号 | `41-1-discovery-source-category.png` | `41` 为上一版；当前暂定采用 `41-1`，不需要补图 | 审核 `41-1` 候选 | false |
| 48-1-app-settings-bookshelf-search | 人工排除 | 48 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 48-2-app-settings-cache | 人工排除 | 48 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 48-3-app-settings-sync-backup | 人工排除 | 48 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 48-4-app-settings-privacy-permissions | 人工排除 | 48 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 48-5-app-settings-about-feedback | 人工排除 | 48 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 48-app-settings-general | 人工排除 | 48 组人工 FAIL，且页面排除已明确确认 | 不属于 source gap；继续 EXCLUDE | 无 | false |
| 51-1-global-state-empty | 人工排除 | 51 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 51-2-global-state-error-network | 人工排除 | 51 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 51-3-global-state-permission-delete-confirm | 人工排除 | 51 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 51-4-global-state-operation-feedback | 人工排除 | 51 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |
| 51-global-state-loading | 人工排除 | 51 组人工 FAIL | 不属于 source gap；继续 EXCLUDE | 只有人工撤销 FAIL 后才可重开 | false |

## 修正后的待人工事项

### 当前 source 候选审核

- `16-6-reader-toc-quick-panel-04-2-standard.png`
- `18-4-read-aloud-quick-panel-04-2-standard.png`
- `21-2-reader-appearance-quick-panel-04-2-standard.png`
- `22-3-reader-settings-quick-panel-04-2-standard.png`
- `35-reader-appearance-font-selection-standard.png`
- `36-reader-appearance-theme-selection-standard.png`
- `37-reader-appearance-theme-edit-standard.png`
- `38-reader-appearance-layout-advanced-standard.png`
- `39-reader-appearance-page-turn-animation-standard.png`
- `41-1-discovery-source-category.png`

### 限定角色确认

- `19-1`：当前朗读运行态，只作 `RUNNING_STATE_REFERENCE`。
- `21/22/23/24/25/26/27` 流程或状态图：只作 `FLOW_REFERENCE`。
- `24-1/24-2/24-3`：已有状态材料，但设计冻结前必须按 `04-2` 完成视觉修正。
- `25-4`：准确 SHA256 `ccb5d87c51cfc064b73fb4606f996f4b2321f68db147d335702cfc38615dd693` 已于 2026-06-13 获得人工 PASS，图片级 `usable=true`；页面级仍为 `usable=false`。

## 当前阻塞

- source gap：`5`（字体选择、主题选择、主题编辑、版式高级、翻页动画）
- 页面级人工视觉审核：仍未完成
- final token：仍未完成
- component / interaction 映射：仍未完成
- 页面级 `usable=true`：`0`
- 是否允许上传：`否`

最终状态：`STITCH_SOURCE_UPLOAD_SOURCE_GAP_BLOCKED`
