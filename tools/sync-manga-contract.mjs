import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'contracts/manga.ts');
const target = resolve(root, '../Reader-for-HarmonyOS/entry/src/main/ets/features/manga/MangaContract.ts');

/** Core owns wire semantics; Reader-UI owns this shared TypeScript projection. */
export function mangaContractProjection(text) {
  const sha = createHash('sha256').update(text).digest('hex');
  return `// Generated from Reader-UI/contracts/manga.ts. Do not edit.\n// SHA256 ${sha}\n` + text;
}
export function verifyMangaProjection() {
  assert.equal(readFileSync(target, 'utf8'), mangaContractProjection(readFileSync(source, 'utf8')),
    'Generated manga projection is stale; run node tools/sync-manga-contract.mjs --write in Reader-UI');
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const mode = process.argv[2];
  assert.ok(process.argv.length === 3 && ['--check', '--write'].includes(mode),
    'Usage: sync-manga-contract.mjs --check|--write');
  if (mode === '--write') {
    const expected = mangaContractProjection(readFileSync(source, 'utf8'));
    if (readFileSync(target, 'utf8') !== expected) writeFileSync(target, expected);
  }
  verifyMangaProjection();
  console.log(`Manga TypeScript projection ${mode}: one canonical input; no schema, runtime or build executed`);
}
