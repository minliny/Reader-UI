#!/usr/bin/env node
// Generates the native-consumable visual-admission table from the one Reader-UI
// registry. Hosts consume this artifact; they must not recreate an independent
// Figma/route policy or a second allowlist.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_ADMISSION_REGISTRY.json');
const tokenLedgerPath = path.join(repoRoot, 'docs', 'design', 'FIGMA_VISUAL_TOKEN_LEDGER.json');
const outputPath = path.join(repoRoot, 'generated', 'arkts', 'VisualAdmission.ets');

function compare(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function quote(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(compare)
      .map((key) => [key, canonicalize(value[key])]),
  );
}

// B3 changes Reader-UI-only evidence (`local.status`, handoff links, test
// receipts) before B4 is allowed to touch the HarmonyOS consumer. Hashing the
// entire registry here made that valid source-only transition stale the native
// artifact even though none of its admissions or Figma bindings changed. It
// forced an early consumer copy and contradicted the B4-only promotion rule.
//
// Bind the generated artifact to the exact visual/admission projection instead:
// canonical Figma identity, route/overlay/state membership, classification,
// delivery state, and Harmony admission state. Local implementation evidence,
// prose evidence links, and consumer target paths stay outside this projection;
// they are independently verified by the B3 packet and promotion gate.
function registryAdmissionProjection(registry) {
  return canonicalize({
    schemaVersion: registry.schemaVersion,
    kind: registry.kind,
    authority: registry.authority,
    records: registry.records
      .map((record) => ({
        id: record.id,
        surfaceType: record.surfaceType,
        routeIds: record.routeIds,
        overlayKinds: record.overlayKinds,
        stateBindings: record.stateBindings,
        classification: record.classification,
        deliveryStatus: record.deliveryStatus,
        figma: record.figma,
        harmonyStatus: record.harmony?.status,
      }))
      .sort((left, right) => compare(left.id, right.id)),
  });
}

// Admission is a two-dimensional gate, not a single flag. `sourceBound` records
// that the Figma identity is registered (the old `admitted` meaning). `implementationReady`
// records that the page family has completed Reader-UI source-side conversion AND
// HarmonyOS consumption — only this status authorizes a renderer to draw the surface.
//
// The previous `admissionForClassification` collapsed these two dimensions into one
// `admitted` value, which let `candidate-backport` routes (source bound but not yet
// implemented) be confused with deliverable surfaces at the renderer gate. That gap is
// what let an agent advance a virtual-machine cycle on a page family whose Reader-UI
// → HarmonyOS chain was not actually complete.
const IMPLEMENTATION_READY_HARMONY_STATUS = 'implementation-ready';

function sourceBoundForRecord(record) {
  return record.classification === 'exact-figma-binding';
}

function implementationReadyForRecord(record) {
  return record.classification === 'exact-figma-binding'
    && record.harmony?.status === IMPLEMENTATION_READY_HARMONY_STATUS;
}

function admissionForRecord(record) {
  switch (record.classification) {
    case 'exact-figma-binding':
      // A source-bound route that has not been marked implementation-ready
      // stays fail-closed at the renderer gate. `candidate-backport` is the
      // explicit signal so downstream consumers can distinguish "Figma source
      // exists but the family is not deliverable" from "fully ready" and from
      // "blocked/retired".
      return implementationReadyForRecord(record) ? 'implementation-ready' : 'candidate-backport';
    case 'retired': return 'retired';
    case 'figma-absent-fail-closed':
    case 'figma-unbound-fail-closed': return 'blocked';
    default: throw new Error(`unsupported visual-admission classification: ${record.classification}`);
  }
}

