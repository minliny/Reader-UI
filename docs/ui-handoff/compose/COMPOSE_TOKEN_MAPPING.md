# Compose Token Mapping

## 1. Source CSS

Primary source files:
- `docs/ui-handoff/css/reader-design-tokens.css`
- `docs/ui-handoff/css/reader-components.css`
- `docs/ui-handoff/css/reader-control-layer.css`
- `docs/ui-handoff/css/reader-screens.css`

## 2. Color Tokens

| CSS token | Compose token | Value | MaterialTheme mapping | Note |
|---|---|---:|---|---|
| `--reader-paper-bg` | `ReaderColors.paperBg` | `#fff8f4` | can seed `background` only for reader surfaces | Reader-specific paper, not generic app background |
| `--reader-body-text` | `ReaderColors.bodyText` | `#53433f` | no direct Material reuse | Reading text color |
| `--reader-control-ink` | `ReaderColors.controlInk` | `#3f4d52` | can map to `onSurface` for reader controls | Cool ink for controls |
| `--reader-primary` | `ReaderColors.primary` | `#366179` | can map to `primary` | Reader interaction accent |
| `--reader-bottom-bar-bg` | `ReaderColors.bottomBarBg` | `#e9ded6` | no direct Material reuse | Fixed reader bottom bar |
| `--reader-floating-control-bg` | `ReaderColors.floatingControlBg` | `#efe2d8` | no direct Material reuse | Floating reader controls |
| `--reader-floating-control-bg-alt` | `ReaderColors.floatingControlBgAlt` | `#eadbd0` | no direct Material reuse | Alternate floating layer |
| `--reader-quick-button-bg` | `ReaderColors.quickButtonBg` | `#f7ebe1` | no direct Material reuse | Circular quick actions |
| `--reader-boundary` | `ReaderColors.handoffBoundary` | `rgba(63,77,82,0.18)` | debug/handoff only | Not production-visible unless debug enabled |
| `--reader-control-border` | `ReaderColors.controlBorder` | `rgba(63,77,82,0.12)` | border token | Thin control separation |

## 3. Typography Tokens

Use a Reader typography layer instead of relying only on `MaterialTheme.typography`:
- `ReaderTypography.readerTitle`: 28sp / 36sp / 700.
- `ReaderTypography.readerBody`: 18sp / relaxed line height.
- `ReaderTypography.controlTitle`: 18sp / 24sp / 700.
- `ReaderTypography.controlLabel`: 12sp / 16sp / 500.
- `ReaderTypography.listTitle`: 14sp / 18sp / 600.

## 4. Spacing Tokens

- `ReaderSpacing.xs = 8.dp`
- `ReaderSpacing.sm = 12.dp`
- `ReaderSpacing.md = 16.dp`
- `ReaderSpacing.lg = 24.dp`
- `ReaderSpacing.readerHorizontal = 24.dp`
- `ReaderSpacing.bottomSafeGap = 8.dp`

## 5. Shape Tokens

- `ReaderShapes.card = RoundedCornerShape(16.dp)`
- `ReaderShapes.overlay = RoundedCornerShape(22.dp)`
- `ReaderShapes.circle = CircleShape`
- `ReaderShapes.pill = RoundedCornerShape(percent = 50)`

## 6. Elevation Tokens

- `ReaderElevation.none = 0.dp`
- `ReaderElevation.floating = 2.dp` with shadow color matching `rgba(63,77,82,0.12)` intent.
- Avoid Material high elevations for reader overlays; the normalized HTML intentionally uses light floating depth.

## 7. Reader Control Layer Layout Tokens

| CSS token | Compose token |
|---|---|
| `--reader-bottom-bar-height: 68px` | `ReaderControlMetrics.bottomBarHeight = 68.dp` |
| `--reader-floating-page-control-height: 52px` | `ReaderControlMetrics.pageControlHeight = 52.dp` |
| `--reader-quick-circle-size: 48px` | `ReaderControlMetrics.quickCircleSize = 48.dp` |
| `--reader-quick-circle-gap: 20px` | `ReaderControlMetrics.quickCircleGap = 20.dp` |
| `--reader-brightness-left: 12px` | `ReaderControlMetrics.brightnessDockInset = 12.dp` |

## 8. Night Reading Mode

Reading night mode is a reader content/control state, not the same thing as global app dark mode. It should be modeled as `ReaderVisualMode.Night` and must not automatically flip `MaterialTheme.colorScheme` for the entire app.
