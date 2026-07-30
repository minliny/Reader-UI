import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  buildFigmaSourcePlan,
  exactFigmaBindingRecords,
  parseFigmaSourcePlanArgs,
  renderFigmaSourcePlan,
} from './figma-source-plan-lib.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const generator = path.join(repoRoot, 'tools/design/generate-figma-source-plan.mjs');
const currentRegistryPath = path.join(repoRoot, 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json');

function makeRegistry(count = 30) {
  const records = [];
  for (let index = count - 1; index >= 0; index -= 1) {
    const base = index * 10 + 1;
    records.push({
      id: `record.${String(index).padStart(2, '0')}`,
      classification: 'exact-figma-binding',
      surfaceType: 'route-family',
      routeIds: index === 0 ? ['route.z', 'route.a'] : [`route.${index}`],
      deliveryStatus: `status-${index}`,
      figma: {
        fileKey: 'fixture-file',
        revision: 'fixture-revision',
        canonicalMasterId: `${base}:1`,
        nodeId: `${base}:1`,
        viewportNodes: {
          phone: `${base}:2`,
          tablet: `${base}:3`,
        },
      },
      harmony: {
        status: 'fixture',
        targets: index === 0 ? ['target/z', 'target/a'] : [`target/${index}`],
      },
    });
  }
  records.splice(3, 0, {
    id: 'ignored.non-exact',
    classification: 'retired',
    routeIds: [],
    figma: { fileKey: null, revision: null, nodeId: null },
  });
  return {
    kind: 'FIGMA_VISUAL_ADMISSION_REGISTRY',
    authority: { fileKey: 'fixture-file' },
    records,
  };
}

function sourceFor(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('current registry builds all 30 exact bindings without admitting non-exact records', () => {
  const registrySource = readFileSync(currentRegistryPath, 'utf8');
  const registry = JSON.parse(registrySource);
  assert.equal(exactFigmaBindingRecords(registry).length, 30);
  assert.ok(exactFigmaBindingRecords(registry).every((record) => record.classification === 'exact-figma-binding'));
  assert.equal(buildFigmaSourcePlan({ registrySource }).recordCount, 30);
});

test('build creates a deterministic, sorted plan and hashes the exact registry bytes', () => {
  const registrySource = sourceFor(makeRegistry());
  const first = buildFigmaSourcePlan({ registrySource });
  const second = buildFigmaSourcePlan({ registrySource });

  assert.deepEqual(first, second);
  assert.equal(first.recordCount, 30);
  assert.equal(first.records[0].recordId, 'record.00');
  assert.deepEqual(first.records[0].routeIds, ['route.a', 'route.z']);
  assert.deepEqual(first.records[0].harmonyTargets, ['target/a', 'target/z']);
  assert.equal(
    first.registrySha256,
    crypto.createHash('sha256').update(registrySource).digest('hex'),
  );
  assert.deepEqual(first.nodeIds.roots, [...new Set(first.nodeIds.roots)].sort());
  assert.deepEqual(first.nodeIds.viewports, [...new Set(first.nodeIds.viewports)].sort());
  assert.deepEqual(first.nodeIds.variants, []);
  assert.deepEqual(first.nodeIds.all, [...new Set([
    ...first.nodeIds.roots,
    ...first.nodeIds.viewports,
    ...first.nodeIds.variants,
  ])].sort());
  assert.ok(!renderFigmaSourcePlan(first).includes('ignored.non-exact'));
});

test('null identity on a page family fails closed instead of borrowing its root', () => {
  for (const mutation of [
    (registry) => { registry.records[0].figma.revision = null; },
    (registry) => { registry.records[0].figma.viewportNodes.phone = null; },
    (registry) => { registry.records[0].figma.canonicalMasterId = null; },
  ]) {
    const registry = makeRegistry();
    mutation(registry);
    assert.throws(
      () => buildFigmaSourcePlan({ registrySource: sourceFor(registry) }),
      /must not be null/,
    );
  }
});

test('cross-file and cross-revision bindings fail closed', () => {
  const crossFile = makeRegistry();
  crossFile.records[0].figma.fileKey = 'other-file';
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(crossFile) }),
    /differs from registry authority|cross-file/,
  );

  const crossRevision = makeRegistry();
  crossRevision.records[0].figma.revision = 'other-revision';
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(crossRevision) }),
    /cross-revision/,
  );
});

