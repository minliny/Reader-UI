/**
 * Deterministic, read-only export plan for Reader control icons.
 *
 * This module does not call Figma, download assets, read credentials, or write
 * files. It records the current, revision-pinned icon graph and emits
 * `use_figma` programs that call only `node.exportAsync({ format:
 * 'SVG_STRING' })` on exact icon nodes.
 */

export const READER_ICON_EXPORT_PLAN_KIND = 'FIGMA_READER_ICON_CLEAN_SVG_EXPORT_PLAN';
export const READER_ICON_EXPORT_PLAN_SCHEMA = '1.0.0';
export const READER_FIGMA_FILE_KEY = 'klhs2jMM4MncaJFqZMfqEK';
export const READER_FIGMA_REVISION = '2379851596474967636';
export const READER_FIGMA_REVISION_EVIDENCE = 'docs/design/F0_FIGMA_CURRENT_REVISION_EVIDENCE.json';
export const READER_FIGMA_PAGE_ID = '1023:17636';
export const READER_ICON_EXPORT_BATCH_SIZE = 8;

export const CLEAN_SVG_STRING_EXPORT_SETTINGS = Object.freeze({
  format: 'SVG_STRING',
  svgOutlineText: true,
  svgIdAttribute: true,
  svgSimplifyStroke: false,
});

const NODE_ID_PATTERN = /^\d+:\d+$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const LOCAL_MEDIA_PREFIX =
  'Reader-for-HarmonyOS/entry/src/main/resources/base/media/';
const ALLOWED_EXPORT_NODE_ROLES = new Set([
  'canonical-icon-master',
  'canonical-icon-composite',
  'leaf-icon-instance',
  'leaf-vector',
]);

/**
 * Known layout/page ancestors that must never become export targets.
 *
 * The stop control's `1023:17810` component is intentionally not in this set:
 * it is the canonical 44×44 composite asset, not an unrelated layout wrapper.
 */
