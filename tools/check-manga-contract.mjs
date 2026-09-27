import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.equal(read('../contracts/manga.ts'), read('../../Reader-for-HarmonyOS/entry/src/main/ets/features/manga/MangaContract.ts'),
  'Core wire projection must remain identical in UI and Harmony consumers');
assert.deepEqual(JSON.parse(read('../contracts/fixtures/manga-pages-extract.json')),
  JSON.parse(read('../../Reader-Core-Native/crates/reader-contract/fixtures/manga-pages-extract.json')));
const schema = JSON.parse(read('../../Reader-Core-Native/protocol/reader-command.schema.json'));
for (const name of ['MangaChapterIdentity', 'MangaFirstImageReceipt', 'MangaManifestPage', 'MangaManifest', 'MangaLocation', 'MangaChapterGetParams', 'MangaProgressGetParams', 'MangaProgressUpdateParams']) {
  assert.ok(schema.$defs[name], `Core schema owns ${name}`);
}
console.log('PASS manga consumer DTO and extraction fixture parity; Core schema definitions present');