test('duplicate record and array conflicts fail closed', () => {
  const duplicateRecord = makeRegistry();
  duplicateRecord.records[1].id = duplicateRecord.records[0].id;
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(duplicateRecord) }),
    /duplicate exact binding recordId/,
  );

  const duplicateRoute = makeRegistry();
  duplicateRoute.records[0].routeIds = ['same-route', 'same-route'];
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(duplicateRoute) }),
    /routeIds contains a duplicate entry/,
  );

});

test('route-variant families require an exact Phone/Tablet node pair for every route', () => {
  const registry = makeRegistry();
  const record = registry.records[0];
  record.surfaceType = 'route-variant-family';
  record.routeIds = ['variant-b', 'variant-a'];
  record.figma.viewportNodes = { phone: null, tablet: null };
  record.figma.variantNodes = {
    'variant-a': { phone: '901:1', tablet: '901:2' },
    'variant-b': { phone: '902:1', tablet: '902:2' },
  };
  const plan = buildFigmaSourcePlan({ registrySource: sourceFor(registry) });
  const projected = plan.records.find((candidate) => candidate.recordId === record.id);
  assert.deepEqual(projected.viewportNodeIds, { phone: null, tablet: null });
  assert.deepEqual(projected.variantNodeIds, {
    'variant-a': { phone: '901:1', tablet: '901:2' },
    'variant-b': { phone: '902:1', tablet: '902:2' },
  });
  assert.ok(plan.nodeIds.variants.includes('901:1'));
  assert.ok(plan.nodeIds.variants.includes('902:2'));

  delete record.figma.variantNodes['variant-a'].tablet;
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(registry) }),
    /\.variantNodes\.variant-a\.tablet must be a non-empty string/,
  );
});

test('overlay-state families require one explicit variant node per route and allow null viewports', () => {
  const registry = makeRegistry();
  const record = registry.records[0];
  record.surfaceType = 'overlay-state-family';
  record.routeIds = ['restore-running', 'restore-confirm'];
  record.figma.viewportNodes = { phone: null, tablet: null };
  record.figma.variantNodes = {
    'restore-confirm': '903:1',
    'restore-running': '903:2',
  };
  const plan = buildFigmaSourcePlan({ registrySource: sourceFor(registry) });
  const projected = plan.records.find((candidate) => candidate.recordId === record.id);
  assert.deepEqual(projected.viewportNodeIds, { phone: null, tablet: null });
  assert.deepEqual(projected.variantNodeIds, {
    'restore-confirm': '903:1',
    'restore-running': '903:2',
  });

  record.figma.variantNodes['unexpected-route'] = '903:3';
  assert.throws(
    () => buildFigmaSourcePlan({ registrySource: sourceFor(registry) }),
    /variantNodes keys must exactly match routeIds/,
  );
});

test('CLI defaults to check and compares exact rendered bytes without running write mode', () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'figma-source-plan-'));
  try {
    const registryPath = path.join(temporary, 'registry.json');
    const outputPath = path.join(temporary, 'FIGMA_SOURCE_PLAN.json');
    const registrySource = sourceFor(makeRegistry());
    const rendered = renderFigmaSourcePlan(buildFigmaSourcePlan({ registrySource }));
    writeFileSync(registryPath, registrySource, 'utf8');
    writeFileSync(outputPath, rendered, 'utf8');

    const result = spawnSync(process.execPath, [
      generator,
      '--registry', registryPath,
      '--output', outputPath,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Figma source plan current: 30 exact bindings/);

    writeFileSync(outputPath, `${rendered} `, 'utf8');
    const stale = spawnSync(process.execPath, [
      generator,
      '--check',
      '--registry', registryPath,
      '--output', outputPath,
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /stale .*FIGMA_SOURCE_PLAN\.json; run with --write/);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});

test('CLI mode parser makes check the default and keeps write explicit', () => {
  assert.deepEqual(parseFigmaSourcePlanArgs([]), {
    mode: 'check',
    registryPath: null,
    outputPath: null,
    help: false,
  });
  assert.equal(parseFigmaSourcePlanArgs(['--write']).mode, 'write');
  assert.throws(
    () => parseFigmaSourcePlanArgs(['--check', '--write']),
    /mutually exclusive/,
  );
});
