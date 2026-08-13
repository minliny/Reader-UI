# Claude Code Loop Runbook

## 触发方式

### 方式 A：Claude Code `/loop` 命令
```
/loop 10m reader-android-loop
```

### 方式 B：CronCreate
```
CronCreate: "*/10 * * * *" → prompt: "Execute one loop cycle for Reader for Android Compose implementation"
```

---

## 每轮执行清单

### Step 1：读取状态（30s）

```bash
# 检查 git 状态
git status --short

# 检查最近 commit
git log --oneline -3
```

读取文件：
- `docs/ui-handoff/compose/CLAUDE_CODE_LOOP_STATE.md`
- `docs/ui-handoff/compose/CLAUDE_CODE_LOOP_QUEUE.md`

### Step 2：工作区审计（30s）

如果 `git status` 显示有未暂存修改（非 untracked）：
- 判断是否是上轮遗留
- 如果是上轮遗留且测试通过 → 继续
- 如果是未知修改 → 审计来源，写入报告，暂停推进

如果工作区有 untracked 文件：
- 判断是否是上轮新创建的文件
- 如果是 → 正常，继续
- 如果是未知来源 → 审计

### Step 3：读取实际代码（1min）

```bash
# 确认当前 slice 涉及的文件存在
find app/src/main/kotlin/com/reader/android/ui -type f -name "*.kt" | sort
find app/src/test/kotlin/com/reader/android/ui -type f -name "*.kt" | sort
```

关键检查：
- `ui/theme/` 包是否存在（Slice 1 产出）
- `ui/components/` 包是否存在（Slice 2 产出）
- 目标 screen 文件是否存在

### Step 4：获取下一任务（30s）

从 `CLAUDE_CODE_LOOP_QUEUE.md` 读取第一个 `[ ]` 任务。

### Step 5：执行任务（4-5min）

原则：
- 只改当前任务范围的文件
- 不修改 Reader-Core bridge / parser / repository / ViewModel fake-real boundary
- 不引入 WebView
- 不引入 Stitch 旧 class/色值/结构
- 每轮只做一个最小可验收任务

任务类型：
- **迁移任务**：替换 MaterialTheme 用法为 ReaderTheme + Slice 2 组件
- **新增任务**：创建新 Composable 文件
- **测试任务**：新增或更新测试文件

### Step 6：回归检查（30s）

在新增/修改代码中 grep 禁止项：

```bash
# 检查是否有旧 Stitch class
grep -r "bg-surface-container\|text-on-surface\|shadow-lg\|shadow-md" app/src/main/kotlin/com/reader/android/ui/ --include="*.kt"

# 检查是否有旧颜色
grep -r "#fdf6ec\|#eae1da\|#f5ece6\|#efe7e0\|#8b5000" app/src/main/kotlin/com/reader/android/ui/ --include="*.kt"

# 检查是否有禁止语义
grep -r "skip_previous\|skip_next" app/src/main/kotlin/com/reader/android/ui/ --include="*.kt"
```

如果有匹配 → 立即修复，不提交。

### Step 7：运行测试（2-3min）

```bash
./gradlew test
```

如果失败：
- 读取失败详情
- 判断是否是本次修改导致
- 如果是 → 修复后重试
- 如果修复超过 3 次 → 标记本次为失败
- 如果连续 3 轮失败 → 输出 BLOCKED，停止推进

### Step 8：生成本轮报告（1min）

写入 `docs/ui-handoff/compose/loop-reports/LOOP_NNN.md`。

使用标准报告模板（见 CLAUDE_CODE_LOOP_PLAN.md 第四节）。

### Step 9：更新状态文件（30s）

更新 `CLAUDE_CODE_LOOP_STATE.md`：
- 更新当前 Loop 编号
- 更新连续失败次数
- 更新最近测试结果
- 更新更新时间

更新 `CLAUDE_CODE_LOOP_QUEUE.md`：
- 将完成的任务标记为 `[x]`
- 将下一个任务标记为 `[~]`（如果适用）

### Step 10：判断下一步（30s）

如果当前 slice 所有任务完成：
- 输出 Slice 完成报告
- 更新 STATE 中当前 slice
- 判断是否到达 Slice 9 → 输出 FINAL_COMPOSE_IMPLEMENTATION_REPORT.md

如果仍有任务：
- 建议下一轮执行下一个任务

---

## 失败处理流程

### 单次测试失败
1. 读取失败日志
2. 判断根因：本次修改 vs 既有问题
3. 修复（限 3 次尝试）
4. 如果无法修复 → 标记本轮 BLOCKED，记录原因

### 连续 3 轮失败
1. 输出 `BLOCKED` 报告到 `docs/ui-handoff/compose/loop-reports/BLOCKED_NNN.md`
2. 停止自动推进
3. 等待用户手动介入

### 工作区冲突
1. 输出冲突详情
2. 不执行任何修改
3. 等待用户清理

---

## 状态文件说明

| 文件 | 用途 | 写入者 |
|---|---|---|
| `CLAUDE_CODE_LOOP_PLAN.md` | 总体规划（只读） | 人工 |
| `CLAUDE_CODE_LOOP_STATE.md` | 当前状态 | Loop |
| `CLAUDE_CODE_LOOP_QUEUE.md` | 任务队列 | Loop |
| `CLAUDE_CODE_LOOP_RUNBOOK.md` | 本执行手册（只读） | 人工 |
| `loop-reports/LOOP_NNN.md` | 每轮报告 | Loop |
| `SLICE_N_*_REPORT.md` | Slice 完成报告 | Loop |
| `FINAL_COMPOSE_IMPLEMENTATION_REPORT.md` | 最终报告 | Loop |

---

## 快速启动命令

首次启动 Slice 3 loop：
```
请执行 Loop 001：迁移 BookshelfScreen 到 ReaderTheme + Slice 2 组件。
按照 CLAUDE_CODE_LOOP_RUNBOOK.md 的 Step 1-10 执行。
```

后续每轮：
```
请继续执行下一 loop，按照 RUNBOOK 执行。
```

---

## 紧急停止命令

如果 loop 出现以下情况，立即停止：
- 修改了 `data/` 包下文件
- 修改了 `FakeCoreBridge` 或 fake/real mode boundary
- 引入了 WebView 加载 normalized HTML
- 删除了既有测试文件
- 引入了 Stitch 旧 class/色值
- 连续 3 轮测试失败
