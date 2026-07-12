# Directory Pair Pilot Protocol

状态：R8 首个 runtime Pilot

范围仅限 reader.directory.open 与 reader.directory.close。它们必须作为一个 cohort 迁移；不得只把 open 标为 Pilot 而把 close 留给 native reducer。

## 1. 入口与状态

1. 平台真实 UI 入口必须先归一为这两个 canonical event。
2. Pilot event 由长期 ReaderUIRuntime 实例 dispatch。
3. open 的 runtime semantic overlay 必须为 directory。
4. close 只在当前 semantic overlay 仍为 directory 时清除；若其他 overlay 已替换它，close 必须无副作用。
5. runtime dispatch failure 必须 fail closed，保留原生产状态；不得调用 native reducer 来绕过 runtime guard。

## 2. Native projection

runtime 不绘制页面。每个平台必须用一个窄 projection 把 semantic overlay 映射到已有原生容器：

- iOS：directory semantic overlay 映射为既有 sheet/panel presentation。
- Android：directory semantic overlay 映射为既有 ReaderControl directory surface/route。
- HarmonyOS：directory semantic overlay 映射为 reader-directory-overlay-v2 route。

projection 只能处理 directory pair，不得扩张为第二套通用 reducer。目录的 chapterToc、章节加载、滚动和测量仍属于 native/Core DomainState 或 EphemeralState。

## 3. Exactly-once boundary

Pilot pair 没有 runtime Core/Host effect。对每个目录 open/close：

- native reducer 不得再处理同一个语义 event。
- native effect runner 不得再由该 event 执行第二次。
- runtime state 是该 pair 的唯一 semantic overlay 真源。
- 未覆盖 event 继续 native fallback 一次。

## 4. Cohort promotion

Host lock 必须把 directory pair 作为 mode=pilot、effectPolicy=none cohort，并填写 evidence 与 rollback；book.open、reader.page.next/prev、reader.tts.start/stop、reader.autoPage.start/stop 共 7 条 effectful event 保持默认 shadow。CI 会拒绝把静态或动态 Core/Host effect（包括 auto-page foreground timer）悄悄加入这个 effect-free cohort。

promotion 前必须具备：

- 生产 live-shadow 的连续状态与 allowlist exact-match test。
- 真实入口 open、close、back、overlay replacement、runtime failure fail-closed test。
- directory panel 从 native chapterToc/DomainState 读取，不以硬编码 fixture 充当完成证据。
- simulator/device build；真实物理设备仍是独立 release gate。

## 5. Out of scope

book.open 需要 result-dependent Core transaction；TTS 需要 Core/Host/UI exactly-once；auto-page 需要 timer/session cleanup。它们不随目录 Pilot 升级。