function collectSimpleAdmissions(registry, field, required) {
  const admissionMap = new Map();
  for (const record of registry.records) {
    const values = record[field];
    if (required) {
      assert(Array.isArray(values), `${record.id}: ${field} must be an array`);
    } else if (values === undefined) {
      continue;
    } else {
      assert(Array.isArray(values), `${record.id}: ${field} must be an array when present`);
    }
    const admission = admissionForRecord(record);
    const sourceBound = sourceBoundForRecord(record);
    const implementationReady = implementationReadyForRecord(record);
    for (const value of values) {
      assert(typeof value === 'string' && value.length > 0, `${record.id}: invalid ${field} value`);
      const existing = admissionMap.get(value);
      if (existing !== undefined) {
        assert(existing.admission === admission,
          `${value}: contradictory visual admissions (${existing.admission} vs ${admission})`);
        assert(existing.sourceBound === sourceBound,
          `${value}: contradictory sourceBound (${existing.sourceBound} vs ${sourceBound})`);
        assert(existing.implementationReady === implementationReady,
          `${value}: contradictory implementationReady (${existing.implementationReady} vs ${implementationReady})`);
        existing.recordIds.push(record.id);
      } else {
        admissionMap.set(value, { admission, sourceBound, implementationReady, recordIds: [record.id] });
      }
    }
  }
  return [...admissionMap.entries()]
    .map(([id, value]) => ({
      id,
      admission: value.admission,
      sourceBound: value.sourceBound,
      implementationReady: value.implementationReady,
      recordIds: value.recordIds.sort(compare),
    }))
    .sort((left, right) => compare(left.id, right.id));
}

function collectStateAdmissions(registry) {
  const admissionMap = new Map();
  for (const record of registry.records) {
    const bindings = record.stateBindings;
    if (bindings === undefined) continue;
    assert(typeof bindings === 'object' && bindings !== null && !Array.isArray(bindings),
      `${record.id}: stateBindings must be an object when present`);
    const admission = admissionForRecord(record);
    const sourceBound = sourceBoundForRecord(record);
    const implementationReady = implementationReadyForRecord(record);
    for (const [routeId, stateIds] of Object.entries(bindings)) {
      assert(typeof routeId === 'string' && routeId.length > 0, `${record.id}: invalid stateBindings route id`);
      assert(Array.isArray(stateIds), `${record.id}: ${routeId} stateBindings must be an array`);
      for (const stateId of stateIds) {
        assert(typeof stateId === 'string' && stateId.length > 0,
          `${record.id}: invalid state binding for ${routeId}`);
        const key = `${routeId}:${stateId}`;
        const existing = admissionMap.get(key);
        if (existing !== undefined) {
          assert(existing.admission === admission,
            `${key}: contradictory visual admissions (${existing.admission} vs ${admission})`);
          assert(existing.sourceBound === sourceBound,
            `${key}: contradictory sourceBound (${existing.sourceBound} vs ${sourceBound})`);
          assert(existing.implementationReady === implementationReady,
            `${key}: contradictory implementationReady (${existing.implementationReady} vs ${implementationReady})`);
          existing.recordIds.push(record.id);
        } else {
          admissionMap.set(key, {
            routeId, stateId, admission, sourceBound, implementationReady, recordIds: [record.id],
          });
        }
      }
    }
  }
  return [...admissionMap.values()]
    .map((value) => ({ ...value, recordIds: value.recordIds.sort(compare) }))
    .sort((left, right) => compare(`${left.routeId}:${left.stateId}`, `${right.routeId}:${right.stateId}`));
}

