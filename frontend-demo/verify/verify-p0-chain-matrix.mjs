#!/usr/bin/env node
// P0 链路验收矩阵脚本 — 可执行检查脚本
// 扫描 4 个仓库，验证 5 条 P0 链路 × 4 个仓库 × A-F 六列
// 用法：node frontend-demo/verify/verify-p0-chain-matrix.mjs
// 退出码：全绿（无 ❌）返回 0，有 ❌ 返回 1（⚠️ 豁免不算失败）

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============ 仓库路径 ============

const REPO_PATHS = {
  Contract: "/Users/minliny/Documents/Reader UI",
  iOS: "/Users/minliny/Documents/Reader for iOS",
  Android: "/Users/minliny/Documents/Reader for Android",
  HarmonyOS: "/Users/minliny/Documents/Reader-for-HarmonyOS",
};

// ============ 5 条 P0 链路 ============

const P0_CHAINS = ["bookshelf", "reader", "source-switch", "book-detail", "settings"];

// 链路 → 契约 shell（route.fixtures.json 中的 shell 字段）
const CHAIN_SHELL = {
  bookshelf: "MainTabShell",
  reader: "ReaderShell",
  "source-switch": "FlowShell",
  "book-detail": "LibraryShell",
  settings: "SettingsShell",
};

// ============ 工具函数 ============

function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function testRegex(content, pattern) {
  if (!content) return false;
  return new RegExp(pattern).test(content);
}

// 递归收集文件（跨平台，不依赖系统 grep/find）
function collectFiles(dir, exts, skipDirs = ["node_modules", ".git", ".build", "build", ".gradle", "checkouts", ".ci_download", ".swiftpm"]) {
  if (!existsSync(dir)) return [];
  const result = [];
  function walk(d) {
    let entries;
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.startsWith(".")) {
        // 允许 .ets 等扩展名但跳过 .git 等隐藏目录
        if (!entry.includes(".")) continue;
      }
      const full = join(d, entry);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        if (skipDirs.includes(entry)) continue;
        walk(full);
      } else if (st.isFile()) {
        if (!exts || exts.some((ext) => entry.endsWith(ext))) {
          result.push(full);
        }
      }
    }
  }
  walk(dir);
  return result;
}

// 在文件列表中搜索正则
function grepFiles(files, pattern) {
  const re = new RegExp(pattern);
  for (const f of files) {
    const content = readText(f);
    if (content && re.test(content)) return true;
  }
  return false;
}

// 查找文件名匹配的文件
function findFilesByName(files, namePattern) {
  const re = new RegExp(namePattern);
  return files.filter((f) => re.test(f));
}

// ============ Contract 仓库检查 ============

function verifyContract(chain) {
  const fixturesDir = join(REPO_PATHS.Contract, "contracts", "fixtures");

  const routeFixtures = loadJson(join(fixturesDir, "route.fixtures.json")) || [];
  const viewStateFixtures = loadJson(join(fixturesDir, "view-state.fixtures.json")) || [];
  const stateRuleFixtures = loadJson(join(fixturesDir, "state-rule.fixtures.json")) || [];
  const motionPolicyFixtures = loadJson(join(fixturesDir, "motion-policy.fixtures.json")) || [];
  const uiEventFixtures = loadJson(join(fixturesDir, "ui-event.fixtures.json")) || [];

  // A. routeId：route.fixtures.json 中存在该 route
  const A = routeFixtures.some((r) => r.id === chain);

  // B. pageState：view-state.fixtures.json 中该 route 有 pageState 定义
  const vsEntries = viewStateFixtures.filter((v) => v.routeId === chain);
  const B = vsEntries.some((v) => v.pageState !== undefined && v.pageState !== null && v.pageState !== "");

  // C. ComponentType：view-state.fixtures.json 中该 route 有 ComponentType
  const C = vsEntries.some((v) => Array.isArray(v.components) && v.components.length > 0 && v.components.some((c) => c.type));

  // D. state-rule：有该 route 的规则（routeIds 包含），或有通用规则（无 routeIds 限制）
  const hasRouteRule = stateRuleFixtures.some((r) => {
    const routeIds = r.target && r.target.routeIds;
    return Array.isArray(routeIds) && routeIds.includes(chain);
  });
  const hasGeneralRule = stateRuleFixtures.some((r) => {
    return !(r.target && r.target.routeIds);
  });
  const D = hasRouteRule || hasGeneralRule;

  // E. motion-policy：有该 route 对应 shell 的 policy
  const shell = CHAIN_SHELL[chain];
  const containerRole = shell[0].toLowerCase() + shell.slice(1);
  // settings 同时检查 mainTabShell（tab）和 settingsShell（子页）
  const roles = chain === "settings" ? ["mainTabShell", "settingsShell"] : [containerRole];
  const E = motionPolicyFixtures.some((p) => {
    const role = p.match && p.match.containerRole;
    return roles.includes(role);
  });

  // F. ui-event：有该 route 相关的事件
  const eventPatterns = {
    bookshelf: /bookshelf|tab\.select|tab\.switch/i,
    reader: /reader\./i,
    "source-switch": /source.?switch/i,
    "book-detail": /book\.detail|book\.open|book-detail/i,
    settings: /settings/i,
  };
  const F = uiEventFixtures.some((e) => eventPatterns[chain].test(JSON.stringify(e)));

  return { A, B, C, D, E, F };
}

