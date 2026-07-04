# Android Complete App Gap Matrix

Status: `AUDIT_TEMPLATE_PENDING_ANDROID_CODE_EVIDENCE`

Date: 2026-07-04

Target repo: `/Users/minliny/Documents/Reader for Android`

Parent matrix: `docs/ui-handoff/FRONTEND_COMPLETE_APP_GAP_MATRIX.md`

## 1. Purpose

This file turns the parent gap matrix into Android-specific work. It is not yet a final Android audit because this pass did not inspect every Compose file, reducer, adapter, test, and device artifact. Until that live audit is attached, every row below is a required closure item.

Android must implement native Compose UI. It must not ship `frontend-demo/` through WebView as the production app.

## 2. Android Preflight

| Check | Current local evidence | Required result |
| --- | --- | --- |
| Repo exists | `/Users/minliny/Documents/Reader for Android` exists. | Use this repo for Android implementation evidence. |
| Gradle entry exists | `settings.gradle.kts`, `build.gradle.kts`, `app/build.gradle.kts`, `gradlew` exist. | Build and test commands must be documented from this repo. |
| Reader UI contract dependency | Not verified in this pass. | Android must consume Reader UI generated Kotlin types or generated artifacts from the same schema. |
| Production UI entry | Not verified in this pass. | Production UI must be Compose/native, not WebView loading the demo. |

## 3. Required Android Files Or Equivalents

The audit should find these files or equivalent locally named modules:

| Required role | Expected Android landing | Acceptance |
| --- | --- | --- |
| Contract import | `io.reader.ui.contract.*` generated Kotlin types or module dependency | RouteId, UiEvent, UiState, ViewState, MotionId, Token types compile in app code. |
| App reducer | `ReaderReducer.kt` / `ReaderUiReducer.kt` | Owns route, overlay, activeSession, focus, loading, async guard. |
| ViewModel / coordinator | `ReaderViewModel.kt` / coordinator equivalent | Converts UiEvent to reducer actions and Core/Host effects. |
| ViewState mapper | `ReaderViewStateMapper.kt` or equivalent | Native screens render ViewState or a lossless mapped DTO. |
| Core bridge | `ReaderCoreBridge.kt` | Maps reducer effects to Reader-Core-Native commands/events. |
| Host Adapter | `HostAdapter.kt` | Owns HTTP, WebView, Cookie, file, permission, TTS, background, share, notification capability calls. |
| Token Adapter | `ReaderTokenAdapter.kt` / Compose theme bridge | Uses generated token registry, rejects ad hoc contract-owned values. |
| Motion Adapter | `ReaderMotionAdapter.kt` | Maps MotionId/MotionSpec to Compose animation primitives and reduced-motion behavior. |
| Evidence tests | reducer tests, Compose snapshot/golden tests, device smoke | Proves native behavior, not browser demo behavior. |

## 4. Android P0 Matrix

| ID | Gap | Evidence to collect | Acceptance command or artifact |
| --- | --- | --- | --- |
| AND-P0-01 | Contract dependency not proven | Gradle dependency/source-set and imports of generated Kotlin types. | `./gradlew :app:compileDebugKotlin` succeeds with generated contract types. |
| AND-P0-02 | AppShell + four main tabs not proven | Compose source and screenshot/recording for bookshelf/discover/RSS/settings tabs. | Native recording plus test proving tab switch does not push route stack. |
| AND-P0-03 | Reducer not proven | Reducer source and golden tests. | Tests cover route push/pop/replace, overlay mutex, activeSession mutex, loading async guard, focus restore. |
| AND-P0-04 | Bookshelf to immersive reading not proven | Compose route, reducer transition, Core bridge call, recording. | Open book enters `immersive-reading`, returns to source, repeated click keeps latest intent. |
| AND-P0-05 | Reader control layer not proven | Reader surface, overlay layer, gesture source, recording. | Control layer opens/hides without remounting reader context or changing text layout. |
| AND-P0-06 | TokenAdapter not proven | Token adapter source and lint/snapshot evidence. | Contract-owned UI does not use raw colors/spacing/radius/motion durations outside token registry. |
| AND-P0-07 | MotionAdapter not proven | Motion adapter source and motion tests/recording. | P0 MotionIds map to Compose animations; reduced motion has no large movement or repeated pulse. |
| AND-P0-08 | Core bridge not proven | Bridge source and protocol tests. | P0 UiEvents emit CoreCommand/HostRequest and stale results cannot overwrite current state. |
| AND-P0-09 | Host Adapter not proven | Host adapter source and capability tests. | HTTP/WebView/Cookie/file/permission/TTS paths return structured results and do not mutate UI directly. |
| AND-P0-10 | Native evidence missing | Build log, simulator/device screenshots, recordings, test outputs. | Evidence exists for Slice 1 to Slice 5 before broad route migration. |

## 5. Android Route Implementation Matrix Template

Every implemented route should be tracked with this table:

| RouteId | Priority | Compose owner | ViewState input | UiEvent output | Core/Host effect | MotionIds | Token groups | Tests/evidence | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bookshelf | P0 | TBD | TBD | TBD | Core bookshelf snapshot | tab/app route | app shell, bookshelf cards | TBD | Pending audit |
| immersive-reading | P0 | TBD | TBD | TBD | content load/progress | reader entry, page turn | reader typography/theme | TBD | Pending audit |
| reader | P0 | TBD | TBD | TBD | progress/session | reader control, module switch | reader control tokens | TBD | Pending audit |
| source-switch | P1 | TBD | TBD | TBD | source switch/search | source overlay | source/reader tokens | TBD | Pending audit |

## 6. Android Acceptance Minimum

Android cannot be marked frontend-complete until:

1. It compiles against Reader UI generated Kotlin contract types.
2. Reducer golden tests pass for P0 state rules.
3. P0 native screens render from ViewState or lossless mapped contract DTOs.
4. TokenAdapter and MotionAdapter are present and tested.
5. Core bridge and Host Adapter are connected for first vertical slices.
6. Device/simulator evidence exists for AppShell, reading entry, reader control layer, overlay/focus, session capsule, and orientation.
