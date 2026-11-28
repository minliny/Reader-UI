import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { runInNewContext } from 'node:vm';

const window = {};
runInNewContext(readFileSync(new URL('../reader-ebook-dom.js', import.meta.url), 'utf8'), { window });
const { create, scalarCount } = window.ReaderEbookDom;

test('positions count Unicode scalars, including supplementary text, combining marks and image placeholders', () => {
  assert.equal('𠀀与Café\uFFFC'.length, 9);
  assert.equal(scalarCount('𠀀与Café\uFFFC'), 8);
  assert.equal(scalarCount(''), 0);
});

test('unpaired UTF-16 surrogates cannot enter Core coordinates', () => {
  assert.throws(() => scalarCount('\uD800后'), /UNPAIRED_SURROGATE/);
  assert.throws(() => scalarCount('前\uDC00'), /UNPAIRED_SURROGATE/);
});

test('reject an invalid half-open window or an incorrectly declared scalar count before DOM work', () => {
  const descriptor = {
    documentCanonicalContent: '甲𠀀乙',
    content: '𠀀',
    chapterStartScalar: 1,
    chapterEndScalar: 2,
    scalarCount: 1,
  };
  assert.throws(() => create(null, { ...descriptor, chapterEndScalar: 4 }), /INVALID_SCALAR_COORDINATE/);
  assert.throws(() => create(null, { ...descriptor, chapterEndScalar: 1 }), /CORE_WINDOW_MISMATCH/);
  assert.throws(() => create(null, { ...descriptor, scalarCount: 2 }), /CORE_WINDOW_MISMATCH/);
});

test('same-length processed replacements cannot prove original DOM coordinates', () => {
  assert.throws(() => create(null, {
    documentCanonicalContent: '甲𠀀乙',
    content: '😀',
    chapterStartScalar: 1,
    chapterEndScalar: 2,
    scalarCount: 1,
  }), /CORE_PROCESSED_MAPPING_UNPROVEN/);
});