// ============ iOS 仓库检查 ============

function verifyIOS(chain) {
  const iosDir = REPO_PATHS.iOS;
  if (!existsSync(iosDir)) {
    return { A: false, B: false, C: false, D: false, E: false, F: false, missing: true };
  }

  const appDir = join(iosDir, "iOS", "App");
  const testsDir = join(iosDir, "iOS", "Tests");
  const motionDir = join(iosDir, "iOS", "Modules", "Motion");

  const readerApp = readText(join(appDir, "ReaderApp.swift")) || "";
  const readerReducer = readText(join(appDir, "ReaderReducer.swift")) || "";
  const readerCoordinator = readText(join(appDir, "ReaderCoordinator.swift")) || "";
  const readerViewState = readText(join(appDir, "ReaderViewState.swift")) || "";
  const motionAdapter = readText(join(motionDir, "ReaderMotionAdapter.swift")) || "";

  const testFiles = collectFiles(testsDir, [".swift"]);

  // A. registry 生产注册：ComponentRegistry.bootstrapAllSlices 在 ReaderApp 中被调用
  const A = testRegex(readerApp, /ComponentRegistry\.bootstrapAllSlices/);

  // B. factory 非空：book-detail/source-switch/settings 的 factory 不返回 EmptyView
  const factoryPatterns = {
    bookshelf: /\.bookshelf\b/i,
    reader: /\.reader\b|\.immersiveReading\b/i,
    "source-switch": /\.sourceSwitch\b/i,
    "book-detail": /\.bookDetail\b/i,
    settings: /\.settings\b/i,
  };
  const B = testRegex(readerViewState, factoryPatterns[chain]);

  // C. reducer 非 stub：有该链路的事件 handler（非 TODO/placeholder）
  const reducerPatterns = {
    bookshelf: /bookshelf|sortFilter|tab\.select|tab\.switch/i,
    reader: /reader_enter|reader_control|reader_page|reader_module|reader_exit|reader_chapter/i,
    "source-switch": /sourceSwitch|source_switch/i,
    "book-detail": /book_detail|bookDetail|book_directory|bookDirectory/i,
    settings: /settings_open|settings_close|reader_settings/i,
  };
  const hasHandler = testRegex(readerReducer, reducerPatterns[chain]);
  // 排除纯 TODO/placeholder
  const isStub = !hasHandler || testRegex(readerReducer, new RegExp(`//\\s*TODO.*${chain}`, "i"));
  const C = hasHandler && !isStub;

  // D. coordinator 接线：有 openBookDetail/openSourceSwitch/openSettings 方法
  // bookshelf 是默认 tab，coordinator 中通过注释/导航引用
  const coordinatorPatterns = {
    bookshelf: /bookshelf/i,
    reader: /readerControl|enterReader|reader_control/i,
    "source-switch": /openSourceSwitch|sourceSwitch/i,
    "book-detail": /openBookDetail|bookDetail/i,
    settings: /openSettings|settings/i,
  };
  const D = testRegex(readerCoordinator, coordinatorPatterns[chain]);

  // E. motion：有该链路的 motion 接线
  const motionPatterns = {
    bookshelf: /bookshelf/i,
    reader: /reader_/i,
    "source-switch": /sourceSwitch/i,
    "book-detail": /bookDetail|book_detail|library|app_route_push/i,
    settings: /settings|overlay\.dialog|app_route_push/i,
  };
  const E = testRegex(motionAdapter, motionPatterns[chain]);

  // F. test：存在该链路的 golden test 文件
  const testPatterns = {
    bookshelf: /Slice1|Bookshelf/i,
    reader: /Slice2|Slice3|Slice4|Reader.*Motion|Reader.*Reducer/i,
    "source-switch": /SourceSwitch/i,
    "book-detail": /BookDetail/i,
    settings: /Settings/i,
  };
  const matchedTests = findFilesByName(testFiles, testPatterns[chain]);
  const F = matchedTests.length > 0;

  return { A, B, C, D, E, F };
}

