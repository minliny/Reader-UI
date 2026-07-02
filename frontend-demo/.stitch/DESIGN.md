---
name: Reader Frontend Demo
colors:
  paper: "#fff8f4"
  paperSolid: "#f8f4ec"
  surface: "rgba(255, 252, 248, 0.90)"
  ink: "#1f1b17"
  muted: "#756f69"
  border: "#c1c7cd"
  primary: "#366179"
  primaryDark: "#274f66"
  accent: "#f48b13"
  danger: "#d62222"
---

# Design System: Reader Frontend Demo

## 1. Visual Theme & Atmosphere

Reader uses a warm paper interface with compact, tool-like controls. The app avoids large decorative surfaces: the main feeling is a native reading utility, with soft cream backgrounds, low-contrast borders, small radii, and dense but readable rows.

The primary composition is a phone-sized reading shell: fixed top system/status space, scrollable content, and floating bottom or side control surfaces. Controls are intentionally compact; most copy is 10-15px, while book titles and reading body text receive serif treatment.

## 2. Color Palette & Roles

### Primary Foundation

- Warm Paper `#fff8f4` and Solid Paper `#f8f4ec`: root app background and phone shell foundation.
- Translucent Surface `rgba(255, 252, 248, 0.90-0.96)`: cards, nav, reader overlays, and settings rows.
- Soft Meta Surface `#f5ece6`: secondary metadata blocks.
- Border Gray Beige `#c1c7cd` and `rgba(180,166,151,0.2-0.42)`: hairline card and row separation.

### Accent & Interactive

- Muted Teal Primary `#366179`: active controls, chips, source buttons.
- Deep Teal Primary Dark `#274f66`: selected main tabs, primary pill actions.
- Warm Orange Accent `#f48b13`: secondary accent and attention.
- Forest `#367a4d`: success/available state.
- Danger Red `#d62222`: destructive settings and error states.

### Typography & Text Hierarchy

- Ink `#1f1b17`: primary text.
- Control Ink `#41484c`: controls and neutral button text.
- Muted `#756f69`: metadata, subtitles, timestamps, summaries.
- White `#ffffff`: selected tab/action text on primary dark surfaces.

### Functional States

- Focus: `0 0 0 4px rgba(54, 97, 121, 0.22)`.
- Active selected: primary dark fill with white text.
- Pressed/active light: `rgba(54, 97, 121, 0.08-0.14)`.
- Disabled/read markers: muted beige dots and lowered opacity.

## 3. Typography Rules

### Hierarchy & Weights

- Sans stack: `-apple-system`, BlinkMacSystemFont, `SF Pro Text`, `PingFang SC`, `Microsoft YaHei`, sans-serif.
- Serif stack: `Songti SC`, `STSong`, `Noto Serif CJK SC`, `Source Han Serif SC`, serif.
- Top app title: serif 29px, weight 700, single line.
- Page/section title: 15-20px, mostly weight 800-900.
- Book title cards: serif 15-20px, line-height 1.2-1.22, one or two lines.
- Reader body: serif 18px, line-height 1.96, paragraph indent 2em.
- Metadata: 10-12px, muted, weight 650-800 depending on density.
- Tab labels and compact controls: 11-12px, heavy weight, one line.

### Spacing Principles

- Base spacing is 8px, with common increments at 10, 12, 14, 16, 24, 32.
- Main content uses tight 8px vertical gaps inside the phone content area.
- Card rows use 10-12px padding and 8-14px gaps.
- Reader content uses larger reading margins: 72px top, 32px side, 48px bottom in phone mode.

## 4. Component Stylings

### Buttons

Buttons are compact and pill-like for navigation/filter actions. Common heights are 30-34px for chips, 40-46px for fixed actions, and 42px circular reader module icons. Primary buttons use deep teal fill with white text; secondary buttons use translucent warm surface with muted ink.

### Cards & Containers

Cards use small radii: 4px for covers, 6-8px for rows/cards, 12px for reader module nav, 24px for floating nav. Shadows are soft and warm, usually `0 8px 26px` or `0 18px 36px` with brown opacity. Borders are preferred over heavy elevation.

### Navigation

The main nav is a floating 4-column pill: 68px min-height, 7px vertical and 8px horizontal padding, 24px radius, and selected item filled with primary dark. On tablet-expanded layouts the same nav becomes a left vertical rail, 82px wide, centered vertically.

### Inputs & Forms

Settings and source forms use compact rows with fixed icon boxes. Standard settings row: 58px min-height, 28px icon box, 10px gap, 12px horizontal padding. Inputs are 30px high inside 68px rows. Switches are 38x22 with an 18px thumb.

### Reader-Specific Components

Reader top overlay: absolute at top 18px, left/right 14px, min-height 54px, four columns `44 / 1fr / 62 / 34`, 24px radius. Reader module nav: absolute bottom 32px, left/right 24px, four columns, 78px min-height, 12px radius. Reader full control sheet: bottom 18px, left/right 12px, height 330px, 24px radius, containing a main grid and a right rail.

## 5. Layout Principles

### Grid & Structure

The canonical phone shell is 390x844 with 34px device radius. It contains a 48px status bar, a 58px top bar, a scrollable content area, and floating bottom navigation. Primary tabs share the same shell; secondary routes use back-bar shells with bottom action hosts.

### Whitespace Strategy

The UI is dense. Inner gaps are 4-12px, cards rarely exceed 16px horizontal padding, and lists avoid large empty bands. Reading mode is the main exception, with generous text margins and high line-height.

### Alignment & Visual Balance

List rows use icon/cover on the left, text in the center, and actions/status on the right. Text is mostly left-aligned; reader chapter title is centered in the reading layer. Floating controls sit above content rather than resizing content.

### Responsive Behavior & Touch

Phone mode keeps bottom nav. Tablet-expanded mode can move main nav to a left rail and reader controls to a right dock. Compact landscape reduces reader top height, module icon size, nav height, and panel gaps. Reduced motion collapses durations and movement distances to zero.

## 6. Design System Notes for Stitch Generation

### Language to Use

Warm paper reader UI, compact native utility, dense information rows, floating pill navigation, soft translucent surfaces, small radius cards, serif reading typography, low-contrast beige borders, teal active states.

### Color References

Use warm cream surfaces and muted teal active states. Avoid pure white page dominance; surfaces should remain slightly translucent and paper-toned.

### Component Prompts

- Create a mobile reader app shell with a 390x844 phone frame, warm paper background, 48px status bar, 58px top bar, scrollable content, and a floating 68px four-tab pill nav.
- Create a bookshelf screen with a 100px continue-reading card, a three-column book grid, serif book titles, compact metadata, and warm soft shadows.
- Create an immersive reader view with serif body text, 18px type, 1.96 line height, invisible 26/48/26 tap zones, a 54px floating progress top bar, and a 78px bottom module nav.

### Incremental Iteration

Start from shell and navigation, then align repeated row primitives, then reader overlays. Do not copy DOM or CSS class structure into native implementations; translate dimensions, hierarchy, state, and motion tokens into platform-native components.
