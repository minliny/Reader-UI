#!/usr/bin/env node
// Records actual local reading-chain SVG bytes without calling them Figma
// exports. Figma node provenance lives in the separately reviewed catalog,
// never in a filename-derived heuristic. Every item remains revision=null
// until a live Figma read and an explicit export manifest verify it.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const readerUiRoot = path.resolve(__dirname, '..', '..');
const workspaceRoot = path.resolve(readerUiRoot, '..');
const mediaDir = path.join(workspaceRoot, 'Reader-for-HarmonyOS/entry/src/main/resources/base/media');
const outPath = path.join(readerUiRoot, 'docs/design/handoffs/reading-chain/F0_LOCAL_ASSET_MANIFEST.json');
const provenancePath = path.join(
  readerUiRoot,
  'docs/design/handoffs/reading-chain/F0_LOCAL_ASSET_PROVENANCE.json'
);

if (!fs.existsSync(provenancePath)) {
  throw new Error(`missing ${path.relative(readerUiRoot, provenancePath)}; add explicit Figma provenance before inventorying local SVG bytes`);
}

const provenanceCatalog = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
if (provenanceCatalog.kind !== 'READING_CHAIN_FIGMA_ASSET_PROVENANCE_CATALOG') {
  throw new Error(`unexpected provenance catalog kind: ${provenanceCatalog.kind}`);
}
const provenanceByResource = new Map();
for (const entry of provenanceCatalog.assets || []) {
  if (!entry?.resource || !entry?.figma) {
    throw new Error('asset provenance entry must declare resource and figma metadata');
  }
  if (provenanceByResource.has(entry.resource)) {
    throw new Error(`duplicate asset provenance resource: ${entry.resource}`);
  }
  provenanceByResource.set(entry.resource, entry.figma);
}

function relativeFromWorkspace(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join('/');
}

const files = fs.readdirSync(mediaDir)
  .filter((file) => /^(?:reader_control_|figma_reader_full_|bookshelf_icon_|ui_icon_list_primary\.svg$|book_detail_directory_indent_list\.svg$|bookshelf_section_action_|bookshelf_bookcard_more\.svg$|main_tab_icon_)/.test(file))
  .filter((file) => file.endsWith('.svg'))
  .sort();

const assets = files.map((file) => {
  const fullPath = path.join(mediaDir, file);
  const resource = file.replace(/\.svg$/, '');
  const bytes = fs.readFileSync(fullPath);
  const figma = provenanceByResource.get(resource);
  if (!figma) {
    throw new Error(`local reading-chain SVG lacks explicit Figma provenance: ${resource}`);
  }
  return {
    resource,
    file: relativeFromWorkspace(fullPath),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.length,
    figma,
  };
});

const catalogOnlyResources = [...provenanceByResource.keys()].filter(
  (resource) => !assets.some((asset) => asset.resource === resource)
);
if (catalogOnlyResources.length > 0) {
  throw new Error(`asset provenance has no corresponding local SVG: ${catalogOnlyResources.join(', ')}`);
}

const statusCount = (prefix) => assets.filter((asset) => String(asset.figma.status || '').startsWith(prefix)).length;

const manifest = {
  schemaVersion: '1.0.0',
  kind: 'READING_CHAIN_LOCAL_ASSET_MANIFEST',
  status: 'F0_LOCAL_BYTES_INVENTORIED_NO_CURRENT_FIGMA_EXPORT_ASSERTION',
  fileKey: provenanceCatalog.fileKey,
  iconSource: {
    pageId: '259:4',
    masterNodeId: '270:2',
    name: '02 · Assets · Icons / Tabler masters',
  },
  revision: provenanceCatalog.revision,
  revisionStatus: provenanceCatalog.revisionStatus,
  assets,
  summary: {
    total: assets.length,
    currentNodeCandidates: statusCount('current-'),
    historicalNodeCandidates: statusCount('historical-'),
    unbound: assets.filter((asset) => asset.figma.status === 'unbound-local-resource').length,
  },
  rule: 'A local SVG becomes a verified Figma asset only after its canonical Figma icon node, current revision and exported-byte hash are recorded in a frozen Design Delta. Semantic filename similarity is never proof.',
};

const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
if (process.argv.includes('--check')) {
  if (!fs.existsSync(outPath)) {
    console.error(`missing ${path.relative(readerUiRoot, outPath)}; run without --check`);
    process.exitCode = 1;
  } else if (fs.readFileSync(outPath, 'utf8') !== rendered) {
    console.error(`stale ${path.relative(readerUiRoot, outPath)}; run without --check`);
    process.exitCode = 1;
  } else {
    console.log(`local asset manifest current: ${manifest.summary.total} SVGs`);
  }
} else {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, rendered);
  console.log(`wrote ${path.relative(readerUiRoot, outPath)}: ${manifest.summary.total} SVGs`);
}
