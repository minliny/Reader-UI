import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const appearanceSpecSource = readFileSync(join(root, "appearance-spec.js"), "utf8");
const w4Source = readFileSync(join(root, "renderers/w4-theme-font-typography-renderers.js"), "utf8");
const d2SettingsSource = readFileSync(join(root, "renderers/d2-settings-sync-renderers.js"), "utf8");
const d3Source = readFileSync(join(root, "renderers/d3-control-layers-renderers.js"), "utf8");
const runtimeSource = readFileSync(join(root, "render-runtime.js"), "utf8");
const appearanceCss = readFileSync(join(root, "styles/03a-reader-appearance.css"), "utf8");

function evaluateW4() {
  const storage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {},
  };
  const shell = {
    esc(value) {
      return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    },
    icon(name) { return `<svg data-icon="${name}"></svg>`; },
    renderReaderShell(options) {
      return `${options.readingSurfaceHtml || ""}${options.overlayHtml || ""}${options.bottomSheetHtml || ""}`;
    },
  };
  const window = {
    localStorage: storage,
    ReaderShellKit: shell,
    ReaderFrontendDemoDraftRouteContract: { routes: {} },
  };
  const context = vm.createContext({ window });
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(w4Source, { filename: "w4-theme-font-typography-renderers.js" }).runInContext(context);
  return context.window.ReaderW4ThemeFontTypographyRenderers;
}

function evaluateD2Settings() {
  const window = {
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    ReaderShellKit: {
      icon(name) { return `<svg data-icon="${name}"></svg>`; },
      renderSettingsShell(options) { return options.contentHtml || ""; },
    },
    ReaderFrontendDemoDraftRouteContract: { routes: {} },
  };
  const context = vm.createContext({ window });
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  new vm.Script(d2SettingsSource, { filename: "d2-settings-sync-renderers.js" }).runInContext(context);
  return context.window.ReaderD2SettingsSyncRenderers;
}

function row(page, title) {
  for (const section of page.sections || []) {
    const match = (section.rows || []).find((item) => item.title === title);
    if (match) return match;
  }
  assert.fail(`missing row: ${title}`);
}

const data = {
  reader: {
    title: "长夜余火",
    typography: { fontFamily: "serif", fontSize: 18, lineHeight: 1.96, paragraphGap: 16, letterSpacing: 0 },
    fontOptions: [
      { label: "系统", value: "system", fontStack: "system-ui" },
      { label: "宋体", value: "serif", fontStack: "serif" },
      { label: "黑体", value: "sans", fontStack: "sans-serif" },
      { label: "楷体", value: "kai", fontStack: "serif" },
      { label: "仿宋", value: "fangsong", fontStack: "serif" },
      { label: "等宽", value: "mono", fontStack: "monospace" },
    ],
  },
};

test("ThemeSwatch and FontCell expose one canonical DOM source", () => {
  const w4 = evaluateW4();
  const theme = w4.data.defaultThemes()[0];
  const themeHtml = w4.components.themeSwatch(theme, theme.value);
  const fontHtml = w4.components.fontCell(data.reader.fontOptions[1], "serif");

  assert.match(themeHtml, /data-reader-appearance-source="ThemeSwatch"/);
  assert.match(themeHtml, /class="fd-reader-theme-swatch is-active"/);
  assert.match(themeHtml, /class="fd-reader-theme-swatch-fill"/);
  assert.doesNotMatch(themeHtml, /box-shadow|filter:/);

  assert.match(fontHtml, /data-reader-appearance-source="FontCell"/);
  assert.match(fontHtml, /class="fd-reader-font-cell is-active"/);
  assert.match(fontHtml, /class="fd-reader-font-cell-pill"/);
  assert.match(fontHtml, /data-reader-typography-set="fontFamily"/);
});

