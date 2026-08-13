import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const PRIMITIVE_TOKEN_NAMES = Object.freeze([
  "--fd-ds-color-control-field-surface",
  "--fd-ds-color-control-field-border-default",
  "--fd-ds-color-control-field-border-hover",
  "--fd-ds-color-control-field-border-focus",
  "--fd-ds-color-control-field-surface-disabled",
  "--fd-ds-color-control-field-ink-disabled",
  "--fd-ds-color-control-field-border-error",
  "--fd-ds-color-control-field-border-success",
  "--fd-ds-type-control-label-size",
  "--fd-ds-type-control-value-size",
  "--fd-ds-type-control-helper-size",
  "--fd-ds-space-control-inline",
  "--fd-ds-space-control-gap",
  "--fd-ds-space-control-row-block",
  "--fd-ds-size-control-sm-height",
  "--fd-ds-size-control-md-height",
  "--fd-ds-size-control-lg-height",
  "--fd-ds-size-control-touch-target",
  "--fd-ds-size-switch-track-width",
  "--fd-ds-size-switch-track-height",
  "--fd-ds-size-switch-thumb",
  "--fd-ds-size-control-icon",
  "--fd-ds-size-reader-field-label-column",
  "--fd-ds-radius-field",
  "--fd-ds-radius-button",
  "--fd-ds-radius-switch",
]);

function readRepoFile(relativePath) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

function cssCustomProperties(source) {
  const properties = new Map();
  for (const match of source.matchAll(/(--fd-ds-[a-z0-9-]+)\s*:\s*([^;{}]+);/gi)) {
    if (!properties.has(match[1])) properties.set(match[1], match[2].trim());
  }
  return properties;
}

function normalizeCssValue(value) {
  return String(value).trim().replace(/\s+/g, "");
}

function withoutCssComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

test("26 control primitive tokens stay synchronized between fixtures and tokens.css", () => {
  assert.equal(PRIMITIVE_TOKEN_NAMES.length, 26, "control primitive token contract should contain 26 names");

  const fixtures = JSON.parse(readRepoFile("contracts/fixtures/token.fixtures.json"));
  const cssProperties = cssCustomProperties(readRepoFile("frontend-demo-optimized/tokens.css"));

  for (const name of PRIMITIVE_TOKEN_NAMES) {
    const matches = fixtures.filter((fixture) => fixture.name === name);
    assert.equal(matches.length, 1, `token fixture should define ${name} exactly once`);
    assert.ok(cssProperties.has(name), `tokens.css is missing ${name}`);
    assert.equal(
      normalizeCssValue(cssProperties.get(name)),
      normalizeCssValue(matches[0].value),
      `${name} should have the same value in fixtures and tokens.css`,
    );
  }
});

test("Reader control primitive documentation covers components, states, sizes, and touch target", () => {
  const documentation = readRepoFile("docs/design/READER_CONTROL_PRIMITIVES.md");

  for (const primitive of [
    "FieldRow",
    "Select",
    "Input",
    "Switch",
    "Button",
    "SegmentedControl",
    "Slider",
  ]) {
    assert.match(documentation, new RegExp(`\\b${primitive}\\b`, "i"), `missing primitive: ${primitive}`);
  }

  for (const state of ["default", "hover", "focus", "disabled", "error", "success"]) {
    assert.match(documentation, new RegExp(`\\b${state}\\b`, "i"), `missing state: ${state}`);
  }

  for (const size of ["sm", "md", "lg"]) {
    assert.ok(
      documentation.includes(`--fd-ds-size-control-${size}-height`),
      `documentation should bind the ${size} size to its semantic token`,
    );
  }

  assert.match(documentation, /--fd-ds-size-control-touch-target/i);
  assert.match(documentation, /(?:touch\s*target|命中区|触摸热区)/i);
  assert.match(documentation, /44\s*(?:(?:px)|(?:[×x]\s*44\s*px))/i, "documentation should specify a 44px touch target");
});

test("optimized demo imports the shared control primitive stylesheet", () => {
  const entryStylesheet = readRepoFile("frontend-demo-optimized/styles.css");
  assert.match(
    entryStylesheet,
    /@import\s+(?:url\(\s*)?["']\.\/styles\/07-control-primitives\.css(?:\?[^"']*)?["']\s*\)?\s*;/i,
    "styles.css should import styles/07-control-primitives.css",
  );
});

