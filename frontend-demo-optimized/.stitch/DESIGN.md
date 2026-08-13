---
name: Reader Paper Flow
colors:
  paper: "#fff8f4"
  paperBright: "#fff8f1"
  surface: "rgba(255,255,255,0.88)"
  surfaceSoft: "rgba(255,252,248,0.72)"
  ink: "#1f1b17"
  controlInk: "#41484c"
  muted: "#756f69"
  border: "#c1c7cd"
  primary: "#2d4a3e"
  primaryDark: "#1f3528"
  accent: "#f48b13"
  success: "#338144"
  error: "#d7473e"
  nightPaper: "#181f22"
  nightInk: "#d8ccc4"
---

# Reader Paper Flow Design System

## 1. Theme and visual character

Reader is a quiet reading utility built from warm paper, restrained forest-green actions, precise alignment, and compact native controls. The interface should feel like tools resting on a page, not a collection of floating cards.

Use one main surface per module. Establish hierarchy with typography, whitespace, label alignment, and fine dividers. Avoid stacking rounded containers, decorative gradients, large shadows, or independent pill controls around every setting.

Control state changes must remain local to the owning component and must not mutate unrelated content or layout.

## 2. Semantic color system

All implementation colors come from `tokens.css`; the hexadecimal values in frontmatter are discovery metadata, not permission to hardcode them in components.

### Foundation roles

- `--fd-ds-color-paper` and `--fd-ds-color-paper-bright`: reading and application paper.
- `--fd-ds-color-surface` and `--fd-ds-color-surface-soft`: elevated and quiet utility surfaces.
- `--fd-ds-color-ink`: reading and primary application text.
- `--fd-ds-color-control-ink`: control labels and values.
- `--fd-ds-color-muted`: descriptions, metadata, helper text.
- `--fd-ds-color-border`: low-emphasis structural separation.
- `--fd-ds-color-primary` and `--fd-ds-color-primary-dark`: selection and primary action.
- `--fd-ds-color-accent`: scarce attention accent, never a replacement for status semantics.

### Control-state roles

- Field surface: `--fd-ds-color-control-field-surface`.
- Default, hover, and focus borders: `--fd-ds-color-control-field-border-default`, `-hover`, and `-focus`.
- Disabled surface and ink: `--fd-ds-color-control-field-surface-disabled` and `--fd-ds-color-control-field-ink-disabled`.
- Validation borders: `--fd-ds-color-control-field-border-error` and `--fd-ds-color-control-field-border-success`.
- Keyboard focus ring: `--fd-ds-state-focus`; it overlays the current state and never replaces an error border.

State priority is `disabled > error/success > focus-visible > pressed > selected/on > hover > rest`. A state must not alter geometry. Color is never the only signal: selection also uses shape/checkmark, Switch uses thumb position, and validation uses a nearby message.

### Night mode

Night reading uses the published `*-night` semantic set. Components switch semantic roles; they do not invent local dark colors.

## 3. Typography

### Families

- UI sans: `--fd-ds-font-sans`, using the platform system UI stack with Chinese fallbacks.
- Reading serif: `--fd-ds-font-serif`, used for long-form text and selected editorial titles.

### Hierarchy

- Reading body: `--fd-ds-type-reader-body-size` with a generous reader-owned line height.
- Field label: `--fd-ds-type-control-label-size`, weight 700, normal sentence casing.
- Field value and button label: `--fd-ds-type-control-value-size`, weight 600-700.
- Helper, validation, and compact metadata: `--fd-ds-type-control-helper-size`.
- Section titles are stronger than field labels but remain visually quieter than the reading title.

Do not shrink control text to resolve overflow. At 150% and 200% text size, controls grow or FieldRows stack. Labels, values, actions, and validation messages cannot be clipped to preserve a fixed panel height.

## 4. Spacing, geometry, and density

