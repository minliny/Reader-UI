# Shared local ebook renderer

Android WebView and iOS WKWebView bundle the three files listed in `productionResources` in [manifest.json](manifest.json). The native host loads `shell.html` through its own controlled origin and installs `reader-ebook-dom.js` followed by `reader-ebook-runtime.js` only in that shell. Android serves the shell through WebViewAssetLoader. iOS serves it through WKURLSchemeHandler and installs the bridge in a named WebKit content world.

The platform obtains the presentation descriptor and processed chapter projection from the same Core chapter identity and versions. It reads that descriptor's original XHTML entry through the Core ABI against the authorized retained source. It passes the descriptor's canonical document and scalar window, the processed chapter text, and the opening anchor to the shared script.

`ReaderEbookRuntime.open(configuration, adapter)` uses these fields.

| Field | Value |
| --- | --- |
| `session`, `documentId`, `layoutGeneration` | Native-issued identities for the current reading session, XHTML chapter instance and layout. |
| `entryPath`, `xhtml` | Core-verified archive-relative path and original XHTML. |
| `documentCanonicalContent`, `chapterStartScalar`, `chapterEndScalar` | Core's canonical complete document and half-open chapter window. |
| `content`, `scalarCount` | Core's processed chapter and its Unicode scalar count. |
| `anchor`, `style` | Chapter scalar and native presentation options. |

The native adapter provides the following interface.

```ts
interface ReaderEbookAdapter {
  resourceCSPSource: string;
  resourceURL(relativeArchivePath: string): string | null;
  postMessage(event: ReaderEbookEvent): void;
}
```

`resourceCSPSource` admits one controlled HTTPS origin or one application-owned scheme. The native archive handler authorizes the current document and normalized path before using Core's bounded archive reader. The renderer moves compatible publication markup into a script-disabled iframe. It verifies the full document's scalar order, inline spaces, structural separators and image markers before cropping. It rechecks the resulting DOM against the processed chapter. The processed chapter can omit edge newlines from the exact Core window. Other changes in the window or text return a failure for the coordinator's Core-projection fallback.

The outgoing event contains `version`, `session`, `documentId`, `layoutGeneration`, `kind` and `value`. Ready and position events carry the measured scalar, its text and viewport rectangle. Ready also includes the loaded image count. Selection events carry the two Core chapter scalar endpoints or null. Link events carry the normalized internal publication path and optional fragment. A click continues within the admitted chapter when the corresponding element survives the crop. The host checks message origin, frame, session, document and layout generation before updating the page.

`open(configuration, adapter): Promise<void>` prepares the document and reports readiness or failure through the adapter. `reflow(session, documentId, generation, style, anchor?): Promise<void>` advances the current document to a later layout and restores its supplied, measured or pending scalar. Only the current document and layout may publish. `position()` and `selection()` return the current ready state. Opening, reflowing or explicitly calling `restore(scalar)` with an in-range whitespace scalar reports the actual measured point. The renderer uses the first visible scalar after the whitespace, or the last visible scalar before it when there is no visible successor. `scalarCount` is the exclusive anchor bound. `select(start, end)` still requires proven DOM endpoints. `retire(session, documentId)` releases the frame for that identity.

[fixtures/m1-window.epub](fixtures/m1-window.epub) contains two logical chapters in `EPUB/text/trail.xhtml`. Chapter index 1 contains `EPUB/images/path.png` and the text `𠀀与Café`. The archive is shared by test hosts and is excluded from production resources. The generator preserves the exact archived bytes and is checked independently.

- `node scripts/generate-theme-tokens.mjs --check` checks the frozen color tokens.
- `node scripts/generate-m1-ui.mjs --check` checks Kotlin and Swift metrics, icon mappings and resource hashes. Use `--write` after editing an authoritative input.
- `node --test reader_ebook_runtime/tests/*.test.mjs` checks scalar counting and invalid window rejection.
- `python3 reader_ebook_runtime/fixtures/generate-m1-window.py --check` checks the archived EPUB against its source generator.
- `python3 reader_ebook_runtime/tests/check_runtime.py` tests both chapter windows, selection, image, whitespace anchors, reflow and stale callbacks in host Chromium. Its default is an independent projection fixture. Pass `--core-projection <capture.json>` to use an exact EPUB paired with the real C ABI presentation and chapter content replies. Platform journeys exercise their own WebViews.