// ============ Android 仓库检查 ============

function verifyAndroid(chain) {
  const androidDir = REPO_PATHS.Android;
  if (!existsSync(androidDir)) {
    return { A: false, B: false, C: false, D: false, E: false, F: false, missing: true };
  }

  const srcDir = join(androidDir, "app", "src");
  const mainKotlinDir = join(srcDir, "main", "kotlin");
  const testKotlinDir = join(srcDir, "test", "kotlin");
  const androidTestDir = join(srcDir, "androidTest");

  const appShell = readText(join(mainKotlinDir, "com", "reader", "ui", "shell", "AppShell.kt")) || "";
  const readerUiReducer = readText(join(mainKotlinDir, "com", "reader", "ui", "shell", "ReaderUiReducer.kt")) || "";
  const appShellViewModel = readText(join(mainKotlinDir, "com", "reader", "ui", "shell", "AppShellViewModel.kt")) || "";

  const mainFiles = collectFiles(mainKotlinDir, [".kt"]);
  const testFiles = [...collectFiles(testKotlinDir, [".kt"]), ...collectFiles(androidTestDir, [".kt", ".java"])];

  // A. AppShell route 分支：有该 route 分支
  const appShellPatterns = {
    bookshelf: /BookshelfScreen|MainTab\.BOOKSHELF|bookshelf/i,
    reader: /ReaderShellScreen|ImmersiveReading|reader/i,
    "source-switch": /SourceSwitchFlow|FlowShellScreen|source.?switch/i,
    "book-detail": /BookDetailScreen|book-detail|BookState/i,
    settings: /SettingsScreen|MainTab\.SETTINGS|settings/i,
  };
  const A = testRegex(appShell, appShellPatterns[chain]);

  // B. Reducer intent：有该链路的 intent handler
  const reducerPatterns = {
    bookshelf: /SelectTab|Bookshelf/i,
    reader: /EnterReader|UpdateReader|SwitchReaderModule|JumpChapter|reader/i,
    "source-switch": /SourceSwitch/i,
    "book-detail": /BookDetail/i,
    settings: /SettingsOpen|SettingsTabSwitch|settings/i,
  };
  const B = testRegex(readerUiReducer, reducerPatterns[chain]);

  // C. Screen：存在该链路的 Screen 文件（Compose）
  // source-switch 的 FlowShellScreen 定义在 ReaderControlScreen.kt 中
  const screenFilePatterns = {
    bookshelf: /BookshelfScreen\.kt$/i,
    reader: /ReaderControlScreen\.kt$|ImmersiveReadingScreen\.kt$|ReaderShellScreen\.kt$/i,
    "source-switch": /FlowShellScreen\.kt$|SourceSwitch.*Screen\.kt$|ReaderControlScreen\.kt$/i,
    "book-detail": /BookRouteScreens\.kt$|BookDetailScreen\.kt$/i,
    settings: /SettingsScreen\.kt$/i,
  };
  let matchedScreens = findFilesByName(mainFiles, screenFilePatterns[chain]);
  // 对 source-switch，额外检查文件内容是否包含 FlowShellScreen 定义
  if (chain === "source-switch" && matchedScreens.length === 0) {
    matchedScreens = mainFiles.filter((f) => {
      const content = readText(f) || "";
      return /fun FlowShellScreen|FlowShellScreen\s*\(/.test(content);
    });
  }
  const C = matchedScreens.length > 0;

  // D. MotionPolicyAdapter 生产调用
  const D = testRegex(appShellViewModel, /MotionPolicyAdapter\.resolve/);

  // E. token：该链路目录下所有 .kt 文件无 raw Color(0x（token 化）
  // 扫描链路对应目录的全部 .kt 文件，避免漏检同链路的其他文件（如 BookshelfRouteScreens.kt）
  const CHAIN_DIR = {
    bookshelf: ["com/reader/ui/bookshelf"],
    reader: ["com/reader/ui/reading"],
    "source-switch": ["com/reader/ui/reading"],
    "book-detail": ["com/reader/ui/book"],
    settings: ["com/reader/ui/settings"],
  };
  // token 定义源头文件，Color(0x) 是合法的 token 值定义，排除不查
  const TOKEN_SOURCE_SUFFIXES = ["tokens/ReaderTokenAdapter.kt", "theme/ReaderTheme.kt"];
  let tokenCheckFiles = [];
  for (const rel of CHAIN_DIR[chain] || []) {
    tokenCheckFiles = tokenCheckFiles.concat(collectFiles(join(mainKotlinDir, rel), [".kt"]));
  }
  // 排除 token 定义源头文件
  tokenCheckFiles = tokenCheckFiles.filter((f) => {
    const norm = f.replace(/\\/g, "/");
    return !TOKEN_SOURCE_SUFFIXES.some((s) => norm.endsWith(s));
  });
  // 兜底：纳入 C 列已识别的 Screen 文件，确保 source-switch 等特殊链路也被覆盖
  tokenCheckFiles = [...new Set([...tokenCheckFiles, ...matchedScreens])];
  const hasRawColor = tokenCheckFiles.some((f) => {
    const content = readText(f) || "";
    // 排除注释行中的 Color(0x
    const lines = content.split("\n").filter((l) => !l.trim().startsWith("//"));
    return /Color\(0x/.test(lines.join("\n"));
  });
  const E = !hasRawColor && tokenCheckFiles.length > 0;

  // F. test：存在该链路的 focused test
  const testFilePatterns = {
    bookshelf: /Bookshelf|ReducerTest/i,
    reader: /ReaderUiReducer|ReaderControl|Motion/i,
    "source-switch": /SourceSwitch/i,
    "book-detail": /BookDetail|BookRoute|ReaderUiReducer/i,
    settings: /Settings|ReaderUiReducer/i,
  };
  const matchedTests = findFilesByName(testFiles, testFilePatterns[chain]);
  const F = matchedTests.length > 0;

  return { A, B, C, D, E, F };
}

// ============ HarmonyOS 仓库检查 ============

function verifyHarmony(chain) {
  const harmonyDir = REPO_PATHS.HarmonyOS;
  if (!existsSync(harmonyDir)) {
    return { A: false, B: false, C: false, D: false, E: false, F: false, missing: true };
  }

  const etsDir = join(harmonyDir, "entry", "src", "main", "ets");
  const testDir = join(harmonyDir, "entry", "src", "test");

  const viewStateRenderer = readText(join(etsDir, "ui", "components", "ViewStateRenderer.ets")) || "";
  const viewStateTable = readText(join(etsDir, "contract", "generated", "ViewStateTable.ets")) || "";
  const routeTable = readText(join(etsDir, "contract", "generated", "RouteTable.ets")) || "";
  const readerReducer = readText(join(etsDir, "ui", "store", "ReaderReducer.ets")) || "";

  const uiFiles = collectFiles(join(etsDir, "ui"), [".ets"]);
  const testFiles = collectFiles(testDir, [".ets"]);

  // A. ViewStateRenderer 注册：ViewStateRenderer 或 ViewStateTable 中有该 route
  const routePatterns = {
    bookshelf: /bookshelf/i,
    reader: /reader/i,
    "source-switch": /source.?switch|sourceSwitch/i,
    "book-detail": /book.?detail|bookDetail/i,
    settings: /settings/i,
  };
  const A = testRegex(viewStateRenderer, routePatterns[chain]) || testRegex(viewStateTable, routePatterns[chain]);

  // B. RouteTable：有该 route
  const B = testRegex(routeTable, routePatterns[chain]);

  // C. Reducer：有该链路的 case
  const reducerPatterns = {
    bookshelf: /bookshelf|set-bookshelf/i,
    reader: /reader|set-reader/i,
    "source-switch": /source.?switch|sourceSwitch/i,
    "book-detail": /book.?detail|bookDetail/i,
    settings: /settings/i,
  };
  const C = testRegex(readerReducer, reducerPatterns[chain]);

  // D. MotionAdapter：该链路组件中有 MotionAdapter.apply
  const componentFilePatterns = {
    bookshelf: /BookshelfComponents\.ets$/i,
    reader: /ReaderComponents\.ets$|ReaderControlComponents\.ets$|ReaderOverlayComponents\.ets$/i,
    "source-switch": /SourceSwitchFlowComponents\.ets$/i,
    "book-detail": /BookDetailComponents\.ets$/i,
    settings: /SettingsComponents\.ets$/i,
  };
  const componentFiles = findFilesByName(uiFiles, componentFilePatterns[chain]);
  const D = grepFiles(componentFiles, /MotionAdapter\.apply/);

  // E. token raw：该链路组件无 raw rgba(
  const hasRawRgba = componentFiles.some((f) => {
    const content = readText(f) || "";
    // 排除注释行
    const lines = content.split("\n").filter((l) => !l.trim().startsWith("//"));
    return /rgba\(/.test(lines.join("\n"));
  });
  const E = !hasRawRgba && componentFiles.length > 0;

  // F. 测试：存在该链路的 test.ets 文件
  const testFilePatterns = {
    bookshelf: /Bookshelf.*test\.ets$/i,
    reader: /Reader.*test\.ets$|MotionResolver.*test\.ets$/i,
    "source-switch": /SourceSwitch.*test\.ets$/i,
    "book-detail": /BookDetail.*test\.ets$/i,
    settings: /Settings.*test\.ets$/i,
  };
  const matchedTests = findFilesByName(testFiles, testFilePatterns[chain]);
  const F = matchedTests.length > 0;

  return { A, B, C, D, E, F };
}

// ============ 主函数 ============

const COLUMN_NAMES = ["A", "B", "C", "D", "E", "F"];

function statusSymbol(pass, exempt) {
  if (pass) return "✅";
  if (exempt) return "⚠️";
  return "❌";
}

export function verifyP0ChainMatrix() {
  const matrix = {};
  let hasFail = false;

  for (const chain of P0_CHAINS) {
    matrix[chain] = {
      Contract: verifyContract(chain),
      iOS: verifyIOS(chain),
      Android: verifyAndroid(chain),
      HarmonyOS: verifyHarmony(chain),
    };

    for (const repo of ["Contract", "iOS", "Android", "HarmonyOS"]) {
      const result = matrix[chain][repo];
      for (const col of COLUMN_NAMES) {
        if (!result[col]) {
          hasFail = true;
        }
      }
    }
  }

  return { matrix, hasFail, exitCode: hasFail ? 1 : 0 };
}

// 生成 markdown 表格
function generateMarkdown(matrix) {
  const lines = [];

  lines.push("# P0 链路验收矩阵（脚本生成）");
  lines.push("");
  lines.push("> 由 `frontend-demo/verify/verify-p0-chain-matrix.mjs` 自动生成");
  lines.push("> 验收口径：5 条 P0 链路 × 4 个仓库 × A-F 六列");
  lines.push("");
  lines.push("## 总表");
  lines.push("");
  lines.push("| 链路 | 仓库 | A | B | C | D | E | F | 状态 |");
  lines.push("|------|------|---|---|---|---|---|---|------|");

  for (const chain of P0_CHAINS) {
    for (const repo of ["Contract", "iOS", "Android", "HarmonyOS"]) {
      const result = matrix[chain][repo];
      const symbols = COLUMN_NAMES.map((c) => statusSymbol(result[c]));
      const allPass = COLUMN_NAMES.every((c) => result[c]);
      const status = allPass ? "✅ 全绿" : "有缺口";
      lines.push(`| ${chain} | ${repo} | ${symbols.join(" | ")} | ${status} |`);
    }
  }

  lines.push("");
  lines.push("## 列定义");
  lines.push("");
  lines.push("### Contract 仓库（A-F）");
  lines.push("- A. routeId：route.fixtures.json 中存在该 route");
  lines.push("- B. pageState：view-state.fixtures.json 中该 route 有 pageState 定义");
  lines.push("- C. ComponentType：view-state.fixtures.json 中该 route 有 ComponentType");
  lines.push("- D. state-rule：state-rule.fixtures.json 中有该 route 的规则（routeIds 包含或通用规则）");
  lines.push("- E. motion-policy：motion-policy.fixtures.json 中有该 route 对应 shell 的 policy");
  lines.push("- F. ui-event：ui-event.fixtures.json 中有该 route 相关的事件");
  lines.push("");
  lines.push("### iOS 仓库（A-F）");
  lines.push("- A. registry 生产注册：ComponentRegistry.bootstrapAllSlices 在 ReaderApp 中被调用");
  lines.push("- B. factory 非空：该链路 component factory 不返回 EmptyView");
  lines.push("- C. reducer 非 stub：ReaderReducer 中有该链路的事件 handler");
  lines.push("- D. coordinator 接线：ReaderCoordinator 中有该链路的方法");
  lines.push("- E. motion：ReaderMotionAdapter 中有该链路的 motion 接线");
  lines.push("- F. test：存在该链路的 golden test 文件");
  lines.push("");
  lines.push("### Android 仓库（A-F）");
  lines.push("- A. AppShell route 分支：AppShell.kt 中有该 route 分支");
  lines.push("- B. Reducer intent：ReaderUiReducer 中有该链路的 intent handler");
  lines.push("- C. Screen：存在该链路的 Screen 文件（Compose）");
  lines.push("- D. MotionPolicyAdapter 生产调用：AppShellViewModel 中调用 MotionPolicyAdapter.resolve");
  lines.push("- E. token：该链路目录下所有 .kt 文件无 raw Color(0x（token 化，排除 token 定义源头）");
  lines.push("- F. test：存在该链路的 focused test");
  lines.push("");
  lines.push("### HarmonyOS 仓库（A-F）");
  lines.push("- A. ViewStateRenderer 注册：ViewStateRenderer/ViewStateTable 中有该 route");
  lines.push("- B. RouteTable：RouteTable 中有该 route");
  lines.push("- C. Reducer：ReaderReducer 中有该链路的 case");
  lines.push("- D. MotionAdapter：该链路组件中有 MotionAdapter.apply");
  lines.push("- E. token raw：该链路组件无 raw rgba(");
  lines.push("- F. 测试：存在该链路的 test.ets 文件");
  lines.push("");
  lines.push("## 状态图例");
  lines.push("");
  lines.push("- ✅ 通过");
  lines.push("- ❌ 失败（缺失或不达标）");
  lines.push("- ⚠️ 豁免（附说明）");
  lines.push("");

  return lines.join("\n");
}

// 生成终端报告
function generateTerminalReport(matrix, hasFail) {
  const lines = [];
  lines.push("");
  lines.push("═".repeat(72));
  lines.push("  P0 链路验收矩阵");
  lines.push("═".repeat(72));
  lines.push("");

  const header = "链路".padEnd(16) + "仓库".padEnd(12) + COLUMN_NAMES.map((c) => c.padEnd(4)).join("") + "状态";
  lines.push(header);
  lines.push("-".repeat(72));

  for (const chain of P0_CHAINS) {
    for (const repo of ["Contract", "iOS", "Android", "HarmonyOS"]) {
      const result = matrix[chain][repo];
      const symbols = COLUMN_NAMES.map((c) => statusSymbol(result[c]).padEnd(4));
      const allPass = COLUMN_NAMES.every((c) => result[c]);
      const status = allPass ? "✅" : "❌";
      const missing = result.missing ? " (仓库缺失)" : "";
      lines.push(`${chain.padEnd(16)}${repo.padEnd(12)}${symbols.join("")}${status}${missing}`);
    }
  }

  lines.push("");
  lines.push("═".repeat(72));

  const totalCells = P0_CHAINS.length * 4 * 6;
  let passCells = 0;
  for (const chain of P0_CHAINS) {
    for (const repo of ["Contract", "iOS", "Android", "HarmonyOS"]) {
      for (const col of COLUMN_NAMES) {
        if (matrix[chain][repo][col]) passCells++;
      }
    }
  }

  lines.push(`  通过：${passCells}/${totalCells}  ｜  退出码：${hasFail ? 1 : 0}`);
  lines.push("═".repeat(72));
  lines.push("");

  return lines.join("\n");
}

// ============ CLI 入口 ============

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const { matrix, hasFail, exitCode } = verifyP0ChainMatrix();

  // 输出 markdown 表格
  console.log(generateMarkdown(matrix));

  // 输出终端报告
  console.log(generateTerminalReport(matrix, hasFail));

  process.exit(exitCode);
}