Use semantic spacing tokens. Control-specific spacing is `--fd-ds-space-control-inline`, `--fd-ds-space-control-gap`, and `--fd-ds-space-control-row-block`.

### Control size ladder

| Size | Visual minimum | Required hit target | Use |
| --- | --- | --- | --- |
| `sm` | `--fd-ds-size-control-sm-height` = 28px | `--fd-ds-size-control-touch-target` = 44px | Dense controls and popovers |
| `md` | `--fd-ds-size-control-md-height` = 36px | 44px | Default FieldRows |
| `lg` | `--fd-ds-size-control-lg-height` = 44px | 44px | Primary or descriptive controls |

The visual box may be smaller than the hit target only when a parent row or transparent interactive wrapper supplies the full 44px target. Standard fields use `--fd-ds-radius-field`; standard buttons use `--fd-ds-radius-button`; Switch tracks use `--fd-ds-radius-switch`. `--fd-ds-radius-control` is a legacy pill token and is not the default field/button radius.

## 5. Core control primitives

### FieldRow

An ordinary setting is always composed as:

```text
FieldRow
├── LabelBlock: Label + optional Description
├── ControlSlot: one primary control
└── AssistiveMessage: Hint, Error, or Success
```

Wide containers use a shared label column (`--fd-ds-size-reader-field-label-column`) and a flexible control column. Labels align left; controls align right or fill their slot. Narrow containers stack LabelBlock above ControlSlot. Adjacent rows use whitespace or one divider, not an extra rounded card per row.

Use `.fd-control-field-row` or `data-ui-primitive="field-row"`. Use `data-ui-size="sm|md|lg"`, `data-ui-state="error|success|disabled"`, and `data-ui-responsive="stack"` rather than local offsets.

### Input

Input and Select share surface, border, radius, value type, padding, and the size ladder. A visible Label is mandatory; placeholder text only demonstrates format. URL and credential fields retain user input after failure. Password values never appear in helper text, logs, or ordinary readable state.

Use `.fd-control-input` or `data-ui-primitive="input"`. Validation uses `aria-invalid` plus an associated message. Read-only remains focusable and copyable; disabled is removed from ordinary interaction and uses disabled semantic roles.

### Select

The value is left-aligned and the chevron occupies a fixed trailing zone. The trigger never uses primary-button fill. Popup width is at least the trigger width, selected options use text plus a checkmark, and opening the popup does not resize the trigger.

Use `.fd-control-select` or `data-ui-primitive="select"`. `sm` is reserved for dense contexts; ordinary fields default to `md`. Two to five short stable choices may use SegmentedControl; longer or dynamic sets use Select.

### Switch

Switch is only for a persistent binary setting. The published geometry is a 44x24 track with a 20px thumb and a 44px minimum hit target. Off uses the default control border color; On uses primary dark; the thumb uses surface color. The thumb position and the accessible checked value both communicate state.

Decorative tracks inside an interactive FieldRow are `aria-hidden`; the parent owns `role="switch"` and `aria-checked`. A standalone Switch button supplies its own 44px hit target. Never use Switch for navigation, playback, or a one-shot command.

### Button

Every action group has at most one Primary action.

- Primary: the one commit action, primary fill and surface-colored text.
- Secondary: normal bordered action on field surface.
- Tertiary: transparent reversible action, surface appears only on interaction.
- Destructive: explicit consequence text with error border/text; confirmation when impact is high.
- IconButton: only when the icon is unambiguous; the icon may be compact but the hit target remains 44px.

Use `.fd-control-button` or `data-ui-primitive="button"` plus `data-ui-variant="primary|secondary|tertiary|danger"`. Loading preserves label width and blocks duplicate activation. Product-specific interactive components consume shared tokens and focus behavior but are not automatically restyled as ordinary buttons.

### SegmentedControl

Use for two to five short, stable, mutually exclusive values. It is one shared soft container with equal-height options, not a row of independent pills. Selection uses a field surface, stronger border, strong text, and `aria-selected`; it never enlarges or lifts the selected option.

