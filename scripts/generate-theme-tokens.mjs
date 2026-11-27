#!/usr/bin/env node
// Deterministic cross-platform theme token generator for Reader-UI.
//
// Reads theme/registry.json (the frozen canonical palette) and emits semantic
// color tokens for Android (Kotlin) and iOS (Swift). The generated headers
// embed the SHA-256 of registry.json, so --check fails both on artifact drift
// and on a registry change that was not regenerated.
//
// Usage:
//   node scripts/generate-theme-tokens.mjs --write
//   node scripts/generate-theme-tokens.mjs --check
//   node scripts/generate-theme-tokens.mjs --write --root <Reader-UI root>
//
// Exit codes: 0 = success, 1 = drift/fingerprint mismatch, 2 = usage error.
//
// Scope note: registry.json is a color registry. It contains no radius or
// typography data, so none is invented here; see the C4 report for the gap.

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = resolve(SCRIPT_DIR, '..');
const GENERATOR_ID = 'scripts/generate-theme-tokens.mjs';

const INPUT = 'theme/registry.json';
const OUTPUTS = {
  kotlin: 'theme/generated/android/ReaderThemeTokens.kt',
  swift: 'theme/generated/ios/ReaderThemeTokens.swift',
};

const KOTLIN_KEYWORDS = new Set([
  'as', 'break', 'class', 'continue', 'do', 'else', 'false', 'for', 'fun', 'if',
  'in', 'interface', 'is', 'null', 'object', 'package', 'return', 'super', 'this',
  'throw', 'true', 'try', 'typealias', 'typeof', 'val', 'var', 'when', 'while',
  'by', 'catch', 'constructor', 'delegate', 'dynamic', 'field', 'file', 'finally',
  'get', 'import', 'init', 'param', 'property', 'receiver', 'set', 'setparam',
  'where', 'abstract', 'annotation', 'companion', 'const', 'crossinline', 'data',
  'enum', 'expect', 'external', 'final', 'infix', 'inline', 'inner', 'internal',
  'lateinit', 'noinline', 'open', 'operator', 'out', 'override', 'private',
  'protected', 'public', 'reified', 'sealed', 'suspend', 'tailrec', 'vararg',
  'value',
]);

const SWIFT_KEYWORDS = new Set([
  'associatedtype', 'class', 'deinit', 'enum', 'extension', 'fileprivate', 'func',
  'import', 'init', 'inout', 'internal', 'let', 'open', 'operator', 'private',
  'protocol', 'public', 'rethrows', 'static', 'struct', 'subscript', 'typealias',
  'var', 'break', 'case', 'continue', 'default', 'defer', 'do', 'else',
  'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return', 'switch',
  'where', 'while', 'as', 'any', 'catch', 'false', 'is', 'nil', 'super', 'self',
  'Self', 'throw', 'throws', 'true', 'try', 'await', 'async', 'actor', 'some',
  'macro', 'borrowing', 'consuming', 'each',
]);