test("generated AppearanceSpec drives exact theme font select and stepper defaults", () => {
  const window = {};
  const context = vm.createContext({ window });
  new vm.Script(appearanceSpecSource, { filename: "appearance-spec.js" }).runInContext(context);
  const spec = context.window.ReaderAppearanceSpec;
  assert.equal(spec.source.path, "Reader 2/Full/AppearanceContent");
  assert.deepEqual(Array.from(spec.themes, (item) => `${item.label}|${item.swatchHex}`), [
    "日间|#FFFFFF", "暖白|#FBF0DF", "夜间|#26231F", "暖夜|#302922",
    "纸纹|#F5EAD8", "青叶纹|#E7F0E2", "夜纹|#34302B", "林夜纹|#263129",
  ]);
  assert.deepEqual(Array.from(spec.fonts, (item) => item.label), [
    "系统", "宋体", "黑体", "楷体", "仿宋", "等宽", "思源宋体", "霞鹜文楷", "+ 导入",
  ]);
  assert.deepEqual(Array.from(spec.selects, (item) => item.defaultValue), ["none", "simplified", "slide", "justify"]);
  assert.deepEqual(Array.from(spec.steppers, (item) => item.defaultValue), [18, 1.96, 16, 0]);
});

test("D2 reading preference and typography pages project the generated AppearanceSpec", () => {
  const d2 = evaluateD2Settings();
  const preferences = d2.pages.globalSettings("settings-reading-preferences", {});
  const typography = d2.pages.readingSettings("reading-typography-default", {});
  const pageTurn = d2.pages.readingSettings("reading-page-turn-default", {});
  const themeLabels = ["日间", "暖白", "夜间", "暖夜", "纸纹", "青叶纹", "夜纹", "林夜纹"];
  const fontLabels = ["系统", "宋体", "黑体", "楷体", "仿宋", "等宽", "思源宋体", "霞鹜文楷"];

  assert.equal(row(preferences, "默认主题").value, "纸纹");
  assert.deepEqual(Array.from(row(preferences, "默认主题").options), themeLabels);
  assert.equal(row(preferences, "默认字体").value, "宋体");
  assert.deepEqual(Array.from(row(preferences, "默认字体").options), fontLabels);
  assert.equal(row(preferences, "默认字号").value, "18");
  assert.equal(row(preferences, "默认行距").value, "1.96");
  assert.deepEqual(Array.from(row(preferences, "默认翻页动画").options), ["覆盖", "滑动", "仿真", "滚动", "无动画"]);
  assert.deepEqual(Array.from(row(preferences, "夜间配色").options), ["夜间", "暖夜", "夜纹", "林夜纹"]);

  assert.deepEqual(Array.from(row(typography, "默认字体").options), fontLabels);
  assert.equal(row(typography, "字号").value, "18");
  assert.equal(row(typography, "行距").value, "1.96");
  assert.equal(row(typography, "段距").value, "16");
  assert.deepEqual(Array.from(row(typography, "文字对齐").options), ["开启", "关闭"]);
  assert.deepEqual(Array.from(row(typography, "缩进").options), ["无", "2 字符"]);
  assert.deepEqual(Array.from(row(pageTurn, "翻页动画").options), ["覆盖", "滑动", "仿真", "滚动", "无动画"]);

  assert.doesNotMatch(d2SettingsSource, /\["系统默认",\s*"思源宋体",\s*"思源黑体",\s*"霞鹜文楷"\]/);
  assert.doesNotMatch(d2SettingsSource, /\["日间",\s*"夜间",\s*"纸纹",\s*"暖白",\s*"青绿",\s*"雾蓝"\]/);
});