// A route can be truthful on one Figma viewport while deliberately absent on
// another. Keep this exceptional fact in the one registry instead of
// flattening it into a global native-side route policy. The current example is
// the Phone-only Bookshelf list row: Figma has the Phone component but no
// Tablet component.
function collectViewportRouteAdmissions(registry) {
  const admissionMap = new Map();
  for (const record of registry.records) {
    if (record.surfaceType !== 'viewport-exception') continue;
    const viewportNodes = record.figma?.viewportNodes;
    if (viewportNodes === undefined) continue;
    assert(typeof viewportNodes === 'object' && viewportNodes !== null && !Array.isArray(viewportNodes),
      `${record.id}: figma.viewportNodes must be an object for a viewport exception`);
    assert(Array.isArray(record.routeIds), `${record.id}: viewport exception routeIds must be an array`);
    const recordImplementationReady = implementationReadyForRecord(record);
    for (const routeId of record.routeIds) {
      assert(typeof routeId === 'string' && routeId.length > 0,
        `${record.id}: invalid viewport exception route id`);
      for (const [viewport, nodeId] of Object.entries(viewportNodes)) {
        assert(typeof viewport === 'string' && viewport.length > 0,
          `${record.id}: invalid viewport key`);
        const sourceBound = typeof nodeId === 'string' && nodeId.length > 0;
        const implementationReady = sourceBound && recordImplementationReady;
        const admission = implementationReady
          ? 'implementation-ready'
          : (sourceBound ? 'candidate-backport' : 'blocked');
        const key = `${routeId}:${viewport}`;
        const existing = admissionMap.get(key);
        if (existing !== undefined) {
          assert(existing.admission === admission,
            `${key}: contradictory viewport visual admissions (${existing.admission} vs ${admission})`);
          assert(existing.sourceBound === sourceBound,
            `${key}: contradictory viewport sourceBound (${existing.sourceBound} vs ${sourceBound})`);
          assert(existing.implementationReady === implementationReady,
            `${key}: contradictory viewport implementationReady (${existing.implementationReady} vs ${implementationReady})`);
          existing.recordIds.push(record.id);
        } else {
          admissionMap.set(key, {
            routeId, viewport, admission, sourceBound, implementationReady, recordIds: [record.id],
          });
        }
      }
    }
  }
  return [...admissionMap.values()]
    .map((value) => ({ ...value, recordIds: value.recordIds.sort(compare) }))
    .sort((left, right) => compare(`${left.routeId}:${left.viewport}`, `${right.routeId}:${right.viewport}`));
}

function recordIds(recordIds) {
  return `[${recordIds.map((id) => `'${quote(id)}'`).join(', ')}]`;
}

function collectVisualTokens(registry, tokenLedgerSource) {
  const ledger = JSON.parse(tokenLedgerSource);
  assert(ledger.kind === 'FIGMA_VISUAL_TOKEN_LEDGER', 'unexpected visual token ledger kind');
  assert(Array.isArray(ledger.tokens), 'visual token ledger tokens must be an array');
  assert(ledger.authority?.registry === 'docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json',
    'visual token ledger must name the visual admission registry');
  assert(ledger.authority?.fileKey === registry.authority?.fileKey,
    'visual token ledger file key differs from visual admission registry');

  const exactRecords = new Map(registry.records
    .filter((record) => record.classification === 'exact-figma-binding')
    .map((record) => [record.id, record]));
  const exactRevisions = [...new Set([...exactRecords.values()]
    .map((record) => record.figma?.revision)
    .filter((revision) => typeof revision === 'string' && revision.length > 0))];
  assert(exactRevisions.length === 1,
    'visual token ledger requires exactly one current exact Figma revision');
  assert(ledger.authority?.revision === exactRevisions[0],
    'visual token ledger revision differs from visual admission registry');

  const seen = new Set();
  return ledger.tokens.map((token) => {
    assert(typeof token?.id === 'string' && /^[A-Za-z][A-Za-z0-9]*$/.test(token.id),
      'visual token id must be a non-empty ArkTS identifier');
    assert(!seen.has(token.id), `duplicate visual token id: ${token.id}`);
    seen.add(token.id);
    assert(token.type === 'color' || token.type === 'number' || token.type === 'font',
      `${token.id}: unsupported visual token type`);
    if (token.type === 'color') {
      assert(typeof token.value === 'string' && /^#[0-9A-Fa-f]{8}$/.test(token.value),
        `${token.id}: color must be an ARGB #AARRGGBB literal`);
    } else if (token.type === 'number') {
      assert(typeof token.value === 'number' && Number.isFinite(token.value),
        `${token.id}: number must be finite`);
    } else {
      assert(typeof token.value === 'string' && token.value.length > 0,
        `${token.id}: font must be a non-empty family name`);
    }
    assert(typeof token.recordId === 'string' && exactRecords.has(token.recordId),
      `${token.id}: must bind an exact-figma-binding record`);
    assert(typeof token.nodeId === 'string' && token.nodeId.length > 0,
      `${token.id}: missing current Figma node id`);
    assert(typeof token.property === 'string' && token.property.length > 0,
      `${token.id}: missing Figma property provenance`);
    return token;
  }).sort((left, right) => compare(left.id, right.id));
}

