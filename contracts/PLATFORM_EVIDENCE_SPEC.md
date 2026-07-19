# Platform Evidence Spec

状态：Phase 3 Slice 0–12 验收和防漂移机制
日期：2026-07-19
权威源：[ACCEPTANCE.md](./ACCEPTANCE.md)、[SLICE_PLAN.md](./SLICE_PLAN.md)、[BOUNDARY_RULES.md](./BOUNDARY_RULES.md) §5
来源：[CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §9 Phase 5、§10 合并门槛

本文是阶段 3"验收和防漂移机制"。定义 Slice 0–12 每端 evidence 要求、防漂移自动检查脚本口径、contract 变更传导机制，以及 `evidence/manifest.json` 的机器可校验登记规则。

## 0. 文档边界

本文覆盖：
- 每端（iOS / Android / HarmonyOS）evidence 要求（源码 / 测试 / 截图 / 录屏 / 设备证据）
- 防漂移自动检查脚本口径（demo / generated / schema / reducer golden / token raw 值）
- contract 变更如何传导到三端
- 平台 evidence 提交格式与命名规范

本文不覆盖：
- 不实现三端代码（归各端仓库）
- 不实现自动检查脚本（归本仓 `contracts/tests/` 与各端 CI）
- 不规定具体 CI 平台（GitHub Actions / GitLab CI / Jenkins 等均可）

## 1. Evidence 分类

每个 slice 验收必须提交以下 5 类 evidence：

| 类别 | 形式 | 提交位置 | 谁负责 |
| --- | --- | --- | --- |
| 源码 | `.swift / .kt / .ets` | 各端仓库 | 各端 |
| 测试 | 单元测试 + reducer golden test | 各端仓库 | 各端 |
| 截图 | `.png` | 各端仓库 `slice-N-{platform}-*.png` | 各端 |
| 录屏 | `.mov / .mp4 / .gif` | 各端仓库 `slice-N-{platform}-*.mov` | 各端 |
| 设备证据 | 真机 / 模拟器录屏 + 性能数据 | 各端仓库 `slice-N-{platform}-device-*` | 各端 |

在 `evidence/manifest.json` 中把 slice 标为 `planned / in-progress / blocked` 只表示任务已登记，不属于执行证据。只有测试、实际 artifact、可信 release identity 和该 slice 所有 gate 均关闭时才能标为 `passed`。

## 2. 每端 Evidence 要求

### 2.1 iOS（SwiftUI）

#### 源码 evidence
- 文件命名：`{ComponentName}View.swift`、`{ComponentName}Reducer.swift`
- 必须接入 `ReaderUIContract` Swift package（from `generated/swift/`）
- 必须实现 `ReaderReducer / ReaderCoordinator / ReaderCoreBridge / HostAdapter` 骨架（Slice 0）
- 不允许出现 raw color / spacing / radius / duration（见 §4.4）

#### 测试 evidence
- 单元测试：`{ComponentName}Test.swift`，使用 `XCTest`
- reducer golden test：`{ComponentName}ReducerTest.swift`，输入 UiEvent + 当前 UiState，输出 ViewState，与 golden 文件比对
- golden 文件：`{ComponentName}ReducerTest.golden.json`
- 测试覆盖率：每个 slice 至少覆盖该 slice 的所有 P0 UiEvent

#### 截图 evidence
- 设备：iPhone 14 Pro（390x844）或 iPhone 15 Pro Max（430x932）
- iOS 版本：最新正式版
- 暗色模式：必须有暗色模式截图（验证 night-mode）
- 命名：`slice-N-ios-{route-or-feature}-{state}.{png}`
  - 例：`slice-1-ios-bookshelf-default.png`、`slice-1-ios-bookshelf-loading.png`、`slice-1-ios-bookshelf-empty.png`、`slice-1-ios-bookshelf-error.png`

#### 录屏 evidence
- 设备：同截图
- 格式：`.mov` 或 `.mp4`，60fps
- 时长：单个录屏不超过 30 秒
- 必须包含的录屏：
  - 冷启动（`app.firstOpen.enter`）
  - Tab 切换（`tab.switch`）
  - 路由 push / pop（`app.route.push.forward` / `app.route.pop.backward`）
  - 翻页（`reader.page.turn.next-prev`）
  - overlay 开关（`overlay.sheet.enter` / `overlay.sheet.exit`）
  - TTS 启动 / 停止
  - reduced-motion 降级

#### 设备证据
- 真机或模拟器
- 性能数据：Instruments 抓取 FPS / 内存 / CPU（Slice 8）
- 真机录屏：`slice-8-ios-device-smoke.mov` 覆盖既有文本阅读主链；全产品旅程另需 `slice-12-ios-complete-journey-device.mov`
- 无障碍：`slice-8-ios-voiceover.mov`（VoiceOver focus 迁移）

### 2.2 Android（Compose）

#### 源码 evidence
- 文件命名：`{ComponentName}Screen.kt`、`{ComponentName}Reducer.kt`
- 必须接入 `ReaderUIContract` Kotlin module（from `generated/kotlin/`）
- 必须实现 `ReaderReducer / ReaderCoordinator / ReaderCoreBridge / HostAdapter` 骨架（Slice 0）
- 不允许出现 raw color / spacing / radius / duration

#### 测试 evidence
- 单元测试：`{ComponentName}Test.kt`，使用 `JUnit` + `Compose UI Test`
- reducer golden test：`{ComponentName}ReducerTest.kt`，使用 `kotlinx.serialization` 比对 golden JSON
- golden 文件：`{ComponentName}ReducerTest.golden.json`
- 测试覆盖率：同 iOS

#### 截图 evidence
- 设备：Pixel 7（412x915）或 Pixel 8 Pro（412x892）
- Android 版本：最新正式版
- 暗色模式：必须有暗色模式截图
- 命名：`slice-N-android-{route-or-feature}-{state}.png`

#### 录屏 evidence
- 设备：同截图
- 格式：`.mp4`，60fps
- 必须包含的录屏：同 iOS
- 无障碍：`slice-8-android-talkback.mov`（TalkBack focus 迁移）

#### 设备证据
- 真机或模拟器
- 性能数据：Android Studio Profiler 抓取 FPS / 内存 / CPU（Slice 8）
- 真机录屏：`slice-8-android-device-smoke.mov` 覆盖既有文本阅读主链；全产品旅程另需 `slice-12-android-complete-journey-device.mp4`
- 折叠屏：`slice-8-android-fold-orientation.mov`（如有折叠屏真机，必须真机；否则模拟器）

### 2.3 HarmonyOS（ArkUI）

#### 源码 evidence
- 文件命名：`{ComponentName}.ets`、`{ComponentName}Reducer.ets`
- 必须接入 `ReaderUIContract` ArkTS module（from `generated/arkts/`）
- 必须实现 `ReaderReducer / AppStateStore / ReaderNapiBridge / HostAdapter` 骨架（Slice 0）
- 不允许出现 raw color / spacing / radius / duration

#### 测试 evidence
- 单元测试：`{ComponentName}.test.ets`，使用 `@ohos/hypium`
- reducer golden test：`{ComponentName}Reducer.test.ets`，比对 golden JSON
- golden 文件：`{ComponentName}Reducer.golden.json`
- 测试覆盖率：同 iOS

#### 截图 evidence
- 设备：Huawei Mate 60 Pro 或 DevEco Studio 模拟器
- HarmonyOS 版本：最新正式版
- 暗色模式：必须有暗色模式截图
- 命名：`slice-N-harmony-{route-or-feature}-{state}.png`

#### 录屏 evidence
- 设备：同截图
- 格式：`.mp4`，60fps
- 必须包含的录屏：同 iOS
- 无障碍：`slice-8-harmony-accessibility.mov`

#### 设备证据
- **真机优先**：HarmonyOS 必须有真机证据（来源：[CONTRACT_FIRST_NATIVE_UI_PLAN.md](./CONTRACT_FIRST_NATIVE_UI_PLAN.md) §8 HarmonyOS 修改方向"补 real-device proof"）
- 如真机不可得，模拟器证据必须明确标记 `simulator`，且最终验收前必须补真机
- 性能数据：DevEco Studio Profiler 抓取 FPS / 内存 / CPU（Slice 8）
- 真机录屏：`slice-8-harmony-device-smoke.mov` 覆盖既有文本阅读主链；全产品旅程另需 `slice-12-harmony-complete-journey-device.mp4`

### 2.4 Slice 9–12 分域 evidence bundle

下表是三端共同最低分母；[SLICE_PLAN.md](./SLICE_PLAN.md) 中各 slice 的平台专属交付物仍需同时满足。

| Slice | 必须登记的 coverage | 必须存在的测试/数据 | 必须存在的 App/device artifact | `passed` 的附加门槛 |
| --- | --- | --- | --- | --- |
| Slice 9 | 本地五格式、PDF、漫画、音频、download/storage | 五格式真实 corpus、locator round-trip、Core protocol、Host file/permission/media/download happy+error、reducer golden | 导入→专属 reader、PDF/漫画、媒体/下载、空间不足/断网/重启恢复 | 同 corpus canonical 结果一致；无非文本静默降级；下载/媒体状态可恢复 |
| Slice 10 | 书签/历史/搜索、编辑、规则、换源、封面、段评、HttpTTS、session | 实体 CRUD/冲突/回滚/持久化、Core protocol、Host HTTP/credential/media、reducer golden | reading-data、edit/rules、cover/review、HttpTTS/媒体键/后台 | 业务实体 Core-owned；换源/编辑失败可回滚；active session 唯一 |
| Slice 11 | DSL/书源/订阅、WebView challenge、RSS、protected download | 同一真实 source corpus、DSL/JS sandbox、Cookie/profile 隔离、Host HTTP/Cookie/WebView/Credential、Core diff | rule debug、登录/captcha/challenge/回流、认证 RSS、受保护下载 | 普通 HTTP/Cookie/WebView/RSS 四类真实源三端同结果；凭据不越界 |
| Slice 12 | onboarding/权限/设置、全部 viewport、无障碍、系统集成、release | 全量构建/测试、Slice 9–11 smoke 索引、同 corpus diff、性能、迁移/回滚、consumer lock | 完整用户旅程、无障碍、Phone/横屏/Tablet/Fold、后台恢复 | Slice 9–11 已 passed；release digest/locks 一致；同 corpus diff=0；回滚成功 |

通用要求：

- 每个实际 artifact 必须记录相对路径、SHA-256、字节数、目标类型和执行结果；summary 文档不能代替原始 artifact。
- physical/manual 证据必须记录真实设备标识、OS、时间和 operator；`unknown / mock / simulator` 等占位标识不能冒充真机。
- corpus、性能 JSON、release lock 和测试报告与录屏同等属于 evidence artifact，必须可从 manifest 重算 digest。
- Slice 12 不得把 Slice 8 的单一文本阅读 smoke 复用成 Slice 9–11 的分域 App/device proof。

## 3. 防漂移自动检查脚本口径

防漂移检查分两层：
- **本仓层**：检查 demo / generated / schema 一致性（已有，本仓 `contracts/tests/`）
- **三端层**：检查三端代码与 contract 一致性（归各端 CI）

### 3.1 本仓层检查（已有）

| 检查 | 脚本 | 状态 |
| --- | --- | --- |
| schema 自检 + fixtures 校验 | `contract.test.mjs` | ✓ 已有 |
| codegen 三端 enum 一致性 | `codegen-consistency.test.mjs` | ✓ 已有 |
| codegen 幂等性 | `codegen-idempotent.test.mjs` | ✓ 已有 |
| Phase 1 Slice 1-6 覆盖 | `phase1-slice.test.mjs` | ✓ 已有 |
| Phase 2 Core bridge 契约 | `phase2-contract.test.mjs` | ✓ 已有 |
| StateRule fixtures | `state-rule.test.mjs` | ✓ 已有 |
| demo 与 schema 一致性 | `demo-consistency.test.mjs` | ✓ 已有（route/token unknown=0；motion unknown 需列入 explicit exception，当前 unknown=106 approved=106 unapproved=0）|
| route × component × motion × token 矩阵覆盖 | `matrix-coverage.test.mjs` | ✓ 已有 |
| motion fixture guardRules 完整性 | `motion-guard.test.mjs` | ✓ 已有 |
| token 分组覆盖 | `token-group.test.mjs` | ✓ 已有 |
| Core/Host 边界一致性 | `core-host-boundary.test.mjs` | ✓ 已有 |
| Slice 0–12 平台 manifest schema、登记 exact-set 与 fail-closed | `platform-evidence-manifest.test.mjs` | ✓ 已有 |

执行入口：
```bash
node --test contracts/tests/*.test.mjs
```

### 3.2 本仓层已补 P0 防漂移检查

本仓 P0 防漂移检查已由 `matrix-coverage.test.mjs`、`motion-guard.test.mjs`、`token-group.test.mjs`、`core-host-boundary.test.mjs` 覆盖。

仍不属于 Reader UI 本仓范围的检查：

| 检查 | 归属 | 口径 |
| --- | --- | --- |
| reducer golden tests | iOS / Android / HarmonyOS | 每个 slice 的 UiEvent + UiState 输入输出必须通过本地 golden |
| Core protocol mapping tests | Reader-Core-Native + platforms | CoreCommand/CoreEvent 映射到真实 Rust protocol / FFI / NAPI |
| Host Adapter capability tests | iOS / Android / HarmonyOS | HostRequest 对应平台能力返回结构化 HostResult |
| device smoke / accessibility / performance | iOS / Android / HarmonyOS | 按 §2、§5 evidence manifest 提交 |

### 3.3 三端层检查（归各端 CI）

每个端必须实现的 CI 检查：

#### 3.3.1 generated types 编译检查

- **目的**：contract 变更触发三端编译失败
- **方式**：拉取最新 `generated/{swift,kotlin,arkts}/`，编译各端代码
- **失败条件**：编译错误

#### 3.3.2 raw 值 grep 检查

- **目的**：禁止 raw color / spacing / radius / duration
- **方式**：grep 搜索三端源码
- **失败条件**：命中以下任一 pattern

| 类型 | iOS grep pattern | Android grep pattern | HarmonyOS grep pattern |
| --- | --- | --- | --- |
| color hex | `Color\(0x[0-9a-fA-F]+\)` | `Color\(0x[0-9a-fA-F]+\)` | `0x[0-9a-fA-F]{6,8}`（在 color 上下文）|
| color rgb | `Color\(red:\s*\d` | `Color\(\d+\s*,\s*\d+` | `Color\(\d+` |
| spacing raw | `CGFloat\(\d+\)` / `\d+\.dp` | `\d+\.dp` / `\d+\.sp`（在 Padding Modifier 上下文）| `\d+\.vp` / `\d+\.fp`（在 padding / margin 上下文）|
| radius raw | `cornerRadius\(\d+\)` / `\d+\.dp`（在 corner 上下文）| `RoundedCornerShape\(\d+\.dp\)` | `borderRadius\(\d+\)` |
| duration raw | `duration:\s*\d+` / `tween\(\d+\)` | `tween\(\d+\)` / `durationMillis\s*=\s*\d+` | `duration:\s*\d+` |
| easing raw | `\.easeInOut` / `\.easeOut`（直接用，非 TokenAdapter）| `FastOutSlowInEasing`（直接用）| `Curves\.\w+`（直接用）|

- **允许例外**：见 [TOKEN_SPEC.md](./TOKEN_SPEC.md) §4.1 允许例外

#### 3.3.3 TokenAdapter coverage 检查

- **目的**：三端 TokenAdapter 必须覆盖 fixtures 中所有非 deprecated token
- **方式**：解析 TokenAdapter 实现，与 `token.fixtures.json` 比对
- **失败条件**：fixtures 中有 token 在 TokenAdapter 中无对应实现

#### 3.3.4 reducer golden test 检查

- **目的**：reducer 行为符合 StateRule
- **方式**：每个 slice 的 reducer golden test 必须通过
- **失败条件**：任一 golden test 失败

#### 3.3.5 demo baseline 漂移检查（已有）

- **目的**：demo 与 schema 一致性
- **方式**：`node frontend-demo-optimized/verify/contract/verify-demo-contract-consistency.mjs`
- **失败条件**：route/token unknown 非 0；motion unknown 未列入 `demo-contract-exceptions.json`；found 数量异常减少

### 3.4 AST 检查（P1，Phase 5 必须实现）

P0 阶段先实现 grep 检查。AST 检查作为 Phase 5 验收门槛：

- **iOS**：SwiftSyntax 解析，校验 color / spacing / radius / duration 调用都经 TokenAdapter
- **Android**：Kotlin Compiler PSI 解析
- **HarmonyOS**：TypeScript Compiler API 解析 .ets

## 4. Contract 变更传导机制

来源：[BOUNDARY_RULES.md](./BOUNDARY_RULES.md) §5。

### 4.1 传导流程

```
1. 修改 contracts/{schema,fixtures,tests}/
2. 跑 node --test contracts/tests/*.test.mjs 校验
3. 跑 node tools/codegen/generate.mjs 重新生成 generated/{swift,kotlin,arkts}/
4. 提交 PR（必须包含 schema + fixtures + tests + generated 四类变更，缺一不可）
5. PR 合并后，三端仓库 CI 拉取最新 generated
6. 三端编译失败 → 触发对应仓库修复
7. 三端 reducer golden test 失败 → 触发 reducer 修复
```

### 4.2 变更分类

| 变更类型 | 影响范围 | 传导要求 |
| --- | --- | --- |
| RouteId 新增 | 三端 generated + reducer + 测试 | 三端编译通过 + 新 route 在 reducer 中可路由 |
| RouteId 废弃 | 三端 generated + reducer | 至少保留一个 MINOR 周期 |
| MotionId 新增 | 三端 generated + MotionAdapter + 测试 | 三端编译通过 + MotionAdapter 实现 |
| Token 新增 | 三端 generated + TokenAdapter | 三端编译通过 + TokenAdapter 实现 |
| CoreCommand 新增 | 三端 generated + Core bridge + Reducer | 三端编译通过 + Core bridge mapping |
| HostRequest 新增 | 三端 generated + HostAdapter | 三端编译通过 + HostAdapter 实现 |
| StateRule 修改 | 三端 reducer golden test | 三端 golden test 修复 |
| PageState 新增 | 三端 generated + 状态层组件 | 三端编译通过 + 状态层组件实现 |

### 4.3 三端响应时限

- **breaking change**（MAJOR）：三端必须在一个 sprint 内修复
- **non-breaking 新增**（MINOR）：三端可在下个 slice 接入
- **fix**（PATCH）：不强制三端响应

### 4.4 不允许的传导

- 不允许三端仓库直接修改 `contracts/` 或 `generated/`（必须经本仓 PR）
- 不允许三端仓库跳过 codegen 手写 enum（必须用 generated types）
- 不允许三端仓库用 mock contract 替代 generated（device smoke test 必须用真实 generated）
- 不允许本仓 PR 只改 schema 不改 fixtures / tests / generated（[BOUNDARY_RULES.md](./BOUNDARY_RULES.md) §5）

## 5. Evidence 提交格式

### 5.1 命名规范

```
slice-{N}-{platform}-{feature}-{state}.{ext}

例：
slice-1-ios-cold-start.mov
slice-2-android-bookshelf-to-reader.mov
slice-3-harmony-overlay-switch.mov
slice-4-ios-tts-start-stop.mov
slice-8-android-device-smoke.mov
slice-8-harmony-fold-orientation.mov
slice-9-ios-import-reader.mov
slice-10-android-http-tts-device.mp4
slice-11-harmony-webview-challenge-device.mp4
slice-12-ios-complete-journey-device.mov
```

- `N`：slice 编号（0–12）
- `platform`：`ios` / `android` / `harmony`
- `feature`：route 或功能名（kebab-case）
- `state`：可选，状态名（default / loading / empty / error / offline / permission / night-mode / reduced-motion）
- `ext`：`.png` / `.mov` / `.mp4` / `.gif`

### 5.2 提交位置

- 各端仓库 `evidence/slice-{N}/` 目录
- 每端仓库根目录的 `EVIDENCE_INDEX.md` 索引所有 evidence
- 不允许提交到本仓（本仓是契约源，不持平台 evidence）

### 5.3 evidence manifest

每端仓库必须有 `evidence/manifest.json`，并通过 [platform-evidence-manifest.schema.json](./platform-evidence-manifest.schema.json)。本仓 [platform-evidence-manifest.fixtures.json](./fixtures/platform-evidence-manifest.fixtures.json) 是 Slice 0–12 的空白登记模板，不是任何平台的执行证据。

首次接入时必须完整登记 `slice-0` 到 `slice-12`，未施工项保持 `planned`；不得省略，也不得使用 `slice-13` 或私有名称绕开正式计划。实际执行 manifest 必须把 `manifestKind` 改为 `execution` 并填写可信 release identity。

```json
{
  "$schema": "contracts/platform-evidence-manifest.schema.json",
  "schemaVersion": 1,
  "manifestKind": "execution",
  "platform": "ios",
  "releaseIdentity": {
    "contractVersion": "3.0.0",
    "sourceSha": "<Reader-UI exact source SHA>",
    "manifestSha": "<UI_RELEASE_MANIFEST.json SHA-256>",
    "readerCoreArtifactSha": "<Reader-Core artifact SHA-256>",
    "consumerLockSha": "<platform consumer lock SHA-256>"
  },
  "slices": {
    "slice-9": {
      "title": "多格式、本地书、漫画与媒体交付",
      "status": "in-progress",
      "dependencies": ["slice-2", "slice-7"],
      "coverage": {
        "capabilityRefs": ["B02", "C02", "C03", "C11", "E06", "F02"],
        "routeIds": ["local-format-support", "pdf-reader", "manga-reader"],
        "eventTypes": [],
        "motionIds": [],
        "pageStates": ["default", "loading", "empty", "error", "offline", "permission"]
      },
      "gates": {
        "contract": "passed",
        "generated": "passed",
        "coreHost": "pending",
        "nativeBuild": "pending",
        "device": "pending"
      },
      "tests": [],
      "evidence": [],
      "blockers": ["format/media Core and Host protocol not closed"],
      "notes": "Registration is not completion."
    }
  }
}
```

上例只展示字段形状；实际文件必须保留 schema 要求的 Slice 0–12 全部条目。`sourceSha / manifestSha / artifactSha / consumerLockSha` 不能保留占位符。

### 5.4 evidence 验收

每个 slice 验收时，三端必须提交对应 manifest。验收方检查：
1. manifest 通过 schema，平台、release identity 与 consumer lock 属于同一次执行
2. manifest 中声明的 tests / evidence 文件实际存在，字节数和 SHA-256 可重算
3. coverage 中的 capabilityRefs / routeIds / eventTypes / motionIds / pageStates 在该 slice 范围内
4. 测试与 evidence 的 `result` 均为 `passed`，不存在 blocker，所有 gates 为 `passed / not-required`
5. physical/manual artifact 有真实 deviceId、OS、时间；manual 另有 operator
6. `planned / in-progress / blocked` 不计入完成分子；template、fixture、summary-only 和浏览器 demo 不计入平台执行 evidence
7. Slice 12 还必须确认 Slice 9–11 三端均 passed、同 corpus diff=0、release locks 一致并完成回滚演练

## 6. 防漂移机制汇总

| 漂移类型 | 检查机制 | 触发位置 | 阻塞 merge？ |
| --- | --- | --- | --- |
| demo route/motion/token 与 schema 不一致 | `demo-consistency.test.mjs` | 本仓 CI | found 数量减少时阻塞 |
| generated 与 schema 不一致 | `codegen-consistency.test.mjs` + `codegen-idempotent.test.mjs` | 本仓 CI | 是 |
| 三端 generated types 编译失败 | 各端 CI 编译检查 | 各端 CI | 是 |
| 三端 raw 值出现 | 各端 CI grep 检查 | 各端 CI | 是 |
| TokenAdapter 缺 token | 各端 CI coverage 检查 | 各端 CI | 是 |
| reducer 行为漂移 | 各端 CI golden test | 各端 CI | 是 |
| 三端用 mock contract 替代 generated | device smoke 检查 | Slice 8 验收 | 是 |
| 三端绕过 Core / HostAdapter | code review + AST 检查（P1）| 各端 code review | 是 |
| 三端持久化业务数据 | code review + grep（UserDefaults / DataStore / preferences 中出现业务字段）| 各端 CI | 是 |
| Slice 9–12 未登记或伪 passed | `platform-evidence-manifest.schema.json` + `platform-evidence-manifest.test.mjs` + 各端 artifact digest check | 本仓模板 / 各端 CI / Slice 12 | 是 |

## 7. 验收门槛对应

本文定义的 evidence 与 [ACCEPTANCE.md](./ACCEPTANCE.md) §10 合并门槛 7 问对应：

| §10 门槛 | 本文对应章节 |
| --- | --- |
| 1. 状态归属 | [CORE_HOST_BOUNDARY.md](./CORE_HOST_BOUNDARY.md) §1 + [STATE_OWNERSHIP.md](./STATE_OWNERSHIP.md) |
| 2. 进入 schema | 本仓 schema + fixtures + tests |
| 3. 三端生成类型通过 | §3.3.1 generated types 编译检查 |
| 4. reducer golden test | §3.3.4 reducer golden test 检查 |
| 5. UI 只渲染 ViewState | 各端 code review + reducer golden test |
| 6. 不绕过 Core / HostAdapter | §3.4 AST 检查（P1）+ code review |
| 7. 三端行为不漂移 | §6 防漂移机制汇总 |

## 8. 缺口与下一步

阶段 3 PLATFORM_EVIDENCE_SPEC 已定义 Slice 0–12 每端 evidence、机器 manifest、分域 bundle、防漂移检查口径与 contract 变更传导。本仓能验证登记结构和 fail-closed 规则，但不会生成平台执行证据。剩余缺口：
- 三端层 grep / AST 检查脚本归各端 CI 实现
- TokenAdapter coverage 检查依赖三端 TokenAdapter 实现稳定
- HarmonyOS 真机 evidence 依赖真机可得性
- 三端仓库需要导入 schema/模板并用真实 release identity、tests 与 artifact 替换 planned 空登记
