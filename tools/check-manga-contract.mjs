import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
assert.equal(read('../contracts/manga.ts'), read('../../Reader-for-HarmonyOS/entry/src/main/ets/features/manga/MangaContract.ts'),
  'Core wire projection must remain identical in UI and Harmony consumers');
assert.deepEqual(JSON.parse(read('../contracts/fixtures/manga-pages-extract.json')),
  JSON.parse(read('../../Reader-Core/crates/reader-contract/fixtures/manga-pages-extract.json')));
const schema = JSON.parse(read('../../Reader-Core/protocol/reader-command.schema.json'));
for (const name of ['MangaChapterIdentity', 'MangaFirstImageReceipt', 'MangaManifestPage', 'MangaManifest', 'MangaLocation', 'MangaOfflineReceipt', 'MangaChapterGetParams', 'MangaProgressGetParams', 'MangaProgressUpdateParams']) {
  assert.ok(schema.$defs[name], `Core schema owns ${name}`);
}
const definition = name => schema.$defs[name];
const requires = (name, ...fields) => {
  for (const field of fields) {
    assert.ok(definition(name).required?.includes(field), `${name}.${field} must be required`);
  }
};
const ref = (name, field, target) =>
  assert.equal(definition(name).properties[field]?.$ref, `#/$defs/${target}`, `${name}.${field} reference`);

// These fields carry stable image identity and durable progress. Their presence
// in a DTO alone would not detect a Core wire schema that made them optional.
requires('MangaManifestPage', 'pageId', 'ordinal', 'resourceRef');
requires('MangaManifest', 'chapter', 'sourceRuleVersion', 'manifestVersion', 'decodeRevision', 'pages');
ref('MangaManifest', 'chapter', 'MangaChapterIdentity');
assert.equal(definition('MangaManifest').properties.pages.items.$ref, '#/$defs/MangaManifestPage');
requires('MangaLocation', 'kind', 'chapter', 'manifestVersion', 'pageId', 'pageOrdinalFallback', 'x', 'y', 'progressRevision');
assert.equal(definition('MangaLocation').properties.kind.const, 'manga');
for (const coordinate of ['x', 'y']) {
  assert.deepEqual(
    { minimum: definition('MangaLocation').properties[coordinate].minimum,
      maximum: definition('MangaLocation').properties[coordinate].maximum },
    { minimum: 0, maximum: 1 }, `MangaLocation.${coordinate} normalized image coordinate`);
}
requires('MangaProgressUpdateParams', 'kind', 'location', 'expectedEpoch', 'expectedRevision');
ref('MangaProgressUpdateParams', 'location', 'MangaLocation');
requires('MangaProgressGetParams', 'kind', 'sourceId', 'bookId');
assert.equal(definition('MangaProgressGetParams').properties.kind.const, 'manga');
requires('MangaChapterGetParams', 'sourceId', 'bookId', 'chapterIndex');
requires('MangaFirstImageReceipt', 'chapter', 'manifestVersion', 'sourceRuleVersion',
  'decodeRevision', 'pageId', 'resourceRef', 'imageRevision', 'width', 'height');
requires('MangaOfflineReceipt', 'chapter', 'manifestVersion', 'resourceRefs');
assert.equal(definition('MangaOfflineReceipt').properties.resourceRefs.items.pattern,
  '^manga:mp1:[0-9a-f]{64}$', 'offline receipt must reference durable manga resources');
console.log('PASS manga consumer DTO, fixture and durable image/progress wire invariants');
