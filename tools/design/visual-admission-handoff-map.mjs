// One explicit record/family -> handoff directory authority shared by
// promotion and native-consumer receipt verification.
//
// Prefix guessing is invalid for several families: reader.control-home and
// reader.reading-surface have independent immutable packets under
// reader-runtime, while search/webdav/settings use non-prefix directories.
export const VISUAL_ADMISSION_HANDOFF_DIR_BY_RECORD_OR_FAMILY = Object.freeze({
  'reader.reading-surface': 'reader-runtime/reading-surface',
  'reader.control-home': 'reader-runtime/control-home',
  'reader.module.directory': 'reader-runtime/directory',
  'bookshelf': 'bookshelf',
  'book-detail': 'book-detail',
  'source-switch': 'source-switch',
  'reader': 'reader-runtime',
  'settings': 'settings-general',
  'source-management': 'source-management',
  'webdav': 'webdav-config',
  'sync-backup': 'sync-backup',
  'search': 'search-results',
  'discover': 'discover',
  'rss': 'rss',
  'about': 'about',
  'import-conflict-resolve': 'import-conflict-resolve',
  'restore-preview': 'restore-preview',
});

export function handoffDirForVisualAdmissionRecord(recordId) {
  const dot = recordId.indexOf('.');
  const family = dot > 0 ? recordId.slice(0, dot) : recordId;
  const directory =
    VISUAL_ADMISSION_HANDOFF_DIR_BY_RECORD_OR_FAMILY[recordId] ||
    VISUAL_ADMISSION_HANDOFF_DIR_BY_RECORD_OR_FAMILY[family];
  if (!directory) {
    throw new Error(
      `record ${recordId}: no explicit handoff mapping for family '${family}'`,
    );
  }
  return directory;
}
