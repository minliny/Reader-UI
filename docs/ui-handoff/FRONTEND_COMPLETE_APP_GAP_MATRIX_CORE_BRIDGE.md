# Core Bridge Complete App Gap Matrix

Status: `AUDIT_TEMPLATE_PENDING_CORE_CODE_EVIDENCE`

Date: 2026-07-04

Target repo: `/Users/minliny/Documents/Reader-Core-Native`

Parent matrix: `docs/ui-handoff/FRONTEND_COMPLETE_APP_GAP_MATRIX.md`

## 1. Purpose

This file turns the parent gap matrix into Core bridge work. It is not yet a final Core audit because this pass did not inspect every Reader-Core-Native crate, protocol endpoint, FFI command, host bus capability, or platform bridge call.

The Core bridge must prevent platform UI from becoming the domain source of truth. Bookshelf, RSS, persisted search history, content, progress, TTS queue, and sync conflict state belong to Reader-Core-Native unless explicitly marked ephemeral.

## 2. Core Preflight

| Check | Current local evidence | Required result |
| --- | --- | --- |
| Repo exists | `/Users/minliny/Documents/Reader-Core-Native` exists. | Use this repo for Core bridge implementation evidence. |
| Rust workspace exists | `Cargo.toml` exists. | Build/test command must be documented from this repo. |
| Capability docs exist | `docs/HOST_PLATFORM_CONTRACT_2026-07-03.md`, protocol docs, and capability plans exist. | UI contract schemas must map to real Core protocol and host bus capabilities. |
| Reader UI Core schemas exist | `core-command`, `core-event`, `host-request`, `progress-location`, `content`, `sync-conflict` schemas exist in Reader UI. | Schemas must be reconciled with actual Reader-Core-Native command/event names, payloads, errors, and versioning. |

## 3. Required Core Bridge Artifacts

| Required role | Expected artifact | Acceptance |
| --- | --- | --- |
| Command mapping | UI `CoreCommandType` to Reader-Core-Native command/protocol table | Every P0 platform effect has a real Core command or documented HostRequest. |
| Event mapping | Core result/event to UI `CoreEventType` table | Reducer can consume success, failure, stale, cancelled, and partial states. |
| Error mapping | Core error model to UI loading/error/sync conflict state | No raw platform/string-only error escapes into UI. |
| Progress mapping | `ProgressLocation` to Core canonical location | Platform layout may measure text, but Core owns business progress truth. |
| Content mapping | Core content/chapter model to UI content blocks/ViewState | Reader UI can render content without inventing a second content model. |
| Sync mapping | Core sync conflict model to UI conflict ViewState and events | Reducer submits user resolution to Core; UI does not resolve WebDAV conflict alone. |
| HostRequest mapping | Core/platform-required host capabilities | Core and reducer request Host Adapter work through structured messages. |
| Versioning | FFI/protocol compatibility policy | Breaking changes are versioned and fail contract tests/platform builds. |

## 4. P0 Core Bridge Matrix

| ID | Gap | UI contract source | Core-owned behavior | Acceptance |
| --- | --- | --- | --- | --- |
| CORE-P0-01 | `book.open` mapping not proven | UiEvent open book / CoreCommand book open | Resolve book identity, source, chapter context, and initial content request. | Protocol test proves open book success/failure/stale result handling. |
| CORE-P0-02 | `chapter.list` / TOC mapping not proven | book directory / reader directory ViewState | Provide chapter list, current chapter, cache state, and error state. | Core event maps to ViewState without platform-only repository. |
| CORE-P0-03 | `content.load` mapping not proven | immersive-reading / reader content ViewState | Provide content blocks and load/error/cancel states. | Reader screen can render Core content model and discard stale loads. |
| CORE-P0-04 | `reader.location.resolve` mapping not proven | progress-location schema | Convert platform measurement anchor to canonical location. | Progress restore survives font/viewport/page changes. |
| CORE-P0-05 | `reader.progress.update` mapping not proven | progress update UiEvent/CoreCommand | Persist progress and emit canonical progress state. | Platform does not write progress directly to storage. |
| CORE-P0-06 | Search/source mapping not proven | search/source UiEvents and ViewState | Execute source search/detail/switch and return structured states. | Source switching updates content source while preserving reader context. |
| CORE-P0-07 | RSS mapping not proven | RSS route/ViewState/UiEvent | Own RSS subscriptions, articles, read state, favorites, refresh status. | Platform does not persist RSS state outside Core/Host request boundary. |
| CORE-P0-08 | TTS queue mapping not proven | activeSession / tts UiEvent | Plan TTS queue and session state without UI owning domain queue. | Reducer owns activeSession UI; Core owns queue plan/domain state. |
| CORE-P0-09 | Sync conflict mapping not proven | sync-conflict schema | Own snapshot, conflict detection, resolution application. | UI displays conflict and submits resolution; Core applies strategy. |
| CORE-P0-10 | HostRequest boundary not proven | host-request schema | Ask platform for HTTP/WebView/Cookie/file/permission/TTS/background/share. | Host Adapter returns structured result and never mutates UI/Core state directly. |

## 5. State Ownership Matrix

| Domain area | Owner | Platform role | Required proof |
| --- | --- | --- | --- |
| Bookshelf | Core | Render ViewState and emit UiEvent | Core repository/event source exists; platform storage is not the source of truth. |
| Search history | Core if persisted/synced; UI only for transient input | Emit search submit/clear and render suggestions | Saved history path and clear behavior are Core-owned or explicitly non-persistent. |
| RSS subscriptions/articles | Core | Render feed/articles and emit read/favorite/refresh events | Core owns subscription/article repository and sync/read state. |
| Reader content/progress | Core | Provide layout measurement and render content | Core canonical location/progress is used for restore/save. |
| TTS queue | Core domain state + platform system TTS execution through Host Adapter | Render active session and controls | Queue plan is Core-owned; system TTS execution is Host Adapter-owned. |
| Sync/WebDAV conflict | Core | Render conflict and submit user decision | Conflict detection/resolution strategy is Core-owned. |

## 6. Core Bridge Acceptance Minimum

Core bridge cannot be marked complete until:

1. Every P0 UiEvent that needs business data maps to CoreCommand/CoreEvent or HostRequest.
2. Every CoreCommand has success, failure, cancelled, and stale-result behavior documented or tested.
3. Core progress/location is canonical across font, page, viewport, and platform differences.
4. Bookshelf, RSS, search history, sync, reader progress, and TTS queue do not become platform-local domain stores.
5. FFI/protocol versioning is enforced with compatibility tests.
6. Platform bridge tests prove stale Core results cannot overwrite current route/context.