Use `.fd-control-segmented` or `data-ui-primitive="segmented"`. Descriptive options may use the `lg` state language while retaining their internal icon-and-description layout. Selectable tiles are not SegmentedControl.

### Slider

Slider has a textual value, inactive track, active track, and thumb. Track thickness stays quiet while the interactive height is 44px. The control declares min, max, step, and accessible value text. Dragging follows the pointer; expensive reading reflow is throttled and committed on release.

Use `.fd-control-slider` or `data-ui-primitive="slider"`; Web may supply `--fd-control-slider-value` for the active-track percentage. Horizontal and vertical sliders share state semantics while retaining their task-specific orientation.

## 6. Control states and interaction

| State | Visual treatment | Behavior |
| --- | --- | --- |
| Rest | Field surface, default border, control ink | Stable |
| Hover | Hover border on precise-pointer devices | No movement |
| Pressed | Quiet surface response | No layout or hit-target change |
| Focus-visible | Existing state plus `--fd-ds-state-focus` | Keyboard/assistive input only |
| Selected / On | Shape or thumb position plus stronger semantic color | Short non-spring transition |
| Disabled | Disabled surface and ink | No interaction or animation |
| Read-only | Normal readable surface | Focus/copy allowed, editing blocked |
| Loading | Original geometry and label space retained | Duplicate action blocked |
| Error | Error border and adjacent repair message | User value retained, no shaking |
| Success | Success border/message only when useful | Settles once, no persistent flourish |

Inputs and Selects support keyboard focus; Select popup returns focus to its trigger. SegmentedControl uses roving selection semantics. Slider supports arrows, PageUp/PageDown, Home, and End. Switch uses Space. Buttons use Enter and Space. Popup and dialog focus is moved in and restored on close.

## 7. Layout and responsive behavior

This design-system document does not define product structure, module content, navigation, or expansion behavior. Those decisions must come from a separate authoritative product specification.

- FieldRows may use two columns while space permits.
- Narrow content or 150-200% text: FieldRows stack, controls fill the available width, action groups wrap, and the page scrolls vertically.
- Wider layouts retain the same primitive sizes and state language.
- Safe areas are always respected. Popup lists, focus rings, and validation messages cannot be clipped by an ancestor overflow rule.
- RTL and long localization use logical inline directions; no component relies on hand-tuned left offsets.

## 8. Motion

Use Paper Flow Ink Response: press feedback is approximately 60-80ms, activation 100-120ms, and selection 120-160ms through published motion variables. Motion changes color, border, or a small local surface; it does not bounce, glow, or push adjacent content.

Switch thumb motion is short and linear. Dropdowns use a restrained fade/settle. Reduced Motion retains color and focus feedback while movement and scale collapse to the instant motion token.

## 9. Stitch generation guidance

### Preferred language

Warm paper reading utility, quiet native controls, fine beige-gray borders, forest-green selection, aligned FieldRows, compact but accessible hit targets, serif long-form reading, one surface per module, restrained Ink Response.

### Build order

1. Create the phone/application or Reader shell without decorative nested cards.
2. Establish semantic colors and typography.
3. Build FieldRow, Input, Select, Switch, Button, SegmentedControl, and Slider from the token size ladder.
4. Assemble product structure only from a separate authoritative specification; this document does not supply module hierarchy or content.
5. Add specialized interactive components without turning them into ordinary buttons.
6. Verify rest, hover, pressed, focus-visible, selected, disabled, loading, error, and success at phone width and 200% text.

### Do not generate

- A unique rounded-card style for every field.
- Full-width Selects where a short right-aligned control is specified.
- Tiny switches or icon buttons without a 44px hit target.
- Pill-shaped ordinary Input/Select/Button controls.
- Color-only selection or validation.

When translating to native platforms, preserve semantic tokens, hierarchy, state, accessibility, and layout boundaries; do not copy browser DOM structure literally.
