#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const generator = 'scripts/generate-m1-ui.mjs';
const metricInput = 'theme/design-metrics.json';
const iconInput = 'theme/icon-registry.json';
const themeInput = 'theme/registry.json';
const runtimeDirectory = 'reader_ebook_runtime';
const runtimeFiles = ['shell.html', 'reader-ebook-dom.js', 'reader-ebook-runtime.js'];
const fixtureFiles = ['fixtures/m1-window.epub'];
const namePattern = /^[a-z][A-Za-z0-9]*$/;
const text = path => readFileSync(resolve(root, path), 'utf8');
const digest = path => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');

function load(path) {
  const value = JSON.parse(text(path));
  if (value.schemaVersion !== 1) throw Error(`${path}: unsupported schema version`);
  return value;
}

function renderMetrics(isSwift, input) {
  const { metrics, typography } = input;
  const rows = [
    '// GENERATED FILE — DO NOT EDIT.',
    `// Generator: ${generator}`,
    `// Input: ${metricInput}  ${digest(metricInput)}`,
    isSwift ? '' : 'package com.reader.core.theme',
    '',
    ...(isSwift
      ? [
        'public enum ReaderTypographyFamily: Sendable { case ui, literary }',
        'public struct ReaderTypographyMetric: Sendable {',
        '    public let fontSize: Double',
        '    public let lineHeight: Double',
        '    public let weight: Int',
        '    public let family: ReaderTypographyFamily',
        '}',
        '',
        'public enum ReaderDesignMetrics {',
      ]
      : [
        'public enum class ReaderTypographyFamily { UI, LITERARY }',
        'public data class ReaderTypographyMetric(',
        '    public val fontSize: Double,',
        '    public val lineHeight: Double,',
        '    public val weight: Int,',
        '    public val family: ReaderTypographyFamily,',
        ')',
        '',
        'public object ReaderDesignMetrics {',
      ]),
  ];
  const literal = value => Number.isInteger(value) ? `${value}.0` : String(value);
  for (const [name, value] of Object.entries(metrics)) {
    if (!namePattern.test(name) || !Number.isFinite(value) || value < 0) throw Error(`Invalid metric: ${name}`);
    const isInt = Number.isInteger(value);
    const type = isInt ? 'Int' : 'Double';
    const declaration = isSwift ? 'public static let' : 'public const val';
    rows.push(`    ${declaration} ${name}: ${type} = ${value}`);
  }
  for (const [name, metric] of Object.entries(typography)) {
    const { fontSize, lineHeight, weight, family } = metric;
    if (name in metrics || !namePattern.test(name) || !Number.isFinite(fontSize) || fontSize <= 0
      || !Number.isFinite(lineHeight) || lineHeight < fontSize || ![400, 500, 700].includes(weight)
      || !['ui', 'literary'].includes(family)) {
      throw Error(`Invalid typography: ${name}`);
    }
    const size = literal(fontSize);
    const line = literal(lineHeight);
    rows.push(isSwift
      ? `    public static let ${name} = ReaderTypographyMetric(fontSize: ${size}, lineHeight: ${line}, weight: ${weight}, family: .${family})`
      : `    public val ${name} = ReaderTypographyMetric(${size}, ${line}, ${weight}, ReaderTypographyFamily.${family.toUpperCase()})`);
  }
  rows.push('}', '');
  return rows.join('\n').replaceAll('\n\n\n', '\n\n');
}

function validatePress(input, theme) {
  const press = theme.appRoles['app.interaction.press'];
  const ink = theme.appRoles.TOK_INK;
  for (const [scheme, opacity] of [['day', input.metrics.pressDayOpacity], ['night', input.metrics.pressNightOpacity]]) {
    if (press[scheme].a !== opacity || !['r', 'g', 'b'].every(channel => press[scheme][channel] === ink[scheme][channel])) {
      throw Error(`Press opacity and neutral ink must match the theme registry: ${scheme}`);
    }
  }
}

function icons(input, theme) {
  return Object.entries(input.icons).map(([semantic, entry]) => {
    if (!namePattern.test(semantic)) throw Error(`Invalid semantic icon: ${semantic}`);
    if (entry.asset) {
      if (Object.keys(entry).length !== 2 || !/^[a-z0-9_]+\.svg$/.test(entry.asset)
        || !Object.hasOwn(theme.appRoles, entry.tintRole)
        || !text(`theme/icons/${entry.asset}`).includes('currentColor')) throw Error(`Invalid icon asset: ${semantic}`);
    } else if (Object.keys(entry).length !== 2 || !/^[A-Za-z.]+$/.test(entry.android)
      || !/^[a-z.]+$/.test(entry.ios)) {
      throw Error(`Invalid platform icon: ${semantic}`);
    }
    return [semantic, entry];
  });
}

