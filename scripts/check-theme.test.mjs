import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { READER_THEME_DEFINITIONS, readerAppColor } from '../theme/ReaderThemeRegistry.ts';

const raw = readFileSync(new URL('../theme/registry.json', import.meta.url), 'utf8');
const registry = JSON.parse(raw);
const argb = ({ r, g, b, a }) => {
  assert.ok([r, g, b].every(v => Number.isInteger(v) && v >= 0 && v <= 255));
  assert.ok(Number.isFinite(a) && a >= 0 && a <= 1);
  return '#' + [Math.round(a * 255), r, g, b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
};
test('generated registry is bound to its actual JSON input', () => {
  const generated = readFileSync(new URL('../theme/ReaderThemeRegistry.ts', import.meta.url), 'utf8');
  assert.ok(generated.includes(`// SHA256 ${createHash('sha256').update(raw).digest('hex')}`));
  assert.equal(registry.schemaVersion, 1);
});
test('every app role has the correct day and night value', () => {
  assert.ok(Object.keys(registry.appRoles).length > 0);
  for (const [role, schemes] of Object.entries(registry.appRoles)) {
    for (const scheme of ['day', 'night']) assert.equal(readerAppColor(role, scheme), argb(schemes[scheme]));
  }
});
test('reader palettes preserve all roles, effects, identity and order', () => {
  const expected = Object.entries(registry.reader).sort((a, b) => a[1].order - b[1].order).map(([id, value]) => ({
    id, scheme: value.scheme, order: value.order, displayName: value.displayName,
    ...Object.fromEntries(Object.entries(value.roles).map(([key, color]) => [key, argb(color)])),
    ...value.effects,
  }));
  assert.deepEqual(READER_THEME_DEFINITIONS, expected);
});
