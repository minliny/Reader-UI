#!/usr/bin/env node
// Builds a complete, explicitly historical node catalog for the reading chain.
// It never promotes F2 bindings to current F0 evidence: each output item keeps
// the original named revision only as provenance and sets currentRevision=null.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const outPath = path.join(repoRoot, 'docs/design/handoffs/reading-chain/F0_HISTORICAL_NODE_CATALOG.json');
const sourcePaths = {
  bookshelf: path.join(repoRoot, 'docs/design/handoffs/bookshelf/FIGMA_F0_CROSSWALK.json'),
  bookDetail: path.join(repoRoot, 'docs/design/handoffs/book-detail/FIGMA_F0_CROSSWALK.json'),
  readerRuntime: path.join(repoRoot, 'docs/design/handoffs/reader-runtime/FIGMA_F0_CROSSWALK.json'),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function familyCanonicalMasterId(family, source) {
  if (family === 'bookshelf' || family === 'bookDetail') {
    return (source.historicalCanonicalMasters || []).find((master) => master.role === 'page-set')?.nodeId || null;
  }
  return null;
}

function standardBinding(family, source, binding, index) {
  const historicalRevision = binding.revision || source.historicalRevision || source.revision || null;
  return {
    id: `${family}:${String(index + 1).padStart(4, '0')}`,
    family,
    sourcePath: relative(sourcePaths[family]),
    historicalRevision,
    historicalRevisionTitle: source.historicalRevisionTitle || source.revisionTitle || null,
    currentRevision: null,
    currentBindingStatus: 'historical-only-not-promoted',
    figma: {
      fileKey: binding.fileKey || source.fileKey,
      pageId: binding.pageId || null,
      nodeId: binding.nodeId || null,
      contextNodeId: binding.contextNodeId || null,
      responsivePeerNodeId: binding.responsivePeerNodeId || null,
      canonicalMasterId: binding.canonicalMasterId || familyCanonicalMasterId(family, source),
    },
    local: {
      controlKey: binding.controlKey || null,
      controlId: binding.controlId || null,
      uiEvent: binding.uiEvent || null,
      route: binding.localRoute || null,
      canonicalVisualRoute: binding.canonicalVisualRoute || null,
      settingsKey: binding.settingsKey || null,
      bindingKind: binding.bindingKind || null,
    },
  };
}

const bookshelf = readJson(sourcePaths.bookshelf);
const bookDetail = readJson(sourcePaths.bookDetail);
const readerRuntime = readJson(sourcePaths.readerRuntime);

const catalog = {
  schemaVersion: '1.0.0',
  kind: 'FIGMA_READING_CHAIN_HISTORICAL_NODE_CATALOG',
  status: 'HISTORICAL_PROVENANCE_ONLY',
  generatedAt: 'deterministic-from-working-tree',
  rule: 'This catalog preserves exact historical node evidence for reconciliation. It does not constitute a current Figma crosswalk, does not authorize a visual implementation, and may not supply a current revision.',
  currentReadRequirement: {
    fileKey: 'klhs2jMM4MncaJFqZMfqEK',
    currentRevision: null,
    promotionCondition: 'A live Figma read must match file, page, canonical master, variant and exact node before a catalog item can be copied into F0_FIGMA_FIRST_CROSSWALK.json with a current revision.',
  },
  sources: [
    {
      family: 'bookshelf',
      path: relative(sourcePaths.bookshelf),
      historicalRevision: bookshelf.historicalRevision,
      historicalRevisionTitle: bookshelf.historicalRevisionTitle,
      currentRevision: bookshelf.currentRevision,
      currentRevisionStatus: bookshelf.currentRevisionStatus,
      canonicalMasters: bookshelf.historicalCanonicalMasters,
    },
    {
      family: 'bookDetail',
      path: relative(sourcePaths.bookDetail),
      historicalRevision: bookDetail.historicalRevision,
      historicalRevisionTitle: bookDetail.historicalRevisionTitle,
      currentRevision: bookDetail.currentRevision,
      currentRevisionStatus: bookDetail.currentRevisionStatus,
      canonicalMasters: bookDetail.historicalCanonicalMasters,
    },
    {
      family: 'readerRuntime',
      path: relative(sourcePaths.readerRuntime),
      historicalRevision: readerRuntime.revision,
      historicalRevisionTitle: readerRuntime.revisionTitle,
      currentRevision: null,
      currentRevisionStatus: 'historical-named-revision-not-current-read',
      canonicalMasters: readerRuntime.canonicalMasters,
      routeRoots: readerRuntime.routeRoots,
    },
  ],
  bindings: [
    ...(bookshelf.historicalBindings || []).map((binding, index) => standardBinding('bookshelf', bookshelf, binding, index)),
    ...(bookDetail.historicalBindings || []).map((binding, index) => standardBinding('bookDetail', bookDetail, binding, index)),
    ...(readerRuntime.bindings || []).map((binding, index) => standardBinding('readerRuntime', readerRuntime, binding, index)),
  ],
};

catalog.summary = {
  totalBindings: catalog.bindings.length,
  byFamily: catalog.bindings.reduce((result, binding) => {
    result[binding.family] = (result[binding.family] || 0) + 1;
    return result;
  }, {}),
  currentPromotedBindings: 0,
};

const rendered = `${JSON.stringify(catalog, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outPath)) {
    console.error(`missing ${relative(outPath)}; run without --check`);
    process.exitCode = 1;
  } else if (fs.readFileSync(outPath, 'utf8') !== rendered) {
    console.error(`stale ${relative(outPath)}; run without --check`);
    process.exitCode = 1;
  } else {
    console.log(`historical node catalog current: ${catalog.summary.totalBindings} bindings`);
  }
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered);
  console.log(`wrote ${relative(outPath)}: ${catalog.summary.totalBindings} bindings`);
}