test("shared control CSS exposes opt-in primitives, complete states, and consumes semantic tokens", () => {
  const stylesheet = withoutCssComments(readRepoFile("frontend-demo-optimized/styles/07-control-primitives.css"));

  assert.match(
    stylesheet,
    /\[data-ui-primitive(?:[~|^$*]?=|\])|\.fd-control-[a-z0-9_-]+/i,
    "shared CSS should expose data-ui-primitive or fd-control-* opt-in selectors",
  );
  assert.match(stylesheet, /:focus-visible\b/i, "shared CSS should define focus-visible feedback");
  assert.match(
    stylesheet,
    /:disabled\b|\[disabled(?:\]|\s*=)|\[aria-disabled\s*=\s*["']?true/i,
    "shared CSS should define disabled feedback",
  );
  assert.match(
    stylesheet,
    /data-(?:state|validation)\s*=\s*["']?error|aria-invalid\s*=\s*["']?true|\.is-error\b|\.fd-control-[a-z0-9_-]*error\b/i,
    "shared CSS should define error feedback",
  );
  assert.match(
    stylesheet,
    /data-(?:state|validation)\s*=\s*["']?success|\.is-success\b|\.fd-control-[a-z0-9_-]*success\b/i,
    "shared CSS should define success feedback",
  );

  for (const name of PRIMITIVE_TOKEN_NAMES) {
    assert.match(
      stylesheet,
      new RegExp(`var\\(\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
      `shared CSS should consume ${name}`,
    );
  }
});

test("reader full TTS page composes the shared primitives with one keyboard model", () => {
  const runtime = readRepoFile("frontend-demo-optimized/render-runtime.js");

  assert.match(runtime, /data-ui-control-scope=["']reader-tts["']/i);
  assert.match(runtime, /fd-control-button fd-reader-tts-transport-button/i);
  assert.match(runtime, /fd-control-slider[^>]+data-ui-primitive=["']slider["']/i);
  assert.match(runtime, /role=["']listbox["'][^>]+tabindex=["']0["']/i);
  assert.match(runtime, /role=["']option["'] tabindex=["']-1["']/i);
  assert.match(runtime, /role=["']tab["'][^>]+tabindex=["']\$\{ttsProvider/i);
  assert.match(runtime, /data-reader-tts-provider=["']system["']/i);
  assert.match(runtime, /data-reader-tts-provider=["']online["']/i);
  assert.match(runtime, /(?:ArrowLeft|ArrowRight)[\s\S]+(?:Home|End)/i);
  assert.match(runtime, /data-ui-state=["']error["']/i);
  assert.match(runtime, /aria-invalid=["']true["']/i);
});

test("reader full TTS primitive composition is route scoped and container responsive", () => {
  const stylesheet = withoutCssComments(readRepoFile("frontend-demo-optimized/styles/07-control-primitives.css"));

  assert.match(
    stylesheet,
    /\.fd-reader-full-page-route-reader-full-tts\s+\[data-ui-control-scope=["']reader-tts["']\]/i,
  );
  assert.match(stylesheet, /container:\s*reader-full-tts\s*\/\s*inline-size/i);
  assert.match(stylesheet, /@container\s+reader-full-tts\s*\(max-width:\s*560px\)/i);
  assert.match(stylesheet, /min-height:\s*var\(--fd-ds-size-control-touch-target\)/i);
  assert.match(stylesheet, /\.fd-reader-tts-config-grid[\s\S]+grid-template-columns:\s*repeat\(2,/i);
});

test("reader quick TTS is a strict subset of the full control page", () => {
  const runtime = readRepoFile("frontend-demo-optimized/render-runtime.js");
  const stylesheet = withoutCssComments(readRepoFile("frontend-demo-optimized/styles/07-control-primitives.css"));
  const branchStart = runtime.indexOf('if (type === "tts")');
  const branchEnd = runtime.indexOf('if (type === "appearance")', branchStart);
  assert.ok(branchStart >= 0 && branchEnd > branchStart, "quick TTS renderer branch should exist");
  const quickTts = runtime.slice(branchStart, branchEnd);

  const prevIndex = quickTts.indexOf('data-reader-tts-action="prev"');
  const toggleIndex = quickTts.indexOf('data-reader-tts-action="toggle"');
  const stopIndex = quickTts.indexOf('data-reader-session-stop="tts"');
  const nextIndex = quickTts.indexOf('data-reader-tts-action="next"');
  assert.ok(prevIndex < toggleIndex && toggleIndex < stopIndex && stopIndex < nextIndex);
  assert.equal((quickTts.match(/data-reader-session-stop="tts"/g) || []).length, 1);

  assert.match(quickTts, /data-reader-tts-timer-preset/i);
  assert.match(quickTts, /data-reader-tts-speed-range/i);
  assert.match(quickTts, /icon\("tts"[^\n]+<strong>播放<\/strong>/i);
  assert.match(quickTts, /icon\("clock"[^\n]+<strong>定时<\/strong>/i);
  assert.match(quickTts, /icon\("motion"[^\n]+<strong>语速<\/strong>/i);
  assert.doesNotMatch(quickTts, /data-reader-tts-provider/i);
  assert.doesNotMatch(quickTts, /语音来源|系统 TTS|在线 TTS/i);
  assert.doesNotMatch(quickTts, /data-reader-tts-option-key="(?:voice|scope)"/i);
  assert.doesNotMatch(quickTts, /data-reader-tts-config-field/i);

  assert.match(stylesheet, /reader-tts-control-row\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+128px[\s\S]*?gap:\s*8px/i);
  assert.match(stylesheet, /reader-tts-controls\s*\{[\s\S]*?width:\s*128px[\s\S]*?grid-template-columns:\s*repeat\(4,\s*32px\)[\s\S]*?gap:\s*0/i);
  assert.match(stylesheet, /button\.is-primary::before\s*\{[\s\S]*?width:\s*24px/i);
  assert.match(stylesheet, /fd-reader-tts-quick-stop::before\s*\{[\s\S]*?width:\s*22px/i);
  assert.match(stylesheet, /data-icon-name=["']chevron["'][\s\S]*?width:\s*16px[\s\S]*?scaleX\(1\.25\)/i);
  assert.match(stylesheet, /data-icon-name=["']play["'][\s\S]*?width:\s*21px/i);
  assert.match(stylesheet, /data-icon-name=["']stop["'][\s\S]*?width:\s*26px/i);
  assert.match(stylesheet, /data-icon-name=["']play["'][\s\S]*?left:\s*calc\(50%\s*-\s*1\.75px\)/i);
});

test("reader quick and full TTS share timer and speed state", () => {
  const runtime = readRepoFile("frontend-demo-optimized/render-runtime.js");
  const presetStart = runtime.indexOf("const readerTtsQuickTimerPresets");
  const presetEnd = runtime.indexOf("function readerTtsTimerParts", presetStart);
  assert.ok(presetStart >= 0 && presetEnd > presetStart);
  const presetSource = runtime.slice(presetStart, presetEnd);
  const presets = [...presetSource.matchAll(/\{\s*seconds:\s*(\d+),\s*label:\s*"([^"]+)"\s*\}/g)]
    .map((match) => ({ seconds: Number(match[1]), label: match[2] }));
  assert.deepEqual(presets, [
    { seconds: 30, label: "30s" },
    { seconds: 60, label: "1min" },
    { seconds: 120, label: "2min" },
    { seconds: 180, label: "3min" },
    { seconds: 240, label: "4min" },
    { seconds: 300, label: "5min" },
  ]);

  assert.match(runtime, /appState\.readerTtsTimerMinutes\s*=\s*Math\.floor\(totalSeconds\s*\/\s*60\)/i);
  assert.match(runtime, /appState\.readerTtsTimerSeconds\s*=\s*totalSeconds\s*%\s*60/i);
  assert.match(runtime, /const timerParts\s*=\s*readerTtsTimerParts\(appState\)/i);
  assert.match(runtime, /appState\.readerTts\.speed\s*=\s*`\$\{value\.toFixed\(1\)\}x`/i);
});
