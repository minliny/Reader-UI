# 工作流闭合补充规划（Workflow Closure Planning）

本文只记录当前 demo 中还需要补窗口级设计图的工作流。经重新收口后，缺失图只保留两类：数据恢复、数据调测。

## 结论（Conclusion）

当前 demo 的声明路由都有对应渲染分支，静态 `data-route` 也没有跳向未声明页面的硬性缺口。真正需要补图的不是“路由空白页”，而是两个流程里的关键状态没有闭合。

不再计入缺失图的内容：

- 阅读快捷控制窗：已有对应快捷窗，本轮不规划完整页补图。
- 换源：统一在现有 `source-switch` 展示可用书源、延迟和最新章节，点击书源行直接切换，不另画多步子页面。
- 关于与反馈：不作为当前 demo 必补工作流；已有入口或外部边界，不再规划表单流。
- 书籍详情、更换书源、书架链路、阅读控制层、主设置页、书源管理主链路：已有或不该在本轮另起规划。

## 缺失工作包（Open Workflow Packages）

| 优先级 | 工作包 | 当前缺口 | 闭合目标 | Shell / 状态归属 |
|---|---|---|---|---|
| P0 | 数据恢复 | 同步与备份页已有恢复入口和选择项，但缺恢复确认、进度、冲突和结果状态。 | 补恢复确认、恢复进度、冲突处理、恢复结果 4 个窗口 / 状态。 | SettingsShell state/dialog host |
| P1 | 数据调测（书源调测） | 书源调测页已有模块和视图入口，但搜索 / 详情 / 目录结果状态不完整，正文日志视图需要独立表达。 | 补搜索解析结果、详情解析结果、目录解析结果、正文日志 4 个窗口 / 状态。 | SettingsShell SourceManagement child state |

## 工作量口径（Workload Unit）

这里的“图”按可设计、可实现、可验收的窗口或状态计算。已有页面、已有快捷窗、外部边界和不该本轮规划的入口不计入。

| 范围 | 图数 | 工作量点数 | 说明 |
|---|---:|---:|---|
| 数据恢复 | 4 | 7 | 确认、进度、冲突、结果。 |
| 数据调测 | 4 | 4 | 搜索 / 详情 / 目录解析结果和正文日志。 |
| 全部缺失图 | 8 | 11 | 仅包含数据恢复和数据调测。 |

## 数据恢复（Restore Flow）

| 页面 / 状态 | Owner | 入口 | 必须展示 | 异常 / 返回 | 点数 |
|---|---|---|---|---|---:|
| `restore-confirm` | SettingsShell DialogHost | 点击开始恢复 | 覆盖影响、风险说明、确认输入或危险确认。 | 取消回恢复选择；确认进入进度。 | 1 |
| `restore-progress` | SettingsShell state | 确认恢复后 | 下载、校验、合并、写入阶段进度和取消策略。 | 失败要能查看原因、重试或回同步页。 | 2 |
| `restore-conflict` | SettingsShell child state/dialog | 检测到本地 / 远程冲突 | 冲突项、本地优先、远程优先、逐项选择。 | 不允许默认覆盖；选择后回进度继续。 | 3 |
| `restore-result` | SettingsShell result state/dialog | 恢复结束 | 成功、部分成功、失败项、查看日志、返回同步页。 | 失败可重试；成功回设置页并刷新状态。 | 1 |

恢复流程挂在 SettingsShell 的 state/dialog host 下。冲突处理不自动覆盖本地数据；权限或网络失败必须保留返回同步页的路径。

## 数据调测（Source Debug Flow）

| 页面 / 状态 | Owner | 入口 | 必须展示 | 异常 / 返回 | 点数 |
|---|---|---|---|---|---:|
| `source-debug-search-result` | SettingsShell child state | 书源调测 -> 搜索模块 -> 解析结果 | 关键词、结果列表字段、命中数量、字段有效性。 | 失败显示规则未命中和重试。 | 1 |
| `source-debug-detail-result` | SettingsShell child state | 详情模块 -> 解析结果 | 书名、作者、封面、简介、字段命中。 | 字段缺失逐项标红。 | 1 |
| `source-debug-catalog-result` | SettingsShell child state | 目录模块 -> 解析结果 | 章节数、首尾章节、URL 有效性。 | 空目录、重复章节、URL 缺失。 | 1 |
| `source-debug-content-log` | SettingsShell child state | 正文模块 -> 日志 | 请求 URL、状态码、规则执行、净化日志、错误堆栈。 | 可复制日志；回模块不丢失败态。 | 1 |

数据调测补图只表达模块调测结果和日志状态，不重画书源管理主链路，也不重画已有源码页和已有错误日志页。

## 窗口级设计图产物（Window-Level Design Outputs）

当前缺失-only 设计图输出如下：

| 页面 / 状态 | 设计范围 | 设计图 |
|---|---|---|
| `restore-confirm` | 恢复确认弹窗；覆盖影响和开始恢复。 | `workflow-direct-designs/restore-confirm-direct.png` |
| `restore-progress` | 恢复进度状态；下载、校验、合并、写入。 | `workflow-direct-designs/restore-progress-direct.png` |
| `restore-conflict` | 恢复冲突处理；本地优先、远程优先和逐项选择。 | `workflow-direct-designs/restore-conflict-direct.png` |
| `restore-result` | 恢复结果状态；成功、部分成功、失败重试。 | `workflow-direct-designs/restore-result-direct.png` |
| `source-debug-search-result` | 搜索模块解析结果。 | `workflow-direct-designs/source-debug-search-result-direct.png` |
| `source-debug-detail-result` | 详情模块解析结果。 | `workflow-direct-designs/source-debug-detail-result-direct.png` |
| `source-debug-catalog-result` | 目录模块解析结果。 | `workflow-direct-designs/source-debug-catalog-result-direct.png` |
| `source-debug-content-log` | 正文模块日志视图。 | `workflow-direct-designs/source-debug-content-log-direct.png` |

## 验收清单（Acceptance Checklist）

- 缺失图只包含数据恢复和数据调测，共 8 张。
- 数据恢复有确认、进度、冲突和结果状态，不只停留在下拉选择。
- 数据调测可区分搜索、详情、目录解析结果和正文日志视图。
- 其他已有页面、已有快捷窗或外部边界不再进入本规划。
