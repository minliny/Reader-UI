// Keep generated Swift enum case names valid while preserving the schema value
// as the enum raw value. Contract identifiers are ASCII today, so replace every
// non-identifier character rather than handling punctuation one-by-one.
export function swiftUiEventCase(eventType) {
  const normalized = String(eventType).replace(/[^A-Za-z0-9_]/g, "_");
  return /^[A-Za-z_]/.test(normalized) ? normalized : `_${normalized}`;
}
