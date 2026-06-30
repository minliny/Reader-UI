# Motion Selector Matrix

状态：Draft v0.1

范围：基于当前 `frontend-demo/index.html`、`frontend-demo/render.js`、`frontend-demo/render-runtime.js` 扫描到的 148 个唯一 `data-*` 入口，建立 `Motion ID -> data-* selector -> demo route -> platform component -> evidence` 总表。

说明：

- 本表把原始 demo source 中 148 个唯一 `data-*` 入口纳入 Motion ID 归类，包含产品交互、运行时状态、viewport/capture/developer 辅助属性。
- `data-motion-id`、`data-motion-pressed`、`data-motion-reduced`、`data-motion-reduced-source` 是本轮新增的 motion adapter 属性，不计入原始 148 个入口。
- `Evidence` 目前先标记为待补；只有录屏、GIF、截图或自动化断言落到 `frontend-demo/verify/motion/` 后，才允许改成已验证。
- 业务页面不新增私有 motion。Discover、RSS、Source、Restore、Settings、Library 的控件必须映射到通用组件族或 Reader 专属 Motion ID。

| # | data-* selector | Motion ID | Demo route / click path | Platform component | Evidence |
|---:|---|---|---|---|---|
| 1 | `[data-adaptive-runtime]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 2 | `[data-add-search-shelf]` | `button.activate` | book-search add shelf | Button | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 3 | `[data-book-action]` | `button.activate` | bookshelf / book-detail | Button / contextual action | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 4 | `[data-book-author]` | `state.content.replace` | bookshelf / book focus metadata | State metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 5 | `[data-book-card]` | `card.press/select/route` | bookshelf / book-detail | Card/List item | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 6 | `[data-book-chapter]` | `state.content.replace` | bookshelf / book focus metadata | State metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 7 | `[data-book-cover]` | `reader.entry.coverToImmersive` | bookshelf / continue reading / book-detail cover | Shared transition / reader entry | `frontend-demo/verify/motion/evidence/reader.entry.coverToImmersive__bookshelf__source-cover.jpg`, `frontend-demo/verify/motion/evidence/reader.entry.coverToImmersive__immersive-reading__target.jpg` |
| 8 | `[data-book-focus-layer]` | `card.select` | book cover long press focus layer | Context overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 9 | `[data-book-grid]` | `bookshelf.view.switch` | bookshelf view switch | Lazy grid/list state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 10 | `[data-book-title]` | `state.content.replace` | bookshelf / book focus metadata | State metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 11 | `[data-bookshelf-more-layer]` | `dropdown.menu.expand/collapse` | bookshelf more menu | Anchored popup / menu | `frontend-demo/verify/motion/evidence/dropdown.menu.expand__bookshelf__more-menu.jpg` |
| 12 | `[data-bookshelf-view]` | `bookshelf.view.switch` | bookshelf view switch | Lazy grid/list state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 13 | `[data-bookshelf-view-button]` | `bookshelf.view.switch` | bookshelf view switch | Segmented icon button / view mode | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 14 | `[data-capture-mode]` | `tooling.mode.switch` | `?captureMode=all` | Demo capture runner | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 15 | `[data-capture-route]` | `tooling.mode.switch` | `?captureRoute=` | Demo capture runner | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 16 | `[data-close-book-focus]` | `card.select` | book cover focus close | Context overlay close | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 17 | `[data-close-bookshelf-more]` | `dropdown.menu.collapse` | bookshelf more menu close | Anchored popup / menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 18 | `[data-close-dialog]` | `overlay.dialog.exit` | book-detail / settings confirm dialog | Dialog | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 19 | `[data-close-keyboard]` | `input.blur` | book-search keyboard overlay | TextField focus / keyboard inset | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 20 | `[data-close-settings-overlay]` | `overlay.dialog.exit` | settings sheet/dialog close | Settings overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 21 | `[data-close-sheet]` | `overlay.sheet.exit` | book-detail sheet / settings option sheet | Bottom sheet | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 22 | `[data-cover-src]` | `card.select` | book focus layer | Overlay state / card focus | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 23 | `[data-current-page]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 24 | `[data-current-route]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 25 | `[data-current-shell]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 26 | `[data-demo-back]` | `app.route.pop` | demo back button | Back navigation | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 27 | `[data-demo-dialog]` | `overlay.dialog.enter/exit` | book-detail / settings confirm dialog | Dialog | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 28 | `[data-demo-mode]` | `segment.item.switch` | demo mode switch | Segmented control | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 29 | `[data-demo-mode-option]` | `segment.item.switch` | demo mode switch | Segmented control | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 30 | `[data-demo-sheet]` | `overlay.sheet.enter/exit` | book-detail sheet / settings option sheet | Bottom sheet | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 31 | `[data-dev-region]` | `state.content.replace` | developer mode / shell slots | Semantic slot / debug overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 32 | `[data-discover-entry]` | `chip.item.select` | discover entry row | Chip / segment | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 33 | `[data-discover-filter]` | `filter.item.toggle` | discover filter row | Filter chip | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 34 | `[data-discover-reset]` | `filter.apply.commit` | discover filter reset | Filter reducer | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 35 | `[data-discover-sort]` | `dropdown.menu.expand/collapse` | discover sort | Anchored popup / menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 36 | `[data-discover-sort-option]` | `dropdown.option.select` | discover sort | Anchored popup / menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 37 | `[data-discover-sort-toggle]` | `dropdown.trigger.press` | discover sort | Anchored popup / menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 38 | `[data-focus-cover]` | `card.select` | book focus layer | Overlay state / card focus | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 39 | `[data-focus-meta]` | `card.select` | book focus layer | Overlay state / card focus | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 40 | `[data-focus-title]` | `card.select` | book focus layer | Overlay state / card focus | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 41 | `[data-height-class]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 42 | `[data-icon-missing]` | `state.content.replace` | asset fallback | Icon fallback state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 43 | `[data-keyboard-host]` | `overlay.keyboard.enter/exit` | book-search keyboard overlay | TextField focus / keyboard inset | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 44 | `[data-keyboard-input]` | `input.focus/blur` | book-search keyboard overlay | TextField focus | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 45 | `[data-main-tab-feedback]` | `feedback.toast.enter/update/exit` | main tab feedback | Inline feedback | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 46 | `[data-module]` | `reader.module.switch` | reader module tab | ReaderModuleNav | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 47 | `[data-nav-type]` | `tab.item.switch` | main tab navigation | Tab / navigation bar | `frontend-demo/verify/motion/evidence/tab.item.switch__rss__selected.jpg` |
| 48 | `[data-open-dialog]` | `overlay.dialog.enter` | book-detail / settings confirm dialog | Dialog | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 49 | `[data-open-keyboard]` | `input.focus` | book-search keyboard overlay | TextField focus / keyboard inset | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 50 | `[data-open-sheet]` | `overlay.sheet.enter` | book-detail sheet / settings option sheet | Bottom sheet | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 51 | `[data-orientation]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 52 | `[data-page-space-row]` | `state.content.replace` | reader numeric control row | Control row | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 53 | `[data-primary-search-submit]` | `button.activate` | book-search primary submit | Button | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 54 | `[data-quick-action]` | `reader.quick.promote` | reader quick actions | Reader quick panel state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 55 | `[data-reader-brightness-auto]` | `toggle.switch` | reader brightness auto | Switch / Checkbox | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 56 | `[data-reader-brightness-dim]` | `state.content.replace` | reader brightness overlay | Reader state layer | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 57 | `[data-reader-brightness-track]` | `slider.drag.start/update/release` | reader brightness rail | Slider | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 58 | `[data-reader-chapter-action]` | `reader.chapter.jump` | reader directory / chapter controls | Reader chapter state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 59 | `[data-reader-chapter-progress]` | `slider.drag.start/update/release` | reader chapter progress | Slider | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 60 | `[data-reader-current-chapter]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 61 | `[data-reader-directory-index]` | `reader.chapter.jump` | reader directory list | Reader chapter state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 62 | `[data-reader-dismiss]` | `reader.control.hide` | reader control dismiss | Reader overlay state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 63 | `[data-reader-exit]` | `app.route.pop` | reader exit | Navigation pop | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 64 | `[data-reader-immersive-status]` | `reader.session.capsule.enter/update/exit` | immersive session capsule | Reader session overlay | `frontend-demo/verify/motion/evidence/reader.session.capsule.enter__immersive-reading__auto-page.jpg` |
| 65 | `[data-reader-immersive-status-playing]` | `reader.session.capsule.control.press/toggle` | immersive session capsule playing state | Reader session overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 66 | `[data-reader-immersive-status-type]` | `reader.session.capsule.switch` | immersive session capsule type | Reader session overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 67 | `[data-reader-loading]` | `state.loading.inline` | reader quick loading | Inline loading indicator | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 68 | `[data-reader-more-action]` | `dropdown.option.select` | immersive reader more menu | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 69 | `[data-reader-more-close]` | `dropdown.menu.collapse` | immersive reader more menu | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 70 | `[data-reader-more-layer]` | `dropdown.menu.expand/collapse` | immersive reader more menu | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 71 | `[data-reader-more-toggle]` | `dropdown.trigger.press` | immersive reader more menu | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 72 | `[data-reader-page-action]` | `reader.page.turn.next/prev` | immersive-reading / reader page buttons | Reader page state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 73 | `[data-reader-page-count]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 74 | `[data-reader-page-index]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 75 | `[data-reader-page-readout]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 76 | `[data-reader-page-space-action]` | `stepper.press/value.change` | reader page space stepper | Stepper buttons | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 77 | `[data-reader-page-space-set]` | `segment.item.switch` | reader page space option | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 78 | `[data-reader-page-space-value]` | `state.content.replace` | reader value readout | Value label | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 79 | `[data-reader-pagination]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 80 | `[data-reader-replace-rule]` | `toggle.switch` | reader replacement rules | Switch / Checkbox | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 81 | `[data-reader-selection-action]` | `selection.toolbar.action` | immersive text selection | Text selection toolbar | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 82 | `[data-reader-selection-close]` | `selection.toolbar.exit` | immersive text selection | Text selection toolbar | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 83 | `[data-reader-selection-layer]` | `selection.range.show` | immersive text selection | Text selection toolbar | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 84 | `[data-reader-setting-dropdown]` | `dropdown.menu.expand/collapse` | reader settings dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 85 | `[data-reader-setting-option]` | `dropdown.option.select` | reader settings dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 86 | `[data-reader-setting-option-key]` | `dropdown.trigger.press` | reader settings dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 87 | `[data-reader-setting-toggle]` | `toggle.switch` | reader settings toggles | Switch / Checkbox | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 88 | `[data-reader-setting-value]` | `state.content.replace` | reader value readout | Value label | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 89 | `[data-reader-surface-signature]` | `state.content.replace` | reader pagination/readout | Reader state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 90 | `[data-reader-theme]` | `segment.item.switch` | reader theme option | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 91 | `[data-reader-theme-pair]` | `segment.item.switch` | reader theme option | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 92 | `[data-reader-theme-scheme]` | `segment.item.switch` | reader theme option | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 93 | `[data-reader-toc-mode]` | `segment.item.switch` | reader toc/bookmark mode | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 94 | `[data-reader-tts-action]` | `reader.session.capsule.control.press/toggle` | TTS session controls | Reader session overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 95 | `[data-reader-tts-cycle]` | `reader.session.capsule.update` | TTS cycle controls | Reader session overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 96 | `[data-reader-tts-dropdown]` | `dropdown.menu.expand/collapse` | reader TTS dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 97 | `[data-reader-tts-option]` | `dropdown.option.select` | reader TTS dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 98 | `[data-reader-tts-option-key]` | `dropdown.trigger.press` | reader TTS dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 99 | `[data-reader-tts-value]` | `state.content.replace` | reader value readout | Value label | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 100 | `[data-reader-typography-action]` | `stepper.press/value.change` | reader typography stepper | Stepper buttons | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 101 | `[data-reader-typography-set]` | `segment.item.switch` | reader typography option | Segmented control / option grid | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 102 | `[data-reader-typography-value]` | `state.content.replace` | reader value readout | Value label | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 103 | `[data-restore-record]` | `card.route` | restore flow | Backup card | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 104 | `[data-restore-scope]` | `toggle.switch` | restore scope selector | Checkbox / switch | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 105 | `[data-restore-scopes]` | `state.content.replace` | restore flow | Backup metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 106 | `[data-route]` | `app.route.push` | all route entries | NavigationLink / NavController / Router | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 107 | `[data-route-back]` | `app.route.pop` | back buttons / settings confirm | Back navigation | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 108 | `[data-route-replace]` | `app.route.push` | source-switch / reader handoff | Replace navigation / state handoff | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 109 | `[data-route-stack]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 110 | `[data-screen-host]` | `state.content.replace` | route screen host | Semantic slot / page host | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 111 | `[data-search-reset]` | `input.clear` | book search | Search field / result state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 112 | `[data-search-state]` | `search.state.replace` | book search | Search field / result state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 113 | `[data-search-submit]` | `input.submit` | book search | Search field / result state | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 114 | `[data-settings-confirm-result]` | `feedback.toast.enter` | settings confirm toast | Settings toast | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 115 | `[data-settings-option-choice]` | `dropdown.option.select` | settings option dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 116 | `[data-settings-option-dropdown]` | `dropdown.menu.expand/collapse` | settings option dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 117 | `[data-settings-option-key]` | `dropdown.trigger.press` | settings option dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 118 | `[data-settings-option-value]` | `dropdown.option.select` | settings option dropdown | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 119 | `[data-settings-overlay]` | `overlay.dialog.enter/exit` | settings flow | Settings overlay / sheet / dialog | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 120 | `[data-settings-scope]` | `state.content.replace` | settings flow | Settings scope metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 121 | `[data-shell]` | `state.content.replace` | shell metadata | Semantic shell slot | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 122 | `[data-slot]` | `state.content.replace` | developer mode / shell slots | Semantic slot / debug overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 123 | `[data-source-index]` | `state.content.replace` | source switch candidate | Source metadata | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 124 | `[data-source-menu-toggle]` | `dropdown.trigger.press` | source management menu | Anchored menu | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 125 | `[data-source-name]` | `listRow.select` | source switch candidate | List item | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 126 | `[data-source-switch]` | `toggle.switch` | source management switch | Switch / Checkbox | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 127 | `[data-source-switch-window]` | `reader.sourceSwitch.open/close` | source-switch flow | Reader inline overlay | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 128 | `[data-stack-size]` | `app.route.push/pop` | 开发者模式 / route panel | Navigation state / debug inspector | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 129 | `[data-top-action]` | `button.activate` | main tab top actions | IconButton | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 130 | `[data-typography-row]` | `state.content.replace` | reader numeric control row | Control row | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 131 | `[data-viewport-class]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | `frontend-demo/verify/motion/evidence/viewport.orientation.reshape__compact-landscape__reader.jpg` |
| 132 | `[data-viewport-height]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 133 | `[data-viewport-width]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 134 | `[data-width-class]` | `viewport.orientation.reshape` | 任意 route resize / rotate | Window metrics / size class | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 135 | `[data-discover-filter-toggle]` | `dropdown.trigger.press` | discover filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 136 | `[data-filter-close]` | `filter.apply.commit` | filter disclosure apply/close | Filter apply action | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 137 | `[data-filter-toggle]` | `dropdown.trigger.press` | generic filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 138 | `[data-rss-group-filter]` | `filter.item.toggle` | rss group filter disclosure | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 139 | `[data-rss-group-filter-toggle]` | `dropdown.trigger.press` | rss group filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 140 | `[data-rss-manage-filter]` | `filter.item.toggle` | rss subscription management filter | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 141 | `[data-rss-manage-filter-toggle]` | `dropdown.trigger.press` | rss subscription management filter | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 142 | `[data-source-filter-toggle]` | `dropdown.trigger.press` | source management filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 143 | `[data-source-group-filter]` | `filter.item.toggle` | source management group filter | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 144 | `[data-source-status-filter]` | `filter.item.toggle` | source management status filter | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 145 | `[data-rss-category-filter]` | `filter.item.toggle` | rss source category filter disclosure | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 146 | `[data-rss-category-filter-toggle]` | `dropdown.trigger.press` | rss source category filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 147 | `[data-rss-favorite-filter]` | `filter.item.toggle` | rss favorite filter disclosure | Filter chip / option | 待补 `frontend-demo/verify/motion/selector-matrix/*` |
| 148 | `[data-rss-favorite-filter-toggle]` | `dropdown.trigger.press` | rss favorite filter disclosure | Filter dropdown trigger | 待补 `frontend-demo/verify/motion/selector-matrix/*` |

## 当前证据状态

- 已完成：148 个唯一 `data-*` 入口均有 Motion ID、demo route / click path 和平台组件归类。
- 已完成第一批代表截图：`app.firstOpen.enter`、`tab.item.switch`、`dropdown.menu.expand`、`reader.entry.coverToImmersive`、`reader.session.capsule.enter`、`reader.session.controlSpace.enter`、`viewport.orientation.reshape`、`motion.interrupt.redirect` 已写入 `frontend-demo/verify/motion/evidence/manifest.json`，其中可直接对应 selector 的行已回填具体文件。
- 待完成：继续为每个 P0 Motion ID 录制或截图，并把 `Evidence` 从待补路径改成具体文件。
- 待完成：平台映射继续补 state 字段和测试文件名。
