import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// This is a finite, reviewed application-source update. It deliberately refuses
// arbitrary JSX changes and never rewrites the shared mobile runtime lock.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const design = resolve(root, 'design/manga-directory');
const manifest = JSON.parse(readFileSync(resolve(design, 'quick-reference-sync.json'), 'utf8'));
assert.ok(manifest.schemaVersion === 1 || manifest.schemaVersion === 2, 'finite Quick sync manifest version');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const args = process.argv.slice(2);
const demoIndex = args.indexOf('--demo');
assert.ok(demoIndex >= 0 && args[demoIndex + 1], 'use --demo <recovered demo path> [--check]');
assert.ok(args.every((value, index) => value === '--demo' || value === '--check' || index === demoIndex + 1), 'unsupported argument');
const demo = resolve(args[demoIndex + 1]);

const canonical = readFileSync(resolve(root, manifest.canonicalReference), 'utf8');
assert.equal(digest(canonical), manifest.canonicalAfterSha256, 'reviewed canonical Quick reference identity');
let priorCanonical = canonical;
for (const { before, after } of [...(manifest.canonicalReplacements ?? manifest.replacements)].reverse()) {
  assert.equal(priorCanonical.split(after).length - 1, 1, 'canonical Quick replacement appears exactly once');
  priorCanonical = priorCanonical.replace(after, before);
}
assert.equal(digest(priorCanonical), manifest.canonicalBeforeSha256, 'only reviewed Quick reference spans changed');

for (const [file, expected] of Object.entries(manifest.guardedUiFiles)) {
  assert.equal(digest(readFileSync(resolve(design, file))), expected, `unchanged UI visual definition: ${file}`);
}
for (const [file, expected] of Object.entries(manifest.guardedDemoFiles)) {
  assert.equal(digest(readFileSync(resolve(demo, file))), expected, `unchanged demo dependency: ${file}`);
}
const lockBytes = readFileSync(resolve(demo, 'mobile-runtime.lock.json'));
assert.equal(digest(lockBytes), manifest.protectedRuntimeLockSha256, 'original runtime lock remains unchanged');
const lock = JSON.parse(lockBytes);
assert.equal(Object.keys(lock).length, manifest.protectedRuntimeCount, 'original 28 protected runtime paths');
for (const [file, expected] of Object.entries(lock)) {
  assert.equal(digest(readFileSync(resolve(demo, file))), expected, `original protected runtime identity: ${file}`);
}

const target = resolve(demo, manifest.demoPrototype);
const previous = readFileSync(target, 'utf8');
const previousDigest = digest(previous);
assert.ok((manifest.reviewedDemoSourceSha256 ?? [manifest.demoBeforeSha256, manifest.demoIntermediateSha256, manifest.demoAfterSha256]).includes(previousDigest), 'unknown demo source change; review before synchronizing');
let next = previous;
const applyReviewedSpans = spans => {
  for (const { before, after } of spans) {
    if (after.length > 0 && next.includes(after)) {
      assert.equal(next.split(after).length - 1, 1, 'explicitly reviewed intermediate Quick source span');
    } else if (next.includes(before)) {
      assert.equal(next.split(before).length - 1, 1, 'reviewed old Quick source span appears exactly once');
      next = next.replace(before, after);
    } else {
      assert.fail('reviewed Quick source span missing; preserve and review before synchronizing');
    }
  }
};
if (manifest.demoStages) {
  const visited = new Set();
  while (digest(next) !== manifest.demoAfterSha256) {
    const identity = digest(next);
    assert.ok(!visited.has(identity), 'finite source update must not loop');
    visited.add(identity);
    const stage = manifest.demoStages.find(value => value.beforeSha256 === identity);
    assert.ok(stage, 'no reviewed transition for this source identity');
    applyReviewedSpans(stage.spans);
    assert.equal(digest(next), stage.afterSha256, 'exact reviewed source transition output');
  }
} else if (previousDigest !== manifest.demoAfterSha256) {
  applyReviewedSpans(manifest.demoReplacements ?? manifest.replacements);
}
assert.equal(digest(next), manifest.demoAfterSha256, 'only the finite reviewed Quick semantics and adaptation spans changed');
if (args.includes('--check')) {
  assert.equal(previousDigest, manifest.demoAfterSha256, 'Quick demo is stale; run the finite sync without --check');
} else if (next !== previous) {
  writeFileSync(target, next);
}
console.log(JSON.stringify({ status: 'pass', mode: args.includes('--check') ? 'check' : 'sync',
  changed: !args.includes('--check') && next !== previous, prototypeSha256: digest(next),
  protectedRuntime: Object.keys(lock).length, visualDefinitionChanged: false }));
