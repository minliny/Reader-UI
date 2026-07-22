# Runtime Live Shadow Protocol

状态：Reader-UI Contract head 为 3.1.1；Host consumer lock 仍为 2.5.1 mixed rollout（35 covered events：7 Pilot、28 Shadow、0 Authoritative）

本文件定义 ReaderUIRuntime 接入真实 App 事件总线时的最小行为。它只允许把 runtime 作为连续状态的观察者，不能把测试 adapter 误写成生产 Pilot。

## 1. Allowlist

- Host 必须从 READER_UI_CONSUMER.json 的 rollout.coveredEvents 取得本次观察范围。
- rollout.cohorts 是逐事件 override；未落入 cohort 的 event 使用 rollout.mode。
- Host 代码中的 allowlist 与 lock 必须 exact-match，并由本端测试校验。
- 即使 event 存在于 GeneratedRuntimeActions，未列入 allowlist 也只能走 native fallback。

## 2. Shadow dispatch

对 allowlist event：

1. 使用长期持有的 runtime 实例 dispatch 原始 canonical event、无损 payload 与 correlationId。
2. 只保存 runtime transition、failure 和比较结果；不得执行 transition.effects。
3. native reducer 与 native effects 仍各执行一次，仍是唯一生产 state/effect 真源。
4. 将 native 前后状态投影成 routeId、overlay、activeSession、loading、readerPageIndex、error，与 runtime transition 做语义比较。
5. 记录 covered、fallback、runtimeError、mismatch 计数及最近一次差异。

runtime guard 或 payload failure 在 Shadow 阶段不得影响 native 行为；它必须被记录为 runtimeError，不能静默吞掉。

## 3. Pilot dispatch

只有 lock cohort 显式标记为 pilot 的 event 才可进入 Pilot：

1. runtime dispatch 成功后，Host 投影 runtime state 到 renderer 所需的 semantic state。
2. 同一个 event 不得再交给 native reducer，也不得双执行 native/runtime effects。
3. runtime guard 或 payload failure 必须 fail closed，保持前一状态；不得通过 native fallback 绕过 shared guard。
4. cohort 必须有 rollback 开关、连续状态测试、真实生产事件入口测试和 effect exactly-once 测试。

首个 Pilot 是 reader.directory.open 与 reader.directory.close 成对迁移。三端 lock 随后将 `book.open` 作为独立的 `effectPolicy=exactly-once` cohort 晋升 Pilot，并将 TTS 与 auto-page 两组 start/stop pair 晋升为同一 playback Pilot cohort；page next/prev 仍继承默认 Shadow。

## 4. Effect boundary

Shadow 阶段 runtime effect 只能被比较，不可执行。Pilot 阶段必须有一个 canonical effect executor；Core/Host effect 只能执行一次并回送带 correlationId 的结构化 result。

`book.open` 已在三端以独立 cohort 获得 Host Pilot authority：共享 runtime 保持 serial stage/correlation/layout，Host 使用单一 typed executor，Pilot 路径不再回放 native reducer/effect，并保留显式 Shadow rollback。TTS 与 auto-page 也已进入 exactly-once playback Pilot；page next/prev 仍为 Shadow。所有 Pilot 都尚未成为 Authoritative，三端 fresh physical-device proof 仍是独立门禁。详细准入条件见 `RUNTIME_BOOK_OPEN_TRANSACTION_PROTOCOL.md` 与 `RUNTIME_READER_PLAYBACK_TRANSACTION_PROTOCOL.md`。
