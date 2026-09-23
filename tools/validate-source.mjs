import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const contracts = [
  ['core-command', 'commandCount'],
  ['host-request', 'hostRequestCount'],
  ['ui-event', 'eventCount'],
];

for (const [name, countKey] of contracts) {
  const schema = readJson(`../contracts/${name}.schema.json`);
  const values = schema.properties?.type?.enum;
  assert.equal(schema['x-reader-ui-contract']?.version, '3.3.0', `${name}: contract version`);
  assert.ok(Array.isArray(values) && values.every((value) => typeof value === 'string' && value.length > 0),
    `${name}: nonempty type enum`);
  assert.equal(new Set(values).size, values.length, `${name}: duplicate type`);
  assert.equal(values.length, schema['x-reader-ui-contract'][countKey], `${name}: declared count`);
  console.log(`${name}: ${values.length} unique types`);
}

const theme = readJson('../theme/registry.json');
assert.equal(theme.schemaVersion, 1, 'theme schema version');
assert.ok(Object.keys(theme.appRoles ?? {}).length > 0, 'App color roles');
assert.ok(theme.reader?.day && theme.reader?.night, 'default reader palettes');
for (const [role, schemes] of Object.entries(theme.appRoles)) {
  for (const scheme of ['day', 'night']) {
    const color = schemes[scheme];
    assert.ok(color && [color.r, color.g, color.b].every((value) => Number.isInteger(value) && value >= 0 && value <= 255) &&
      Number.isFinite(color.a) && color.a >= 0 && color.a <= 1, `${role}: ${scheme} RGBA`);
  }
}
console.log(`theme: ${Object.keys(theme.appRoles).length} complete App roles`);
