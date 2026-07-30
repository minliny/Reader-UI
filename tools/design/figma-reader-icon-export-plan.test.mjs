import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  PROHIBITED_READER_ICON_EXPORT_NODE_IDS,
  READER_FIGMA_FILE_KEY,
  READER_FIGMA_REVISION,
  buildReaderIconExportPlan,
  serializeReaderIconExportPlan,
  validateReaderIconExportPlan,
} from './figma-reader-icon-export-plan-lib.mjs';

const cli = fileURLToPath(new URL('./figma-reader-icon-export-plan.mjs', import.meta.url));

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('plan is deterministic, revision-pinned, and covers the audited Reader icon denominator', () => {
  const first = buildReaderIconExportPlan();
  const second = buildReaderIconExportPlan();
  assert.equal(serializeReaderIconExportPlan(first), serializeReaderIconExportPlan(second));
  assert.equal(first.fileKey, READER_FIGMA_FILE_KEY);
  assert.equal(first.revision, READER_FIGMA_REVISION);
  assert.equal(first.bindings.length, 21);
  assert.equal(first.bindings.flatMap((binding) => binding.exports).length, 25);
  assert.equal(first.batches.length, 4);
  assert.deepEqual(validateReaderIconExportPlan(first), {
    semanticCount: 21,
    contextNodeCount: 34,
    exportCount: 25,
    batchCount: 4,
    revision: READER_FIGMA_REVISION,
  });
});

test('plan encodes corrected leaf contexts instead of the old chapter and ModuleNav parents', () => {
  const plan = buildReaderIconExportPlan();
  const bySemantic = new Map(plan.bindings.map((binding) => [binding.semantic, binding]));
  assert.deepEqual(
    bySemantic.get('chapter-prev').contexts.map((item) => item.nodeId),
    ['1023:18444', '1023:18452'],
  );
  assert.deepEqual(
    bySemantic.get('chapter-next').contexts.map((item) => item.nodeId),
    ['1023:18446', '1023:18454'],
  );
  assert.deepEqual(
    bySemantic.get('directory').exports.map((item) => item.exportNodeId),
    ['1023:17679', '1023:17695'],
  );
  assert.deepEqual(
    bySemantic.get('tts-module').exports.map((item) => item.exportNodeId),
    ['1023:17683', '1023:17699'],
  );
  assert.deepEqual(
    bySemantic.get('appearance').exports.map((item) => item.exportNodeId),
    ['1023:17687', '1023:17703'],
  );
  assert.deepEqual(
    bySemantic.get('settings').exports.map((item) => item.exportNodeId),
    ['1023:17691', '1023:17707'],
  );
  for (const nodeId of ['1023:18451', '1023:18453', '1023:17719', '1023:17724']) {
    assert.equal(
      plan.batches.flatMap((batch) => batch.jobs).some((job) => job.exportNodeId === nodeId),
      false,
      `${nodeId} must remain a parent/variant, not an export node`,
    );
  }
});

test('semantic, exact context, export node, and local resource identities are unique', () => {
  const plan = buildReaderIconExportPlan();
  const semantics = plan.bindings.map((binding) => binding.semantic);
  const contexts = plan.bindings.flatMap((binding) => binding.contexts.map((item) => item.nodeId));
  const exports = plan.bindings.flatMap((binding) => binding.exports.map((item) => item.exportNodeId));
  const resources = plan.bindings.flatMap((binding) => binding.exports.map((item) => item.resource));
  assert.equal(new Set(semantics).size, semantics.length);
  assert.equal(new Set(contexts).size, contexts.length);
  assert.equal(new Set(exports).size, exports.length);
  assert.equal(new Set(resources).size, resources.length);
});

test('validation fails closed on duplicate semantics, duplicate contexts, and revision drift', () => {
  const duplicateSemantic = clone(buildReaderIconExportPlan());
  duplicateSemantic.bindings[1].semantic = duplicateSemantic.bindings[0].semantic;
  assert.throws(() => validateReaderIconExportPlan(duplicateSemantic), /duplicate Reader icon semantic/);

  const duplicateContext = clone(buildReaderIconExportPlan());
  duplicateContext.bindings[1].contexts[0].nodeId = duplicateContext.bindings[0].contexts[0].nodeId;
  assert.throws(() => validateReaderIconExportPlan(duplicateContext), /duplicate Reader icon context node/);

  const revisionDrift = clone(buildReaderIconExportPlan());
  revisionDrift.bindings[0].exports[0].revision = 'different-revision';
  assert.throws(() => validateReaderIconExportPlan(revisionDrift), /revision drift/);
});

test('validation rejects page and parent export targets before a use_figma batch can be emitted', () => {
  const plan = clone(buildReaderIconExportPlan());
  const parentNodeId = '1023:18415';
  assert.equal(PROHIBITED_READER_ICON_EXPORT_NODE_IDS.includes(parentNodeId), true);
  plan.bindings[3].exports[0].exportNodeId = parentNodeId;
  plan.batches[0].jobs[3].exportNodeId = parentNodeId;
  assert.throws(() => validateReaderIconExportPlan(plan), /page\/parent export is forbidden/);

  const pagePlan = clone(buildReaderIconExportPlan());
  pagePlan.bindings[0].exports[0].exportNodeId = pagePlan.sourcePageId;
  pagePlan.batches[0].jobs[0].exportNodeId = pagePlan.sourcePageId;
  assert.throws(() => validateReaderIconExportPlan(pagePlan), /page\/parent export is forbidden/);
});

test('every generated use_figma program performs only clean SVG_STRING node exports', () => {
  const plan = buildReaderIconExportPlan();
  for (const batch of plan.batches) {
    assert.match(batch.useFigmaCode, /await figma\.getNodeByIdAsync\(job\.nodeId\)/);
    assert.match(batch.useFigmaCode, /node\.exportAsync\(exportSettings\)/);
    assert.match(batch.useFigmaCode, /"format":"SVG_STRING"/);
    assert.doesNotMatch(batch.useFigmaCode, /screenshot/i);
    assert.doesNotMatch(batch.useFigmaCode, /download_assets/i);
    assert.doesNotMatch(batch.useFigmaCode, /setCurrentPage|remove\(|appendChild|create/);
  }
});

test('CLI emits stable JSON by default and a concise, non-writing check result', () => {
  const output = execFileSync(process.execPath, [cli], { encoding: 'utf8' });
  assert.equal(output, serializeReaderIconExportPlan());
  const parsed = JSON.parse(output);
  assert.equal(parsed.exportContract.writesFigma, false);
  assert.equal(parsed.exportContract.writesLocalFiles, false);

  const checked = execFileSync(process.execPath, [cli, '--check'], { encoding: 'utf8' });
  assert.match(checked, /^FIGMA_READER_ICON_EXPORT_PLAN: PASS \(21 semantics, 25 exports, 4 batches,/);

  const failed = spawnSync(process.execPath, [cli, '--unknown'], { encoding: 'utf8' });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /unknown argument/);
});