function renderIcons(isSwift, entries) {
  const name = 'ReaderIconRegistry';
  const type = 'ReaderIconMapping';
  const nullable = value => value ? JSON.stringify(value) : isSwift ? 'nil' : 'null';
  const rows = [
    '// GENERATED FILE — DO NOT EDIT.',
    `// Generator: ${generator}`,
    `// Input: ${iconInput}  ${digest(iconInput)}`,
    isSwift ? '' : 'package com.reader.core.theme',
    '',
    ...(isSwift
      ? [
        `public struct ${type}: Sendable {`,
        '    public let systemName: String?',
        '    public let assetName: String?',
        '    public let tintRole: String?',
        '}',
        '',
        `public enum ${name} {`,
      ]
      : [
        `public data class ${type}(`,
        '    public val systemName: String?,',
        '    public val assetName: String?,',
        '    public val tintRole: String? = null,',
        ')',
        '',
        `public object ${name} {`,
      ]),
  ];
  for (const [semantic, entry] of entries) {
    rows.push(isSwift
      ? `    public static let ${semantic} = ${type}(systemName: ${nullable(entry.ios)}, assetName: ${nullable(entry.asset)}, tintRole: ${nullable(entry.tintRole)})`
      : `    public val ${semantic} = ${type}(${nullable(entry.android)}, ${nullable(entry.asset)}, ${nullable(entry.tintRole)})`);
  }
  rows.push('}', '');
  return rows.join('\n').replaceAll('\n\n\n', '\n\n');
}

function fileHashes(paths) {
  return Object.fromEntries(paths.map(path => [path, digest(path)]));
}

const mode = process.argv.slice(2);
if (mode.length !== 1 || !['--check', '--write'].includes(mode[0])) {
  console.error(`Usage: node ${generator} --write|--check`);
  process.exit(2);
}

const theme = load(themeInput);
const metrics = load(metricInput);
const iconRegistry = load(iconInput);
if (!/^[0-9a-f]{40}$/.test(metrics.references.harmonyCommit)
  || iconRegistry.harmonyCommit !== metrics.references.harmonyCommit) throw Error('Mismatched HarmonyOS design pins');
validatePress(metrics, theme);
const allIcons = icons(iconRegistry, theme);
const outputs = new Map();
for (const [platform, extension] of [['android', 'kt'], ['ios', 'swift']]) {
  const swift = platform === 'ios';
  const target = `theme/generated/${platform}`;
  outputs.set(`${target}/ReaderDesignMetrics.${extension}`, renderMetrics(swift, metrics));
  outputs.set(`${target}/ReaderIconRegistry.${extension}`, renderIcons(swift, allIcons));
}

const iconFiles = allIcons.flatMap(([, entry]) => entry.asset ? [`theme/icons/${entry.asset}`] : []);
const manifest = {
  schemaVersion: 1,
  harmonyCommit: metrics.references.harmonyCommit,
  designInputs: fileHashes([themeInput, metricInput, iconInput, ...iconFiles]),
  toolInputs: fileHashes([generator, 'scripts/generate-theme-tokens.mjs', `${runtimeDirectory}/fixtures/generate-m1-window.py`]),
  generatedDesign: {
    ...fileHashes(['theme/generated/android/ReaderThemeTokens.kt', 'theme/generated/ios/ReaderThemeTokens.swift']),
    ...Object.fromEntries([...outputs].map(([path, value]) => [
      path, createHash('sha256').update(value, 'utf8').digest('hex'),
    ])),
  },
  productionResources: fileHashes(runtimeFiles.map(path => `${runtimeDirectory}/${path}`)),
  testResources: fileHashes(fixtureFiles.map(path => `${runtimeDirectory}/${path}`)),
};
outputs.set(`${runtimeDirectory}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');

let matches = true;
for (const [path, expected] of outputs) {
  if (mode[0] === '--write') {
    writeFileSync(resolve(root, path), expected, 'utf8');
  } else {
    let actual = null;
    try {
      actual = text(path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (actual !== expected) {
      console.error(`Generated file drift: ${path}`);
      matches = false;
    }
  }
}
if (!matches) process.exitCode = 1;