export function buildVisualAdmissionArtifact(registrySource, tokenLedgerSource) {
  const registry = JSON.parse(registrySource);
  assert(registry.kind === 'FIGMA_VISUAL_ADMISSION_REGISTRY', 'unexpected registry kind');
  assert(Array.isArray(registry.records), 'registry records must be an array');
  for (const record of registry.records) {
    assert(typeof record?.id === 'string' && record.id.length > 0, 'registry record missing id');
    admissionForRecord(record);
  }

  const routeEntries = collectSimpleAdmissions(registry, 'routeIds', true)
    .map((entry) => ({ ...entry, routeId: entry.id }));
  const overlayEntries = collectSimpleAdmissions(registry, 'overlayKinds', false)
    .map((entry) => ({ ...entry, overlayKind: entry.id }));
  const recordEntries = registry.records
    .map((record) => ({
      recordId: record.id,
      admission: admissionForRecord(record),
      sourceBound: sourceBoundForRecord(record),
      implementationReady: implementationReadyForRecord(record),
    }))
    .sort((left, right) => compare(left.recordId, right.recordId));
  const stateEntries = collectStateAdmissions(registry);
  const viewportRouteEntries = collectViewportRouteAdmissions(registry);
  const exactRevisions = [...new Set(registry.records
    .filter((record) => record.classification === 'exact-figma-binding')
    .map((record) => record.figma?.revision)
    .filter((revision) => typeof revision === 'string' && revision.length > 0))]
    .sort(compare);
  assert(exactRevisions.length <= 1, 'exact visual records have multiple current revisions');
  const visualTokens = collectVisualTokens(registry, tokenLedgerSource);
  const registrySha = crypto.createHash('sha256')
    .update(`${JSON.stringify(registryAdmissionProjection(registry))}\n`)
    .digest('hex');
  const tokenLedgerSha = crypto.createHash('sha256').update(tokenLedgerSource).digest('hex');

  const lines = [
    '// GENERATED by tools/design/generate-visual-admission-contract.mjs — DO NOT EDIT BY HAND.',
    '// Source: docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json (the sole visual admission authority).',
    '// REGISTRY_SHA256 binds the canonical visual/admission projection; Reader-UI-only B3 evidence is excluded.',
    '',
    "export type ReaderUiVisualAdmissionStatus = 'implementation-ready' | 'candidate-backport' | 'blocked' | 'retired';",
    '',
    'export interface ReaderUiVisualRecordAdmissionEntry {',
    '  recordId: string;',
    '  admission: ReaderUiVisualAdmissionStatus;',
    '  sourceBound: boolean;',
    '  implementationReady: boolean;',
    '}',
    '',
    'export interface ReaderUiVisualRouteAdmissionEntry {',
    '  routeId: string;',
    '  admission: ReaderUiVisualAdmissionStatus;',
    '  sourceBound: boolean;',
    '  implementationReady: boolean;',
    '  recordIds: string[];',
    '}',
    '',
    'export interface ReaderUiVisualOverlayAdmissionEntry {',
    '  overlayKind: string;',
    '  admission: ReaderUiVisualAdmissionStatus;',
    '  sourceBound: boolean;',
    '  implementationReady: boolean;',
    '  recordIds: string[];',
    '}',
    '',
    'export interface ReaderUiVisualViewportRouteAdmissionEntry {',
    '  routeId: string;',
    '  viewport: string;',
    '  admission: ReaderUiVisualAdmissionStatus;',
    '  sourceBound: boolean;',
    '  implementationReady: boolean;',
    '  recordIds: string[];',
    '}',
    '',
    'export interface ReaderUiVisualStateAdmissionEntry {',
    '  routeId: string;',
    '  stateId: string;',
    '  admission: ReaderUiVisualAdmissionStatus;',
    '  sourceBound: boolean;',
    '  implementationReady: boolean;',
    '  recordIds: string[];',
    '}',
    '',
    'export class ReaderUiVisualTokens {',
    `  static readonly SOURCE_FILE_KEY: string = '${quote(registry.authority.fileKey)}';`,
    `  static readonly SOURCE_REVISION: string = '${quote(exactRevisions[0] ?? '')}';`,
    `  static readonly LEDGER_SHA256: string = '${tokenLedgerSha}';`,
    ...visualTokens.map((token) => {
      const isString = token.type === 'color' || token.type === 'font';
      return `  static readonly ${token.id}: ${isString ? 'string' : 'number'} = ${isString ? `'${quote(token.value)}'` : token.value};`;
    }),
    '}',
    '',
    'export class ReaderUiVisualAdmission {',
    `  static readonly SOURCE_FILE_KEY: string = '${quote(registry.authority.fileKey)}';`,
    `  static readonly SOURCE_REVISION: string = '${quote(exactRevisions[0] ?? '')}';`,
    `  static readonly REGISTRY_SHA256: string = '${registrySha}';`,
    '  static readonly RECORD_ADMISSIONS: ReaderUiVisualRecordAdmissionEntry[] = [',
    ...recordEntries.map((entry) =>
      `    { recordId: '${quote(entry.recordId)}', admission: '${entry.admission}', sourceBound: ${entry.sourceBound}, implementationReady: ${entry.implementationReady} },`),
    '  ];',
    '  static readonly ROUTE_ADMISSIONS: ReaderUiVisualRouteAdmissionEntry[] = [',
    ...routeEntries.map((entry) =>
      `    { routeId: '${quote(entry.routeId)}', admission: '${entry.admission}', sourceBound: ${entry.sourceBound}, implementationReady: ${entry.implementationReady}, recordIds: ${recordIds(entry.recordIds)} },`),
    '  ];',
    '  static readonly OVERLAY_ADMISSIONS: ReaderUiVisualOverlayAdmissionEntry[] = [',
    ...overlayEntries.map((entry) =>
      `    { overlayKind: '${quote(entry.overlayKind)}', admission: '${entry.admission}', sourceBound: ${entry.sourceBound}, implementationReady: ${entry.implementationReady}, recordIds: ${recordIds(entry.recordIds)} },`),
    '  ];',
    '  static readonly VIEWPORT_ROUTE_ADMISSIONS: ReaderUiVisualViewportRouteAdmissionEntry[] = [',
    ...viewportRouteEntries.map((entry) =>
      `    { routeId: '${quote(entry.routeId)}', viewport: '${quote(entry.viewport)}', admission: '${entry.admission}', sourceBound: ${entry.sourceBound}, implementationReady: ${entry.implementationReady}, recordIds: ${recordIds(entry.recordIds)} },`),
    '  ];',
    '  static readonly STATE_ADMISSIONS: ReaderUiVisualStateAdmissionEntry[] = [',
    ...stateEntries.map((entry) =>
      `    { routeId: '${quote(entry.routeId)}', stateId: '${quote(entry.stateId)}', admission: '${entry.admission}', sourceBound: ${entry.sourceBound}, implementationReady: ${entry.implementationReady}, recordIds: ${recordIds(entry.recordIds)} },`),
    '  ];',
    '',
    '  static admissionForRecord(recordId: string): ReaderUiVisualAdmissionStatus {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.RECORD_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.RECORD_ADMISSIONS[index];',
    '      if (entry.recordId === recordId) return entry.admission;',
    '    }',
    "    return 'blocked';",
    '  }',
    '',
    '  static isRecordAdmitted(recordId: string): boolean {',
    "    return ReaderUiVisualAdmission.admissionForRecord(recordId) === 'implementation-ready';",
    '  }',
    '',
    '  static isRecordSourceBound(recordId: string): boolean {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.RECORD_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.RECORD_ADMISSIONS[index];',
    '      if (entry.recordId === recordId) return entry.sourceBound;',
    '    }',
    '    return false;',
    '  }',
    '',
    '  static admissionForRoute(routeId: string): ReaderUiVisualAdmissionStatus {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.ROUTE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.ROUTE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId) return entry.admission;',
    '    }',
    "    return 'blocked';",
    '  }',
    '',
    '  // `isRouteAdmitted` is the renderer gate. Only `implementation-ready` passes.',
    '  // `candidate-backport` routes are source-bound but NOT implementation-ready;',
    '  // they fail closed until Reader-UI marks the family implementation-ready.',
    '  static isRouteAdmitted(routeId: string): boolean {',
    "    return ReaderUiVisualAdmission.admissionForRoute(routeId) === 'implementation-ready';",
    '  }',
    '',
    '  // `isRouteSourceBound` records that a Figma identity is registered for the',
    '  // route. It is traceability only — never a renderer gate. Use it to',
    '  // distinguish "Figma source missing" from "family not yet deliverable".',
    '  static isRouteSourceBound(routeId: string): boolean {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.ROUTE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.ROUTE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId) return entry.sourceBound;',
    '    }',
    '    return false;',
    '  }',
    '',
    '  static admissionForRouteViewport(routeId: string, viewport: string): ReaderUiVisualAdmissionStatus {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.VIEWPORT_ROUTE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.VIEWPORT_ROUTE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId && entry.viewport === viewport) return entry.admission;',
    '    }',
    '    return ReaderUiVisualAdmission.admissionForRoute(routeId);',
    '  }',
    '',
    '  static isRouteAdmittedForViewport(routeId: string, viewport: string): boolean {',
    "    return ReaderUiVisualAdmission.admissionForRouteViewport(routeId, viewport) === 'implementation-ready';",
    '  }',
    '',
    '  static isRouteSourceBoundForViewport(routeId: string, viewport: string): boolean {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.VIEWPORT_ROUTE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.VIEWPORT_ROUTE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId && entry.viewport === viewport) return entry.sourceBound;',
    '    }',
    '    return ReaderUiVisualAdmission.isRouteSourceBound(routeId);',
    '  }',
    '',
    '  static admissionForOverlay(overlayKind: string): ReaderUiVisualAdmissionStatus {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.OVERLAY_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.OVERLAY_ADMISSIONS[index];',
    '      if (entry.overlayKind === overlayKind) return entry.admission;',
    '    }',
    "    return 'blocked';",
    '  }',
    '',
    '  static isOverlayAdmitted(overlayKind: string): boolean {',
    "    return ReaderUiVisualAdmission.admissionForOverlay(overlayKind) === 'implementation-ready';",
    '  }',
    '',
    '  static isOverlaySourceBound(overlayKind: string): boolean {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.OVERLAY_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.OVERLAY_ADMISSIONS[index];',
    '      if (entry.overlayKind === overlayKind) return entry.sourceBound;',
    '    }',
    '    return false;',
    '  }',
    '',
    '  static admissionForState(routeId: string, stateId: string): ReaderUiVisualAdmissionStatus {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.STATE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.STATE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId && entry.stateId === stateId) return entry.admission;',
    '    }',
    "    return 'blocked';",
    '  }',
    '',
    '  static isStateAdmitted(routeId: string, stateId: string): boolean {',
    "    return ReaderUiVisualAdmission.admissionForState(routeId, stateId) === 'implementation-ready';",
    '  }',
    '',
    '  static isStateSourceBound(routeId: string, stateId: string): boolean {',
    '    for (let index = 0; index < ReaderUiVisualAdmission.STATE_ADMISSIONS.length; index += 1) {',
    '      const entry = ReaderUiVisualAdmission.STATE_ADMISSIONS[index];',
    '      if (entry.routeId === routeId && entry.stateId === stateId) return entry.sourceBound;',
    '    }',
    '    return false;',
    '  }',
    '}',
  ];
  return `${lines.join('\n')}\n`;
}

export function writeVisualAdmissionArtifact() {
  const source = fs.readFileSync(registryPath, 'utf8');
  const tokenLedgerSource = fs.readFileSync(tokenLedgerPath, 'utf8');
  const output = buildVisualAdmissionArtifact(source, tokenLedgerSource);
  fs.writeFileSync(outputPath, output);
  return output;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const expected = buildVisualAdmissionArtifact(
    fs.readFileSync(registryPath, 'utf8'),
    fs.readFileSync(tokenLedgerPath, 'utf8'),
  );
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf8') : '';
  if (check) {
    if (current !== expected) {
      console.error('VISUAL_ADMISSION_CONTRACT: generated artifact is stale');
      process.exitCode = 1;
    } else {
      console.log('VISUAL_ADMISSION_CONTRACT: current');
    }
  } else {
    writeVisualAdmissionArtifact();
    console.log('VISUAL_ADMISSION_CONTRACT: wrote generated/arkts/VisualAdmission.ets');
  }
}
