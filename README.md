# Reader UI

This directory contains the UI documentation, design drafts, frontend-input demo, handoff reports, and visual audit artifacts split out from:

`/Users/minliny/Documents/Reader for Android`

Migrated groups:

- `docs/ui-design`
- `docs/ui-handoff`
- `docs/cross-platform-ui`
- `docs/HANDOFF`
- UI-only planning files under `docs/PLANNING`
- Top-level UI/control audit reports such as bottom-bar, quick-action, canonical-control, and Stitch UI reports

Not migrated:

- Android source code under `app/src/...`
- Core, network, WebDAV, adapter, release, and `ANDROID_NON_UI_*` documents

Run the local UI demo from this directory:

```sh
cd "/Users/minliny/Documents/Reader UI/docs/ui-design/frontend-input"
python3 -m http.server 5173 --bind 127.0.0.1
```

Then open:

`http://127.0.0.1:5173/frontend-demo-draft/index.html`

Run validation:

```sh
cd "/Users/minliny/Documents/Reader UI"
READER_ANDROID_ROOT="/Users/minliny/Documents/Reader for Android" node docs/ui-design/frontend-input/validate-frontend-inputs.js
```