function fail(message, code = 2) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv) {
  let mode = null;
  let root = DEFAULT_ROOT;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--write' || arg === '--check') {
      if (mode) fail('Use exactly one of --write or --check.');
      mode = arg.slice(2);
    } else if (arg === '--root') {
      const value = argv[++index];
      if (!value) fail('--root requires a path.');
      root = resolve(value);
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(
        'Usage: node scripts/generate-theme-tokens.mjs --write|--check [--root <Reader-UI root>]\n',
      );
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }
  if (!mode) fail('Choose --write or --check.');
  return { mode, root };
}

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function splitWords(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

function uniqueName(candidate, taken) {
  if (!taken.has(candidate)) {
    taken.add(candidate);
    return candidate;
  }
  let index = 2;
  while (taken.has(`${candidate}_${index}`)) index += 1;
  const name = `${candidate}_${index}`;
  taken.add(name);
  return name;
}

function upperSnake(value) {
  const words = splitWords(value).map((word) => word.toUpperCase());
  let name = words.join('_');
  if (!name) name = 'VALUE';
  if (/^[0-9]/.test(name)) name = `_${name}`;
  return name;
}

function lowerCamel(value) {
  const words = splitWords(value);
  if (words.length === 0) return 'value';
  const [first, ...rest] = words;
  let name = first.toLowerCase()
    + rest.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
  if (/^[0-9]/.test(name)) name = `v${name}`;
  return name;
}

// ARGB packed exactly like the Harmony/TypeScript adapter: alpha rounds to a
// byte, then R/G/B. Every channel is validated before packing.
function argb(color, context) {
  if (!color || !['r', 'g', 'b'].every(
    (channel) => Number.isInteger(color[channel]) && color[channel] >= 0 && color[channel] <= 255,
  )) {
    fail(`${context}: r/g/b must be integers in 0..255`);
  }
  if (!Number.isFinite(color.a) || color.a < 0 || color.a > 1) {
    fail(`${context}: a must be a finite number in 0..1`);
  }
  const alpha = Math.round(color.a * 255);
  return ((alpha << 24) | (color.r << 16) | (color.g << 8) | color.b) >>> 0;
}

function hex32(value) {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

function loadRegistry(root) {
  const raw = readFileSync(join(root, INPUT), 'utf8');
  const registry = JSON.parse(raw);
  if (registry.schemaVersion !== 1) fail(`Unsupported registry schemaVersion: ${registry.schemaVersion}`);
  const appRoles = Object.keys(registry.appRoles || {}).sort();
  if (appRoles.length === 0) fail('registry.appRoles is empty');

  const roles = appRoles.map((role) => {
    const entry = registry.appRoles[role];
    return {
      role,
      day: argb(entry.day, `${role}.day`),
      night: argb(entry.night, `${role}.night`),
    };
  });

  const paletteIds = Object.keys(registry.reader || {})
    .sort((left, right) => registry.reader[left].order - registry.reader[right].order);
  if (paletteIds.length === 0) fail('registry.reader is empty');
  const palettes = paletteIds.map((id) => {
    const entry = registry.reader[id];
    const roleKeys = Object.keys(entry.roles || {});
    if (roleKeys.length === 0) fail(`reader palette ${id} has no roles`);
    return {
      id,
      scheme: entry.scheme,
      order: entry.order,
      displayName: entry.displayName,
      roles: Object.fromEntries(roleKeys.map((key) => [key, argb(entry.roles[key], `${id}.${key}`)])),
      paperTexture: Boolean(entry.effects?.paperTexture),
      sourcePaperLighting: Boolean(entry.effects?.sourcePaperLighting),
    };
  });
  const paletteRoleNames = Object.keys(palettes[0].roles);
  for (const palette of palettes) {
    const names = Object.keys(palette.roles);
    if (names.length !== paletteRoleNames.length
      || names.some((name, index) => name !== paletteRoleNames[index])) {
      fail(`reader palette ${palette.id} does not share the canonical role set`);
    }
  }

  return {
    hash: sha256(raw),
    schemaVersion: registry.schemaVersion,
    roles,
    palettes,
    paletteRoleNames,
  };
}

function renderKotlin(data) {
  const out = [];
  out.push('// GENERATED FILE — DO NOT EDIT.');
  out.push(`// Generator: ${GENERATOR_ID}`);
  out.push(`// Input: ${INPUT}  ${data.hash}`);
  out.push('// Values are packed ARGB (0xAARRGGBB). Compose consumes them as');
  out.push('// Color(0xAARRGGBB.toInt()); no Compose dependency is required here.');
  out.push('package com.reader.core.theme');
  out.push('');

  const taken = new Set();
  const entries = data.roles.map((role) => ({
    ...role,
    identifier: uniqueName(upperSnake(role.role), taken),
  }));

  out.push(`/** Every app color role in theme/registry.json (${entries.length}), day + night. */`);
  out.push('public enum class ReaderAppRole(');
  out.push('    public val wireRole: String,');
  out.push('    public val day: Long,');
  out.push('    public val night: Long,');
  out.push(') {');
  for (const entry of entries) {
    out.push(`    ${entry.identifier}("${entry.role}", ${hex32(entry.day)}L, ${hex32(entry.night)}L),`);
  }
  out.push('    ;');
  out.push('    public companion object {');
  out.push('        private val BY_WIRE: Map<String, ReaderAppRole> =');
  out.push('            values().associateBy(ReaderAppRole::wireRole)');
  out.push('        public fun fromWire(value: String): ReaderAppRole? = BY_WIRE[value]');
  out.push('    }');
  out.push('}');
  out.push('');

  out.push('/** Resolves one role for the requested scheme. */');
  out.push('public object ReaderThemeTokens {');
  out.push('    public fun argb(role: ReaderAppRole, night: Boolean): Long = if (night) role.night else role.day');
  out.push('}');
  out.push('');

  out.push('/** Reader paper palettes in registry order. */');
  out.push('public data class ReaderPaperPalette(');
  out.push('    public val id: String,');
  out.push('    public val scheme: String,');
  out.push('    public val order: Int,');
  out.push('    public val displayName: String,');
  for (const name of data.paletteRoleNames) {
    out.push(`    public val ${name}: Long,`);
  }
  out.push('    public val paperTexture: Boolean,');
  out.push('    public val sourcePaperLighting: Boolean,');
  out.push(')');
  out.push('');
  out.push(`public object ReaderPaperThemes {`);
  out.push(`    public val all: List<ReaderPaperPalette> = listOf(`);
  for (const palette of data.palettes) {
    out.push('        ReaderPaperPalette(');
    out.push(`            id = "${palette.id}",`);
    out.push(`            scheme = "${palette.scheme}",`);
    out.push(`            order = ${palette.order},`);
    out.push(`            displayName = "${palette.displayName}",`);
    for (const name of data.paletteRoleNames) {
      out.push(`            ${name} = ${hex32(palette.roles[name])}L,`);
    }
    out.push(`            paperTexture = ${palette.paperTexture},`);
    out.push(`            sourcePaperLighting = ${palette.sourcePaperLighting},`);
    out.push('        ),');
  }
  out.push('    )');
  out.push('    public fun byId(id: String): ReaderPaperPalette? = all.firstOrNull { it.id == id }');
  out.push('}');
  return `${out.join('\n')}\n`;
}

function renderSwift(data) {
  const out = [];
  out.push('// GENERATED FILE — DO NOT EDIT.');
  out.push(`// Generator: ${GENERATOR_ID}`);
  out.push(`// Input: ${INPUT}  ${data.hash}`);
  out.push('// Values are packed ARGB (0xAARRGGBB); SwiftUI converts with Color(.sRGB,');
  out.push('// red:green:blue:opacity:) helpers below, so no UIKit/SwiftUI import is needed.');
  out.push('import Foundation');
  out.push('');

  const taken = new Set();
  const entries = data.roles.map((role) => {
    let identifier = uniqueName(lowerCamel(role.role), taken);
    if (SWIFT_KEYWORDS.has(identifier)) identifier = `\`${identifier}\``;
    return { ...role, identifier };
  });

  out.push(`/// Every app color role in theme/registry.json (${entries.length}), day + night.`);
  out.push('public enum ReaderAppRole: String, CaseIterable, Sendable {');
  for (const entry of entries) {
    out.push(`    case ${entry.identifier} = "${entry.role}"`);
  }
  out.push('}');
  out.push('');

  out.push('/// ARGB channels split for SwiftUI/UIKit construction.');
  out.push('public struct ReaderThemeColor: Sendable, Equatable {');
  out.push('    public let argb: UInt32');
  out.push('    public init(argb: UInt32) { self.argb = argb }');
  out.push('    public var alpha: Double { Double((argb >> 24) & 0xFF) / 255.0 }');
  out.push('    public var red: Double { Double((argb >> 16) & 0xFF) / 255.0 }');
  out.push('    public var green: Double { Double((argb >> 8) & 0xFF) / 255.0 }');
  out.push('    public var blue: Double { Double(argb & 0xFF) / 255.0 }');
  out.push('}');
  out.push('');

  out.push('/// Resolves one role for the requested scheme.');
  out.push('public enum ReaderThemeTokens {');
  out.push('    public static func argb(_ role: ReaderAppRole, night: Bool) -> UInt32 {');
  out.push('        night ? role.night : role.day');
  out.push('    }');
  out.push('    public static func color(_ role: ReaderAppRole, night: Bool) -> ReaderThemeColor {');
  out.push('        ReaderThemeColor(argb: argb(role, night: night))');
  out.push('    }');
  out.push('}');
  out.push('');

  out.push('public extension ReaderAppRole {');
  out.push('    /// Day-scheme packed ARGB.');
  out.push('    var day: UInt32 {');
  out.push('        switch self {');
  for (const entry of entries) {
    out.push(`        case .${entry.identifier.replace(/`/g, '')}: return ${hex32(entry.day)}`);
  }
  out.push('        }');
  out.push('    }');
  out.push('');
  out.push('    /// Night-scheme packed ARGB.');
  out.push('    var night: UInt32 {');
  out.push('        switch self {');
  for (const entry of entries) {
    out.push(`        case .${entry.identifier.replace(/`/g, '')}: return ${hex32(entry.night)}`);
  }
  out.push('        }');
  out.push('    }');
  out.push('}');
  out.push('');

  out.push('/// Reader paper palettes in registry order.');
  out.push('public struct ReaderPaperPalette: Sendable, Equatable {');
  out.push('    public let id: String');
  out.push('    public let scheme: String');
  out.push('    public let order: Int');
  out.push('    public let displayName: String');
  for (const name of data.paletteRoleNames) {
    out.push(`    public let ${name}: UInt32`);
  }
  out.push('    public let paperTexture: Bool');
  out.push('    public let sourcePaperLighting: Bool');
  out.push('}');
  out.push('');
  out.push('public enum ReaderPaperThemes {');
  out.push('    public static let all: [ReaderPaperPalette] = [');
  for (const palette of data.palettes) {
    out.push('        ReaderPaperPalette(');
    out.push(`            id: "${palette.id}",`);
    out.push(`            scheme: "${palette.scheme}",`);
    out.push(`            order: ${palette.order},`);
    out.push(`            displayName: "${palette.displayName}",`);
    for (const name of data.paletteRoleNames) {
      out.push(`            ${name}: ${hex32(palette.roles[name])},`);
    }
    out.push(`            paperTexture: ${palette.paperTexture},`);
    out.push(`            sourcePaperLighting: ${palette.sourcePaperLighting}`);
    out.push('        ),');
  }
  out.push('    ]');
  out.push('    public static func byId(_ id: String) -> ReaderPaperPalette? {');
  out.push('        all.first { $0.id == id }');
  out.push('    }');
  out.push('}');
  return `${out.join('\n')}\n`;
}

function main() {
  const { mode, root } = parseArgs(process.argv.slice(2));
  const data = loadRegistry(root);
  const rendered = new Map([
    [OUTPUTS.kotlin, renderKotlin(data)],
    [OUTPUTS.swift, renderSwift(data)],
  ]);
  const summary = {
    schemaVersion: data.schemaVersion,
    appRoles: data.roles.length,
    paperPalettes: data.palettes.length,
    paperRoles: data.paletteRoleNames.length,
    registrySha256: data.hash,
  };

  if (mode === 'write') {
    for (const [relative, contents] of rendered) {
      const target = join(root, relative);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents, 'utf8');
      process.stdout.write(`wrote ${relative} (${contents.length} bytes)\n`);
    }
    process.stdout.write(`summary ${JSON.stringify(summary)}\n`);
    return;
  }

  let failed = false;
  for (const [relative, contents] of rendered) {
    const target = join(root, relative);
    if (!existsSync(target)) {
      process.stderr.write(`${relative}: missing; run --write\n`);
      failed = true;
      continue;
    }
    const existing = readFileSync(target, 'utf8');
    if (!existing.includes(`${INPUT}  ${data.hash}`)) {
      process.stderr.write(`${relative}: registry fingerprint mismatch (expected ${data.hash})\n`);
      failed = true;
    }
    if (existing !== contents) {
      const expected = contents.split('\n');
      const actual = existing.split('\n');
      let line = 0;
      while (line < expected.length && line < actual.length && expected[line] === actual[line]) {
        line += 1;
      }
      process.stderr.write(
        `${relative}: generated output drifted at line ${line + 1}\n`
        + `  expected: ${expected[line] ?? '<eof>'}\n`
        + `  actual:   ${actual[line] ?? '<eof>'}\n`,
      );
      failed = true;
    }
  }
  if (failed) process.exit(1);
  process.stdout.write(`check ok ${JSON.stringify(summary)}\n`);
}

main();