export const PROHIBITED_READER_ICON_EXPORT_NODE_IDS = Object.freeze([
  READER_FIGMA_PAGE_ID,
  '259:4',
  '1023:18380',
  '1023:18381',
  '1023:18403',
  '1023:18382',
  '1023:18387',
  '1023:18390',
  '1023:18414',
  '1023:18415',
  '1023:18418',
  '1023:18421',
  '1023:18433',
  '1023:18436',
  '1023:18439',
  '1023:18605',
  '1023:18606',
  '1023:18620',
  '1023:18442',
  '1023:18443',
  '1023:18445',
  '1023:18451',
  '1023:18453',
  '1023:17676',
  '1023:17677',
  '1023:17681',
  '1023:17685',
  '1023:17689',
  '1023:17693',
  '1023:17697',
  '1023:17701',
  '1023:17705',
  '1023:17802',
  '1023:17803',
  '1023:17806',
  '1023:17814',
  '1023:17962',
  '1023:17968',
  '751:1110',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function context({
  nodeId,
  nodeRole = 'leaf-icon-instance',
  componentSetNodeId = null,
  variantNodeId = null,
  variant = null,
  viewport = null,
  note = null,
}) {
  return {
    nodeId,
    nodeRole,
    componentSetNodeId,
    variantNodeId,
    variant,
    viewport,
    note,
  };
}

function artifact({
  state = 'default',
  resource,
  sha256,
  exportNodeId,
  exportNodeRole = 'leaf-icon-instance',
  expectedSize,
  evidenceStatus = 'export-required',
}) {
  return {
    state,
    resource,
    localFile: `${LOCAL_MEDIA_PREFIX}${resource}.svg`,
    localSha256: sha256,
    exportNodeId,
    exportNodeRole,
    expectedSize,
    evidenceStatus,
    revision: READER_FIGMA_REVISION,
  };
}

/**
 * Canonical masters may be shared by semantically distinct contexts (for
 * example Chapter Previous and TTS Previous). Semantics, context nodes, export
 * nodes, local resources, and local files remain unique.
 */
export const READER_ICON_BINDINGS = Object.freeze([
  {
    semantic: 'back',
    canonicalMasterNodeId: '271:37',
    contexts: [
      context({
        nodeId: '1023:18383',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18381',
        variant: { Viewport: 'Phone' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18405',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18403',
        variant: { Viewport: 'TabletExpanded' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_top_back',
        sha256: 'be6892d999aae8713998402f3cedba5d76e7ffb1dd10f6e724032ccd13baaf51',
        exportNodeId: '1023:18383',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'source-switch',
    canonicalMasterNodeId: '271:532',
    contexts: [
      context({
        nodeId: '1023:18389',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18381',
        variant: { Viewport: 'Phone' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18411',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18403',
        variant: { Viewport: 'TabletExpanded' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_top_source_switch',
        sha256: '3f3a38958379c57e38dfe23375dd6471f9299b5f5b81d06b2310e5cb85347faa',
        exportNodeId: '1023:18389',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'more',
    canonicalMasterNodeId: '271:333',
    contexts: [
      context({
        nodeId: '1023:18391',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18381',
        variant: { Viewport: 'Phone' },
        viewport: 'Phone',
        note: 'Trigger icon only; no Reader More destination is authorized.',
      }),
      context({
        nodeId: '1023:18413',
        componentSetNodeId: '1023:18380',
        variantNodeId: '1023:18403',
        variant: { Viewport: 'TabletExpanded' },
        viewport: 'TabletExpanded',
        note: 'Trigger icon only; no Reader More destination is authorized.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_top_more',
        sha256: 'f7a8128185441537b8507ef812d022611b2e503c264ae546527a89127b0ed141',
        exportNodeId: '1023:18391',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'search',
    canonicalMasterNodeId: '271:430',
    contexts: [
      context({
        nodeId: '1023:18416',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18415',
        variant: { Viewport: 'Phone', Action: 'Search', Interaction: 'Default' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18434',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18433',
        variant: { Viewport: 'TabletExpanded', Action: 'Search', Interaction: 'Default' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_quick_search',
        sha256: 'd3a6a53d8931e5c0c5b5ddda8bc7fe2ad5083be3743a8286c50e80356ab27b18',
        exportNodeId: '1023:18416',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'auto-page',
    canonicalMasterNodeId: '271:418',
    contexts: [
      context({
        nodeId: '1023:18419',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18418',
        variant: { Viewport: 'Phone', Action: 'AutoPage', Interaction: 'Default' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18437',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18436',
        variant: { Viewport: 'TabletExpanded', Action: 'AutoPage', Interaction: 'Default' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_quick_auto_page',
        sha256: 'a95bc4ab8d97b5753cb9070d5bef81c53e40f40eff70821df255cc600402837f',
        exportNodeId: '1023:18419',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'replace',
    canonicalMasterNodeId: '271:424',
    contexts: [
      context({
        nodeId: '1023:18422',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18421',
        variant: { Viewport: 'Phone', Action: 'Replace', Interaction: 'Default' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18440',
        componentSetNodeId: '1023:18414',
        variantNodeId: '1023:18439',
        variant: { Viewport: 'TabletExpanded', Action: 'Replace', Interaction: 'Default' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_quick_replace',
        sha256: '066fcadbf89112a8c08b809238f84b225b0add79fae3ce0ea7ac225739a5b926',
        exportNodeId: '1023:18422',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'sun',
    canonicalMasterNodeId: '271:555',
    contexts: [
      context({
        nodeId: '1023:18607',
        componentSetNodeId: '1023:18605',
        variantNodeId: '1023:18606',
        variant: { Viewport: 'Phone' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18621',
        componentSetNodeId: '1023:18605',
        variantNodeId: '1023:18620',
        variant: { Viewport: 'TabletExpanded' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_brightness_sun',
        sha256: '10f8781c4bf1bab487ad98b5a8cd01bb12926b5bc30d20de59b3d34fcb3ba94b',
        exportNodeId: '1023:18607',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'chapter-prev',
    canonicalMasterNodeId: '271:124',
    contexts: [
      context({
        nodeId: '1023:18444',
        componentSetNodeId: '1023:18442',
        variantNodeId: '1023:18443',
        variant: { Viewport: 'Phone', Direction: 'Previous', Interaction: 'Default' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18452',
        componentSetNodeId: '1023:18442',
        variantNodeId: '1023:18451',
        variant: { Viewport: 'TabletExpanded', Direction: 'Previous', Interaction: 'Default' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_chapter_prev',
        sha256: 'd2893063cadbca023f4533c9fa6051efb8fa2b7359bcd61b10d79488528c1898',
        exportNodeId: '1023:18444',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'chapter-next',
    canonicalMasterNodeId: '362:15',
    contexts: [
      context({
        nodeId: '1023:18446',
        componentSetNodeId: '1023:18442',
        variantNodeId: '1023:18445',
        variant: { Viewport: 'Phone', Direction: 'Next', Interaction: 'Default' },
        viewport: 'Phone',
      }),
      context({
        nodeId: '1023:18454',
        componentSetNodeId: '1023:18442',
        variantNodeId: '1023:18453',
        variant: { Viewport: 'TabletExpanded', Direction: 'Next', Interaction: 'Default' },
        viewport: 'TabletExpanded',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_chapter_next',
        sha256: 'b20b7c0f09420ec3565c08f94a8495a29bf5d5796d0768684299f2029f5396c6',
        exportNodeId: '1023:18446',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'directory',
    canonicalMasterNodeId: '271:436',
    contexts: [
      context({
        nodeId: '1023:17679',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17677',
        variant: { Module: 'Directory', State: 'Default', Interaction: 'Default' },
      }),
      context({
        nodeId: '1023:17695',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17693',
        variant: { Module: 'Directory', State: 'Active', Interaction: 'Default' },
      }),
    ],
    exports: [
      artifact({
        state: 'default',
        resource: 'reader_control_module_directory_default',
        sha256: '05abd559b218517e76602b601d831f8fff6668edc5781b82b74eb284b7a45055',
        exportNodeId: '1023:17679',
        expectedSize: { width: 24, height: 24 },
      }),
      artifact({
        state: 'active',
        resource: 'reader_control_module_directory_active',
        sha256: '33ded74f86fea874398347f58a4e3b3887882737105e37db2068644bdebd373b',
        exportNodeId: '1023:17695',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'tts-module',
    canonicalMasterNodeId: '271:442',
    contexts: [
      context({
        nodeId: '1023:17683',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17681',
        variant: { Module: 'TTS', State: 'Default', Interaction: 'Default' },
      }),
      context({
        nodeId: '1023:17699',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17697',
        variant: { Module: 'TTS', State: 'Active', Interaction: 'Default' },
      }),
    ],
    exports: [
      artifact({
        state: 'default',
        resource: 'reader_control_module_tts_default',
        sha256: '72e7bd969505cd576a53420c729b28cfa1544587680f3db69819bb082dd5c938',
        exportNodeId: '1023:17683',
        expectedSize: { width: 24, height: 24 },
      }),
      artifact({
        state: 'active',
        resource: 'reader_control_module_tts_active',
        sha256: 'a8b8f28ab5f18ba7ec001bc9040956386c7c3547d9f9a0904b6f216fd20793f4',
        exportNodeId: '1023:17699',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'appearance',
    canonicalMasterNodeId: '271:448',
    contexts: [
      context({
        nodeId: '1023:17687',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17685',
        variant: { Module: 'Appearance', State: 'Default', Interaction: 'Default' },
      }),
      context({
        nodeId: '1023:17703',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17701',
        variant: { Module: 'Appearance', State: 'Active', Interaction: 'Default' },
      }),
    ],
    exports: [
      artifact({
        state: 'default',
        resource: 'reader_control_module_appearance_default',
        sha256: '02e233c4f49cdcef788fc184a816f09abc3a5062b864c311e791395d5c02ecca',
        exportNodeId: '1023:17687',
        expectedSize: { width: 24, height: 24 },
      }),
      artifact({
        state: 'active',
        resource: 'reader_control_module_appearance_active',
        sha256: 'e3e6f0d6fd74b971053d5fb917c942b29268846b96513978b4a17c324dcc7d25',
        exportNodeId: '1023:17703',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'settings',
    canonicalMasterNodeId: '271:454',
    contexts: [
      context({
        nodeId: '1023:17691',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17689',
        variant: { Module: 'Settings', State: 'Default', Interaction: 'Default' },
      }),
      context({
        nodeId: '1023:17707',
        componentSetNodeId: '1023:17676',
        variantNodeId: '1023:17705',
        variant: { Module: 'Settings', State: 'Active', Interaction: 'Default' },
      }),
    ],
    exports: [
      artifact({
        state: 'default',
        resource: 'reader_control_module_settings_default',
        sha256: '6a399a4315c4a2db5f95ac40027bf4d14184bc764c33db42d725af4ed65a2530',
        exportNodeId: '1023:17691',
        expectedSize: { width: 24, height: 24 },
      }),
      artifact({
        state: 'active',
        resource: 'reader_control_module_settings_active',
        sha256: '23f391bcae1c97c3054a6c4b4f043f50840a8201ee203fe8dd1343f4d6ec6322',
        exportNodeId: '1023:17707',
        expectedSize: { width: 24, height: 24 },
      }),
    ],
  },
  {
    semantic: 'tts-playback',
    canonicalMasterNodeId: '271:597',
    contexts: [
      context({
        nodeId: '1023:17792',
        variantNodeId: '1023:17790',
        variant: { Type: 'Playback' },
        note: 'Current local resource is an adopted exact canonical-master export.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_tts_playback',
        sha256: '1b9b87c7ededa11fe18b3d3ad16f5c89c040ced4e53edd4bfa2088e0c04f1f26',
        exportNodeId: '271:597',
        exportNodeRole: 'canonical-icon-master',
        expectedSize: { width: 48, height: 48 },
        evidenceStatus: 'verified-exact-export',
      }),
    ],
  },
  {
    semantic: 'tts-clock',
    canonicalMasterNodeId: '271:136',
    contexts: [
      context({
        nodeId: '1023:17796',
        variantNodeId: '1023:17794',
        variant: { Type: 'Timer' },
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_tts_clock',
        sha256: 'c17a80c343754c4de390f9a4208b42ff3d7d0b295dc5e63a8f33fdb7f6e60be5',
        exportNodeId: '1023:17796',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'tts-speed',
    canonicalMasterNodeId: '271:340',
    contexts: [
      context({
        nodeId: '1023:17800',
        variantNodeId: '1023:17798',
        variant: { Type: 'Speed' },
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_tts_speed',
        sha256: '90963796bc13d4b9662297932f280aa016df8a65c1193fa4789589786b7ff7c6',
        exportNodeId: '1023:17800',
        expectedSize: { width: 20, height: 20 },
      }),
    ],
  },
  {
    semantic: 'tts-prev',
    canonicalMasterNodeId: '271:124',
    contexts: [
      context({
        nodeId: '1023:17805',
        componentSetNodeId: '1023:17802',
        variantNodeId: '1023:17803',
        variant: { Action: 'Previous', Interaction: 'Default' },
        note: 'TTS transport scope; “compact” is only a legacy resource filename.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_compact_prev',
        sha256: '11740ac15a8d2d6d97baaff49610cddac65e79618e90613dcfd3a76ef95a3105',
        exportNodeId: '1023:17805',
        expectedSize: { width: 16, height: 16 },
      }),
    ],
  },
  {
    semantic: 'play',
    canonicalMasterNodeId: '271:392',
    contexts: [
      context({
        nodeId: '1023:17809',
        componentSetNodeId: '1023:17802',
        variantNodeId: '1023:17806',
        variant: { Action: 'Play', Interaction: 'Default' },
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_play',
        sha256: 'd98af4621d6108e6dc2dcbcae556f6b8ed1c4728a840e631879b9cebcc0e0ae4',
        exportNodeId: '1023:17809',
        expectedSize: { width: 21, height: 21 },
      }),
    ],
  },
  {
    semantic: 'tts-stop',
    canonicalMasterNodeId: '271:542',
    contexts: [
      context({
        nodeId: '1023:17810',
        nodeRole: 'canonical-icon-composite',
        componentSetNodeId: '1023:17802',
        variantNodeId: '1023:17810',
        variant: { Action: 'Stop', Interaction: 'Default' },
        note: 'Intentional 44×44 clean export around the 32×32 transport component.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_tts_stop',
        sha256: '2daa2dee046569c087766dc460cb6290dfde88fead70de04c41f5bc8fc3e9415',
        exportNodeId: '1023:17810',
        exportNodeRole: 'canonical-icon-composite',
        expectedSize: { width: 44, height: 44 },
        evidenceStatus: 'export-hash-recording-required',
      }),
    ],
  },
  {
    semantic: 'tts-next',
    canonicalMasterNodeId: '362:15',
    contexts: [
      context({
        nodeId: '1023:17816',
        componentSetNodeId: '1023:17802',
        variantNodeId: '1023:17814',
        variant: { Action: 'Next', Interaction: 'Default' },
        note: 'TTS transport scope; “compact” is only a legacy resource filename.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_compact_next',
        sha256: '2d2813ef1c393366c35a14a5cc6444d13d0326394957971f99fdcd8284e21218',
        exportNodeId: '1023:17816',
        expectedSize: { width: 16, height: 16 },
      }),
    ],
  },
  {
    semantic: 'tts-caret-down',
    canonicalMasterNodeId: '750:1055',
    contexts: [
      context({
        nodeId: '750:1055',
        nodeRole: 'leaf-vector',
        variantNodeId: '750:1053',
        note: 'Exact Quick TTS select-indicator vector.',
      }),
    ],
    exports: [
      artifact({
        resource: 'reader_control_tts_caret_down',
        sha256: '1164dd18acca4f7025ca47d1454c3c8f937ac4cde19c15b7d16c04d2e51c5293',
        exportNodeId: '750:1055',
        exportNodeRole: 'leaf-vector',
        expectedSize: { width: 7, height: 4 },
        evidenceStatus: 'verified-exact-export',
      }),
    ],
  },
]);

function flattenArtifacts(bindings) {
  return bindings.flatMap((binding) =>
    binding.exports.map((entry) => ({
      semantic: binding.semantic,
      canonicalMasterNodeId: binding.canonicalMasterNodeId,
      ...entry,
    })),
  );
}

function buildUseFigmaProgram(batchId, jobs) {
  const encodedJobs = JSON.stringify(
    jobs.map((job) => ({
      semantic: job.semantic,
      state: job.state,
      resource: job.resource,
      nodeId: job.exportNodeId,
      expectedSize: job.expectedSize,
      revision: job.revision,
    })),
  );
  const encodedSettings = JSON.stringify(CLEAN_SVG_STRING_EXPORT_SETTINGS);
  return [
    `const batchId = ${JSON.stringify(batchId)};`,
    `const expectedRevision = ${JSON.stringify(READER_FIGMA_REVISION)};`,
    `const jobs = ${encodedJobs};`,
    `const exportSettings = ${encodedSettings};`,
    'const results = [];',
    'for (const job of jobs) {',
    '  if (job.revision !== expectedRevision) throw new Error(`revision mismatch for ${job.resource}`);',
    '  const node = await figma.getNodeByIdAsync(job.nodeId);',
    '  if (!node) throw new Error(`missing exact icon node ${job.nodeId}`);',
    "  if (node.type === 'PAGE' || node.type === 'DOCUMENT' || !('exportAsync' in node)) {",
    '    throw new Error(`forbidden or non-exportable icon node ${job.nodeId} (${node.type})`);',
    '  }',
    '  const svg = await node.exportAsync(exportSettings);',
    "  if (typeof svg !== 'string' || !svg.startsWith('<svg')) {",
    '    throw new Error(`clean SVG_STRING export failed for ${job.resource}`);',
    '  }',
    '  results.push({ ...job, svg });',
    '}',
    'return { batchId, expectedRevision, results };',
  ].join('\n');
}

export function validateReaderIconExportPlan(plan) {
  assert(plan?.kind === READER_ICON_EXPORT_PLAN_KIND, 'unexpected Reader icon export-plan kind');
  assert(plan?.schemaVersion === READER_ICON_EXPORT_PLAN_SCHEMA, 'unexpected Reader icon export-plan schema');
  assert(plan.fileKey === READER_FIGMA_FILE_KEY, 'Reader icon export plan belongs to a different Figma file');
  assert(plan.revision === READER_FIGMA_REVISION, 'Reader icon export plan is not pinned to the audited revision');
  assert(plan.revisionEvidence === READER_FIGMA_REVISION_EVIDENCE, 'Reader icon export plan has unexpected revision evidence');
  assert(plan.sourcePageId === READER_FIGMA_PAGE_ID, 'Reader icon export plan has unexpected source page');
  assert(plan.exportContract?.api === 'node.exportAsync', 'Reader icon plan must use node.exportAsync');
  assert(plan.exportContract?.format === 'SVG_STRING', 'Reader icon plan must use clean SVG_STRING export');
  assert(plan.exportContract?.screenshotsAllowed === false, 'screenshots must not be used as icon bytes');
  assert(plan.exportContract?.parentExportsAllowed === false, 'page/parent icon exports must remain forbidden');
  assert(plan.exportContract?.downloadWrapperAllowed === false, 'download wrapper exports must remain forbidden');

  const prohibited = new Set(PROHIBITED_READER_ICON_EXPORT_NODE_IDS);
  const semantics = new Set();
  const contextNodeIds = new Set();
  const exportNodeIds = new Set();
  const resources = new Set();
  const localFiles = new Set();
  let exportCount = 0;

  assert(Array.isArray(plan.bindings) && plan.bindings.length > 0, 'Reader icon plan has no bindings');
  for (const binding of plan.bindings) {
    assert(typeof binding.semantic === 'string' && binding.semantic.length > 0, 'Reader icon binding has no semantic');
    assert(!semantics.has(binding.semantic), `duplicate Reader icon semantic: ${binding.semantic}`);
    semantics.add(binding.semantic);
    assert(NODE_ID_PATTERN.test(binding.canonicalMasterNodeId), `${binding.semantic}: invalid canonical master node`);
    assert(Array.isArray(binding.contexts) && binding.contexts.length > 0, `${binding.semantic}: missing exact contexts`);

    const bindingContextIds = new Set();
    for (const item of binding.contexts) {
      assert(NODE_ID_PATTERN.test(item.nodeId), `${binding.semantic}: invalid context node`);
      assert(!prohibited.has(item.nodeId), `${binding.semantic}: page/parent node cannot be an icon context: ${item.nodeId}`);
      assert(!contextNodeIds.has(item.nodeId), `duplicate Reader icon context node: ${item.nodeId}`);
      contextNodeIds.add(item.nodeId);
      bindingContextIds.add(item.nodeId);
      assert(
        ALLOWED_EXPORT_NODE_ROLES.has(item.nodeRole),
        `${binding.semantic}: unsupported context node role ${item.nodeRole}`,
      );
    }

    assert(Array.isArray(binding.exports) && binding.exports.length > 0, `${binding.semantic}: missing export artifacts`);
    for (const entry of binding.exports) {
      exportCount += 1;
      assert(entry.revision === READER_FIGMA_REVISION, `${binding.semantic}/${entry.state}: revision drift`);
      assert(NODE_ID_PATTERN.test(entry.exportNodeId), `${binding.semantic}/${entry.state}: invalid export node`);
      assert(!prohibited.has(entry.exportNodeId), `${binding.semantic}/${entry.state}: page/parent export is forbidden`);
      assert(
        ALLOWED_EXPORT_NODE_ROLES.has(entry.exportNodeRole),
        `${binding.semantic}/${entry.state}: unsupported export node role ${entry.exportNodeRole}`,
      );
      if (entry.exportNodeRole === 'canonical-icon-master') {
        assert(
          entry.exportNodeId === binding.canonicalMasterNodeId,
          `${binding.semantic}/${entry.state}: canonical-master export does not match its binding`,
        );
      } else {
        assert(
          bindingContextIds.has(entry.exportNodeId),
          `${binding.semantic}/${entry.state}: export node is not an exact binding context`,
        );
      }
      assert(!exportNodeIds.has(entry.exportNodeId), `duplicate Reader icon export node: ${entry.exportNodeId}`);
      exportNodeIds.add(entry.exportNodeId);
      assert(typeof entry.resource === 'string' && entry.resource.startsWith('reader_control_'), `${binding.semantic}: invalid local resource`);
      assert(!resources.has(entry.resource), `duplicate Reader icon local resource: ${entry.resource}`);
      resources.add(entry.resource);
      assert(
        entry.localFile === `${LOCAL_MEDIA_PREFIX}${entry.resource}.svg`,
        `${entry.resource}: local file does not match the resource`,
      );
      assert(!localFiles.has(entry.localFile), `duplicate Reader icon local file: ${entry.localFile}`);
      localFiles.add(entry.localFile);
      assert(SHA256_PATTERN.test(entry.localSha256), `${entry.resource}: invalid local SHA-256`);
      assert(
        Number.isFinite(entry.expectedSize?.width) && entry.expectedSize.width > 0 &&
          Number.isFinite(entry.expectedSize?.height) && entry.expectedSize.height > 0,
        `${entry.resource}: invalid expected export size`,
      );
    }
  }

  assert(Array.isArray(plan.batches) && plan.batches.length > 0, 'Reader icon plan has no use_figma batches');
  const batchExportNodeIds = [];
  for (const batch of plan.batches) {
    assert(/^reader-icons-\d{2}$/.test(batch.id), `invalid Reader icon batch ID: ${batch.id}`);
    assert(batch.revision === READER_FIGMA_REVISION, `${batch.id}: revision drift`);
    assert(Array.isArray(batch.jobs) && batch.jobs.length > 0, `${batch.id}: no export jobs`);
    assert(batch.jobs.length <= READER_ICON_EXPORT_BATCH_SIZE, `${batch.id}: batch is too large`);
    assert(typeof batch.useFigmaCode === 'string' && batch.useFigmaCode.length > 0, `${batch.id}: missing use_figma code`);
    assert(batch.useFigmaCode.includes("node.exportAsync(exportSettings)"), `${batch.id}: missing clean exportAsync call`);
    assert(batch.useFigmaCode.includes("format\":\"SVG_STRING"), `${batch.id}: missing SVG_STRING contract`);
    assert(!batch.useFigmaCode.includes('screenshot'), `${batch.id}: screenshot export is forbidden`);
    assert(!batch.useFigmaCode.includes('download_assets'), `${batch.id}: download wrapper export is forbidden`);
    for (const job of batch.jobs) {
      assert(job.revision === READER_FIGMA_REVISION, `${batch.id}/${job.resource}: revision drift`);
      assert(!prohibited.has(job.exportNodeId), `${batch.id}/${job.resource}: page/parent export is forbidden`);
      batchExportNodeIds.push(job.exportNodeId);
    }
  }

  assert(batchExportNodeIds.length === exportCount, 'Reader icon batches do not cover every export exactly once');
  assert(
    JSON.stringify(batchExportNodeIds) === JSON.stringify([...exportNodeIds]),
    'Reader icon batch order differs from the deterministic binding order',
  );

  return {
    semanticCount: semantics.size,
    contextNodeCount: contextNodeIds.size,
    exportCount,
    batchCount: plan.batches.length,
    revision: plan.revision,
  };
}

export function buildReaderIconExportPlan() {
  const bindings = clone(READER_ICON_BINDINGS);
  const flattened = flattenArtifacts(bindings);
  const batches = [];
  for (let index = 0; index < flattened.length; index += READER_ICON_EXPORT_BATCH_SIZE) {
    const jobs = flattened.slice(index, index + READER_ICON_EXPORT_BATCH_SIZE);
    const id = `reader-icons-${String(batches.length + 1).padStart(2, '0')}`;
    batches.push({
      id,
      revision: READER_FIGMA_REVISION,
      jobs,
      useFigmaCode: buildUseFigmaProgram(id, jobs),
    });
  }

  const plan = {
    schemaVersion: READER_ICON_EXPORT_PLAN_SCHEMA,
    kind: READER_ICON_EXPORT_PLAN_KIND,
    fileKey: READER_FIGMA_FILE_KEY,
    revision: READER_FIGMA_REVISION,
    revisionEvidence: READER_FIGMA_REVISION_EVIDENCE,
    sourcePageId: READER_FIGMA_PAGE_ID,
    exportContract: {
      tool: 'use_figma',
      api: 'node.exportAsync',
      format: 'SVG_STRING',
      settings: clone(CLEAN_SVG_STRING_EXPORT_SETTINGS),
      screenshotsAllowed: false,
      parentExportsAllowed: false,
      downloadWrapperAllowed: false,
      writesFigma: false,
      writesLocalFiles: false,
      note: 'Execute one generated batch program at a time. Persisting returned SVG strings is a separate reviewed step.',
    },
    prohibitedExportNodeIds: [...PROHIBITED_READER_ICON_EXPORT_NODE_IDS],
    bindings,
    batches,
  };
  validateReaderIconExportPlan(plan);
  return plan;
}

export function serializeReaderIconExportPlan(plan = buildReaderIconExportPlan()) {
  validateReaderIconExportPlan(plan);
  return `${JSON.stringify(plan, null, 2)}\n`;
}