test("quick and full appearance routes consume canonical atom helpers", () => {
  const w4 = evaluateW4();
  const fullAppearance = w4.screenMap["reader-full-appearance"](data, {
    readerTheme: "paper",
    readerTypography: data.reader.typography,
  });
  const fullFont = w4.screenMap["reader-full-font"](data, {
    readerTypography: data.reader.typography,
  });
  const fullTheme = w4.screenMap["reader-full-theme"](data, { readerTheme: "paper" });

  assert.equal((fullAppearance.match(/data-reader-appearance-source="ThemeSwatch"/g) || []).length, 8);
  assert.equal((fullAppearance.match(/data-reader-appearance-source="FontCell"/g) || []).length, 9);
  assert.ok((fullFont.match(/data-reader-appearance-source="FontCell"/g) || []).length >= 8);
  assert.equal((fullTheme.match(/data-reader-appearance-source="ThemeSwatch"/g) || []).length, 8);

  const appearanceStart = runtimeSource.indexOf('    if (type === "appearance") {');
  const appearanceEnd = runtimeSource.indexOf('    if (type === "settings") {', appearanceStart);
  const quickAppearance = runtimeSource.slice(appearanceStart, appearanceEnd);
  assert.match(quickAppearance, /w4Api\.components\.themeSwatch/);
  assert.match(quickAppearance, /w4Api\.components\.fontCell/);
  assert.doesNotMatch(quickAppearance, /<button class="\$\{activeTheme/);
  assert.match(runtimeSource, /ReaderW4ThemeFontTypographyRenderers\?\.components\?\.fontCellFamily\?\.\(selected\)/);
  assert.match(runtimeSource, /--reader-font-family:\$\{esc\(readerFontFamilyValue\(data, safe\.fontFamily\)\)\}/);

  for (const theme of w4.data.defaultThemes()) {
    assert.ok(theme.paperStart && theme.paperEnd, `${theme.value} must provide complete runtime paper colors`);
  }

  const d3Start = d3Source.indexOf("  function d3AppearancePanel(");
  const d3End = d3Source.indexOf("  // 设置面板", d3Start);
  const d3Appearance = d3Source.slice(d3Start, d3End);
  assert.match(d3Appearance, /w4\.components\.themeSwatch/);
  assert.match(d3Appearance, /w4\.components\.fontCell/);
  assert.doesNotMatch(d3Appearance, /var themes = \[/);
});

test("canonical atom geometry and effects match Reader 2", () => {
  assert.match(appearanceCss, /button\.fd-reader-theme-swatch[\s\S]*width:\s*62\.5px;[\s\S]*height:\s*24px;/);
  assert.match(appearanceCss, /\.fd-reader-theme-swatch \.fd-reader-theme-swatch-fill[\s\S]*inset:\s*2px auto auto 8\.25px;[\s\S]*width:\s*46px;[\s\S]*height:\s*18px;[\s\S]*border:\s*0\.5px solid rgba\(180, 166, 151, 0\.3\);[\s\S]*border-radius:\s*6px;/);
  assert.match(appearanceCss, /button\.fd-reader-theme-swatch\.is-active \.fd-reader-theme-swatch-fill[\s\S]*border:\s*2px solid #2f6373;/);
  assert.match(appearanceCss, /data-reader-theme-texture="paper"[\s\S]*repeating-linear-gradient\(90deg/);
  assert.match(appearanceCss, /button\.fd-reader-font-cell[\s\S]*width:\s*62\.5px;[\s\S]*height:\s*27px;/);
  assert.match(appearanceCss, /\.fd-reader-font-cell \.fd-reader-font-cell-pill[\s\S]*inset:\s*3px auto auto 4px;[\s\S]*width:\s*55px;[\s\S]*height:\s*22px;[\s\S]*border-radius:\s*11px;/);
  assert.match(appearanceCss, /button\.fd-reader-font-cell\.is-active \.fd-reader-font-cell-pill[\s\S]*box-shadow:\s*inset 0 2px 4px rgba\(0, 0, 0, 0\.15\);/);
  assert.match(appearanceCss, /fd-reader-appearance-typography-library[\s\S]*height:\s*406px;[\s\S]*flex-direction:\s*column;[\s\S]*gap:\s*8px;/);
  assert.match(appearanceCss, /fd-reader-appearance-select-grid[\s\S]*grid-template-columns:\s*312px;[\s\S]*grid-template-rows:\s*repeat\(4, 44px\);/);
  assert.match(appearanceCss, /fd-reader-appearance-step-list[\s\S]*height:\s*144px;/);
});

test("full appearance follows the current Figma library order", () => {
  const bodyStart = w4Source.indexOf("  function readerFullAppearanceBody(");
  const bodyEnd = w4Source.indexOf("  // ====================================================================\n  // 8.", bodyStart);
  const body = w4Source.slice(bodyStart, bodyEnd);
  const themeIndex = body.indexOf("fd-reader-appearance-theme-library");
  const fontIndex = body.indexOf("fd-reader-appearance-font-library");
  const typographyIndex = body.indexOf("fd-reader-appearance-typography-library");

  assert.ok(themeIndex >= 0, "theme library must render");
  assert.ok(fontIndex > themeIndex, "font library must follow theme library");
  assert.ok(typographyIndex > fontIndex, "typography library must follow font library");
});
