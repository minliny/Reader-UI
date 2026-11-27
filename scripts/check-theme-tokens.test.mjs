#!/usr/bin/env node
// Self-test for scripts/generate-theme-tokens.mjs.
//
// Proves, without network access:
//   1. --write is deterministic and --check passes on committed artifacts.
//   2. Every generated color equals theme/registry.json channel by channel
//      (alpha rounded to a byte, then R/G/B) in BOTH outputs.
//   3. All reader paper palettes and their roles are preserved.
//   4. A registry edit that is not regenerated fails --check (SHA-256 binding),
//      and artifact drift fails too.
//
// Usage: node scripts/check-theme-tokens.test.mjs
// Exit codes: 0 = all checks pass, 1 = a check failed.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import {
  cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const GENERATOR = join(ROOT, 'scripts/generate-theme-tokens.mjs');
const INPUT = 'theme/registry.json';
const OUTPUTS = [
  'theme/generated/android/ReaderThemeTokens.kt',
  'theme/generated/ios/ReaderThemeTokens.swift',
];

const failures = [];
function check(name, condition, detail = '') {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function run(args) {
  const result = spawnSync(process.execPath, [GENERATOR, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

function argb(color) {
  const alpha = Math.round(color.a * 255);
  return '0x' + (((alpha << 24) | (color.r << 16) | (color.g << 8) | color.b) >>> 0)
    .toString(16).toUpperCase().padStart(8, '0');
}

const raw = readFileSync(join(ROOT, INPUT), 'utf8');
const registry = JSON.parse(raw);
const hash = sha256(raw);

// ---------------------------------------------------------------------------
// 1. Determinism and --check
// ---------------------------------------------------------------------------

const before = OUTPUTS.map((relative) => sha256(readFileSync(join(ROOT, relative))));
const write = run(['--write']);
check('--write exits 0', write.status === 0, write.stderr);
const after = OUTPUTS.map((relative) => sha256(readFileSync(join(ROOT, relative))));
OUTPUTS.forEach((relative, index) => {
  check(`repeat --write is byte-identical (${relative})`, before[index] === after[index]);
});
const checked = run(['--check']);
check('--check exits 0 on committed artifacts', checked.status === 0, checked.stderr);

const kotlin = readFileSync(join(ROOT, OUTPUTS[0]), 'utf8');
const swift = readFileSync(join(ROOT, OUTPUTS[1]), 'utf8');
check('Kotlin header binds registry.json SHA-256', kotlin.includes(`${INPUT}  ${hash}`));
check('Swift header binds registry.json SHA-256', swift.includes(`${INPUT}  ${hash}`));

// ---------------------------------------------------------------------------
// 2. Per-role, per-channel equality in both outputs
// ---------------------------------------------------------------------------

const kotlinRoles = new Map();
for (const match of kotlin.matchAll(
  /^ {4}([A-Za-z0-9_]+)\("([^"]+)", (0x[0-9A-F]{8})L, (0x[0-9A-F]{8})L\),$/gm,
)) {
  kotlinRoles.set(match[2], { day: match[3], night: match[4] });
}

const swiftWire = new Map();
for (const match of swift.matchAll(/^ {4}case (`?[A-Za-z0-9_]+`?) = "([^"]+)"$/gm)) {
  swiftWire.set(match[1].replace(/`/g, ''), match[2]);
}

function parseSwiftScheme(source, scheme) {
  const marker = `    var ${scheme}: UInt32 {\n        switch self {\n`;
  const start = source.indexOf(marker);
  if (start < 0) return new Map();
  const end = source.indexOf('        }', start);
  const block = source.slice(start + marker.length, end);
  const values = new Map();
  for (const match of block.matchAll(/^ {8}case \.([A-Za-z0-9_]+): return (0x[0-9A-F]{8})$/gm)) {
    const wire = swiftWire.get(match[1]);
    if (wire) values.set(wire, match[2]);
  }
  return values;
}

const swiftDay = parseSwiftScheme(swift, 'day');
const swiftNight = parseSwiftScheme(swift, 'night');

const roles = Object.keys(registry.appRoles).sort();
check(`Kotlin covers every app role (${roles.length})`, kotlinRoles.size === roles.length,
  `got ${kotlinRoles.size}`);
check(`Swift covers every app role (${roles.length})`, swiftDay.size === roles.length,
  `got ${swiftDay.size}`);

let colorMismatches = 0;
for (const role of roles) {
  const entry = registry.appRoles[role];
  const expectedDay = argb(entry.day);
  const expectedNight = argb(entry.night);
  const kotlinEntry = kotlinRoles.get(role);
  if (!kotlinEntry || kotlinEntry.day !== expectedDay || kotlinEntry.night !== expectedNight) {
    if (colorMismatches < 5) console.log(`  mismatch ${role}: registry ${expectedDay}/${expectedNight} `
      + `kotlin ${kotlinEntry?.day}/${kotlinEntry?.night}`);
    colorMismatches += 1;
  }
  if (swiftDay.get(role) !== expectedDay || swiftNight.get(role) !== expectedNight) {
    if (colorMismatches < 5) console.log(`  mismatch ${role}: registry ${expectedDay}/${expectedNight} `
      + `swift ${swiftDay.get(role)}/${swiftNight.get(role)}`);
    colorMismatches += 1;
  }
}
check('every role matches the registry channel by channel in both outputs', colorMismatches === 0,
  `${colorMismatches} mismatches`);

// ---------------------------------------------------------------------------
// 3. Reader paper palettes
// ---------------------------------------------------------------------------

const paletteIds = Object.keys(registry.reader);
check(`paper palette count preserved (${paletteIds.length})`,
  (kotlin.match(/^ {8}ReaderPaperPalette\($/gm) || []).length === paletteIds.length
  && (swift.match(/^ {8}ReaderPaperPalette\($/gm) || []).length === paletteIds.length);

let paletteMismatches = 0;
for (const id of paletteIds) {
  const palette = registry.reader[id];
  const kotlinBlock = new RegExp(`id = "${id}",[\\s\\S]*?sourcePaperLighting = (true|false),`);
  const match = kotlin.match(kotlinBlock);
  if (!match) {
    paletteMismatches += 1;
    continue;
  }
  for (const [role, color] of Object.entries(palette.roles)) {
    if (!match[0].includes(`${role} = ${argb(color)}L`)) {
      if (paletteMismatches < 5) console.log(`  palette ${id}.${role} missing or wrong in Kotlin`);
      paletteMismatches += 1;
    }
  }
  if (!swift.includes(`id: "${id}",`)) {
    paletteMismatches += 1;
    continue;
  }
  const swiftBlock = swift.match(new RegExp(`id: "${id}",[\\s\\S]*?sourcePaperLighting: (?:true|false)`));
  for (const [role, color] of Object.entries(palette.roles)) {
    if (!swiftBlock || !swiftBlock[0].includes(`${role}: ${argb(color)}`)) {
      if (paletteMismatches < 5) console.log(`  palette ${id}.${role} missing or wrong in Swift`);
      paletteMismatches += 1;
    }
  }
}
check('every paper palette role matches the registry in both outputs', paletteMismatches === 0,
  `${paletteMismatches} mismatches`);

// ---------------------------------------------------------------------------
// 4. Fingerprint binding and drift detection in an isolated copy
// ---------------------------------------------------------------------------

const tempRoot = mkdtempSync(join(tmpdir(), 'reader-theme-tokens-'));
try {
  for (const relative of [INPUT, ...OUTPUTS]) {
    const target = join(tempRoot, relative);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(ROOT, relative), target);
  }
  const isolated = spawnSync(process.execPath, [GENERATOR, '--check', '--root', tempRoot],
    { encoding: 'utf8' });
  check('--check passes in an isolated copy', isolated.status === 0, isolated.stderr);

  const artifact = join(tempRoot, OUTPUTS[0]);
  writeFileSync(artifact, `${readFileSync(artifact, 'utf8')}// drift\n`);
  const drift = spawnSync(process.execPath, [GENERATOR, '--check', '--root', tempRoot],
    { encoding: 'utf8' });
  check('artifact drift fails --check', drift.status === 1);
  check('artifact drift is reported', drift.stderr.includes('drifted at line'), drift.stderr.slice(0, 160));
  cpSync(join(ROOT, OUTPUTS[0]), artifact);

  const tampered = JSON.parse(readFileSync(join(tempRoot, INPUT), 'utf8'));
  const firstRole = Object.keys(tampered.appRoles)[0];
  tampered.appRoles[firstRole].day.r = (tampered.appRoles[firstRole].day.r + 1) % 256;
  writeFileSync(join(tempRoot, INPUT), `${JSON.stringify(tampered, null, 2)}\n`);
  const stale = spawnSync(process.execPath, [GENERATOR, '--check', '--root', tempRoot],
    { encoding: 'utf8' });
  check('stale registry fails --check', stale.status === 1);
  check('stale registry reports a fingerprint mismatch',
    stale.stderr.includes('fingerprint mismatch'), stale.stderr.slice(0, 160));
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(`summary appRoles=${roles.length} paperPalettes=${paletteIds.length} `
  + `paperRoles=${Object.keys(registry.reader[paletteIds[0]]?.roles || {}).length}`);
if (failures.length > 0) {
  console.error(`FAILED ${failures.length} check(s): ${failures.join('; ')}`);
  process.exit(1);
}
console.log('theme token generator self-test passed');
