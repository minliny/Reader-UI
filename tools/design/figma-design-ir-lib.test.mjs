import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FIGMA_DESIGN_IR_KIND,
  FIGMA_DESIGN_IR_NUMBER_PRECISION,
  FIGMA_DESIGN_IR_SCHEMA_VERSION,
  buildFigmaDesignIr,
  canonicalFigmaDesignIrJson,
} from './figma-design-ir-lib.mjs';

function bounds(x, y, width, height) {
  return { x, y, width, height };
}

function rectangle(overrides = {}) {
  return {
    id: '2:1',
    type: 'RECTANGLE',
    name: 'Card',
    absoluteBoundingBox: bounds(10, 20, 100, 60),
    ...overrides,
  };
}

function representativeDocument() {
  return {
    id: '1:1',
    type: 'FRAME',
    name: 'Settings / Phone',
    absoluteBoundingBox: bounds(100, 200, 390.0000004, 844.0000004),
    absoluteRenderBounds: bounds(98, 198, 394, 848),
    layoutMode: 'VERTICAL',
    primaryAxisSizingMode: 'FIXED',
    counterAxisSizingMode: 'FIXED',
    primaryAxisAlignItems: 'MIN',
    counterAxisAlignItems: 'CENTER',
    layoutSizingHorizontal: 'FIXED',
    layoutSizingVertical: 'FIXED',
    constraints: { horizontal: 'LEFT_RIGHT', vertical: 'TOP_BOTTOM' },
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
    itemSpacing: 8,
    fills: [{
      type: 'SOLID',
      color: { r: 0.99999999, g: 0.5, b: 0.25, a: 1 },
      opacity: 0.99999999,
    }],
    strokes: [{
      type: 'SOLID',
      color: { r: 0.2, g: 0.3, b: 0.4, a: 0.5 },
    }],
    strokeWeight: 1.00000001,
    strokeAlign: 'INSIDE',
    effects: [{
      type: 'DROP_SHADOW',
      visible: true,
      color: { r: 0, g: 0, b: 0, a: 0.16 },
      offset: { x: -0, y: 8.12345649 },
      radius: 26,
      spread: 0,
    }],
    cornerRadius: 12,
    opacity: 0.95,
    styles: { fill: 'S:fill', effect: 'S:effect' },
    boundVariables: { opacity: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' } },
    reactions: [{
      trigger: { type: 'ON_CLICK' },
      actions: [{ type: 'NODE', destinationId: '3:1', navigation: 'NAVIGATE' }],
    }],
    exportSettings: [{
      format: 'PNG',
      suffix: '@2x',
      constraint: { type: 'SCALE', value: 2 },
    }],
    children: [
      {
        id: '1:2',
        type: 'TEXT',
        name: 'Title',
        absoluteBoundingBox: bounds(120, 230, 220, 32),
        characters: '阅读设置',
        style: {
          fontFamily: 'Inter',
          fontPostScriptName: 'Inter-SemiBold',
          fontStyle: 'Semi Bold',
          fontWeight: 600,
          fontSize: 18.0000004,
          textAlignHorizontal: 'LEFT',
          textAlignVertical: 'CENTER',
          lineHeightUnit: 'PIXELS',
          lineHeightPx: 24.0000004,
          lineHeightPercent: 133.3333334,
          letterSpacing: { unit: 'PIXELS', value: 0.2500004 },
          fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }],
        },
        characterStyleOverrides: [0, 1],
        styleOverrideTable: {
          1: {
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: 18,
            lineHeightUnit: 'PIXELS',
            lineHeightPx: 24,
            letterSpacing: { unit: 'PIXELS', value: 0.25 },
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 } }],
          },
        },
        lineTypes: ['NONE'],
        lineIndentations: [0],
      },
      {
        id: '1:3',
        type: 'INSTANCE',
        name: 'Switch',
        absoluteBoundingBox: bounds(330, 226, 44, 28),
        relativeTransform: [[1, 0, 230.12345649], [0, 1, 26.0000004]],
        size: { x: 44.0000004, y: 28.0000004 },
        componentId: '9:9',
        componentProperties: {
          'State#1:0': { type: 'VARIANT', value: 'Selected' },
          'Label#1:1': { type: 'TEXT', value: '自动亮度' },
        },
        variantProperties: { State: 'Selected' },
        overrides: [{ id: '1:4', overriddenFields: ['characters'] }],
        fills: [],
      },
    ],
  };
}

test('builds a revision-bound IR with normalized visual, text, component and prototype fields', () => {
  const document = representativeDocument();
  const before = JSON.stringify(document);
  const ir = buildFigmaDesignIr({
    document,
    fileKey: 'file-key',
    revision: 'revision-42',
    rootId: '1:1',
  });

  assert.equal(JSON.stringify(document), before, 'normalization must not mutate the REST document');
  assert.equal(ir.kind, FIGMA_DESIGN_IR_KIND);
  assert.equal(ir.schemaVersion, FIGMA_DESIGN_IR_SCHEMA_VERSION);
  assert.equal(ir.numberPrecision, FIGMA_DESIGN_IR_NUMBER_PRECISION);
  assert.equal(ir.fileKey, 'file-key');
  assert.equal(ir.revision, 'revision-42');
  assert.match(ir.subtreeHash, /^[0-9a-f]{64}$/);
  assert.equal(ir.subtreeHash, ir.root.subtreeHash);

  assert.deepEqual(ir.root.relativeBounds, {
    x: 0,
    y: 0,
    width: 390,
    height: 844,
  });
  assert.deepEqual(ir.root.relativeRenderBounds, {
    x: -2,
    y: -2,
    width: 394,
    height: 848,
  });
  assert.equal(ir.root.layoutMode, 'VERTICAL');
  assert.deepEqual(ir.root.padding, {
    paddingTop: 12,
    paddingRight: 16,
    paddingBottom: 12,
    paddingLeft: 16,
  });
  assert.deepEqual(ir.root.gap, { itemSpacing: 8 });
  assert.equal(ir.root.fills[0].color.r, 1);
  assert.equal(ir.root.strokes.style.strokeWeight, 1);
  assert.equal(ir.root.effects[0].offset.x, 0);
  assert.equal(ir.root.effects[0].offset.y, 8.123456);
  assert.deepEqual(ir.root.radii, { uniform: 12, corners: null, smoothing: null });
  assert.equal(ir.root.opacity, 0.95);
  assert.equal(ir.root.visible, true);
  assert.deepEqual(Object.keys(ir.root.styleBindings.styles), ['effect', 'fill']);
  assert.equal(ir.root.reactions[0].actions[0].destinationId, '3:1');
  assert.equal(ir.root.exportSettings[0].constraint.value, 2);

  const title = ir.root.children[0];
  assert.deepEqual(title.relativeBounds, { x: 20, y: 30, width: 220, height: 32 });
  assert.equal(title.text.characters, '阅读设置');
  assert.deepEqual(title.font, {
    fontFamily: 'Inter',
    fontPostScriptName: 'Inter-SemiBold',
    fontStyle: 'Semi Bold',
    fontWeight: 600,
    fontSize: 18,
  });
  assert.deepEqual(title.lineHeight, {
    lineHeightUnit: 'PIXELS',
    lineHeightPx: 24,
    lineHeightPercent: 133.333333,
  });
  assert.deepEqual(title.letterSpacing, { unit: 'PIXELS', value: 0.25 });
  assert.equal(title.text.styleOverrideTable['1'].fills[0].type, 'SOLID');

  const instance = ir.root.children[1];
  assert.deepEqual(instance.relativeBounds, {
    x: 230.123456,
    y: 26,
    width: 44,
    height: 28,
    transform: [[1, 0, 230.123456], [0, 1, 26]],
  });
  assert.equal(instance.componentId, '9:9');
  assert.deepEqual(
    Object.keys(instance.componentProperties.values),
    ['Label#1:1', 'State#1:0'],
  );
  assert.deepEqual(instance.componentProperties.variants, { State: 'Selected' });
});

test('canonical map order and sub-rounding float noise produce byte-stable subtree hashes', () => {
  const left = representativeDocument();
  const right = representativeDocument();
  right.fills[0] = {
    opacity: 1.00000001,
    color: { a: 1, b: 0.25, g: 0.5, r: 1.00000001 },
    type: 'SOLID',
  };
  right.children[1].componentProperties = {
    'Label#1:1': { value: '自动亮度', type: 'TEXT' },
    'State#1:0': { value: 'Selected', type: 'VARIANT' },
  };
  right.children[0].style.fontSize = 18.00000049;

  const leftIr = buildFigmaDesignIr({
    document: left,
    fileKey: 'file-key',
    revision: 'rev-a',
  });
  const rightIr = buildFigmaDesignIr({
    document: right,
    fileKey: 'file-key',
    revision: 'rev-b',
  });
  assert.equal(leftIr.subtreeHash, rightIr.subtreeHash);
  assert.equal(
    canonicalFigmaDesignIrJson(leftIr.root),
    canonicalFigmaDesignIrJson(rightIr.root),
  );

  right.children.reverse();
  const reordered = buildFigmaDesignIr({
    document: right,
    fileKey: 'file-key',
    revision: 'rev-c',
  });
  assert.notEqual(
    leftIr.subtreeHash,
    reordered.subtreeHash,
    'children retain Figma z-order and are never sorted by ID',
  );
});

test('selects an exact descendant root and makes its bounds root-relative', () => {
  const document = {
    id: '0:0',
    type: 'DOCUMENT',
    name: 'Document',
    children: [{
      id: '0:1',
      type: 'CANVAS',
      name: 'Page',
      children: [{
        id: '5:1',
        type: 'COMPONENT',
        name: 'Canonical',
        absoluteBoundingBox: bounds(500, 700, 390, 844),
        children: [{
          id: '5:2',
          type: 'RECTANGLE',
          name: 'Paper',
          absoluteBoundingBox: bounds(516.12345649, 724.0000004, 350, 780),
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
        }],
      }],
    }],
  };
  const ir = buildFigmaDesignIr({
    document,
    fileKey: 'file-key',
    revision: 'rev',
    rootId: '5:1',
  });
  assert.equal(ir.root.id, '5:1');
  assert.deepEqual(ir.root.relativeBounds, { x: 0, y: 0, width: 390, height: 844 });
  assert.deepEqual(ir.root.children[0].relativeBounds, {
    x: 16.123456,
    y: 24,
    width: 350,
    height: 780,
  });
});

test('fails closed on visible unsupported node types or node fields but tolerates hidden source', () => {
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({ type: 'WIDGET' }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported node type WIDGET/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({ futureVisualField: { mode: 'magic' } }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported visible fields: futureVisualField/,
  );

  const hidden = buildFigmaDesignIr({
    document: rectangle({
      type: 'WIDGET',
      visible: false,
      futureVisualField: { mode: 'magic' },
    }),
    fileKey: 'file-key',
    revision: 'rev',
  });
  assert.equal(hidden.root.visible, false);
  assert.equal(hidden.root.hiddenUnsupportedSource.nodeType, 'WIDGET');
  assert.deepEqual(hidden.root.hiddenUnsupportedSource.fields.futureVisualField, { mode: 'magic' });
});

test('fails closed on visible unsupported paint types and fields while retaining hidden paints', () => {
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({ fills: [{ type: 'VIDEO', videoRef: 'video:1' }] }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported visible paint type VIDEO/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({
        fills: [{
          type: 'SOLID',
          color: { r: 1, g: 1, b: 1, a: 1 },
          futureCompositingField: 'DISPLAY_P3',
        }],
      }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported visible fields: futureCompositingField/,
  );

  const hiddenPaint = buildFigmaDesignIr({
    document: rectangle({
      fills: [{ type: 'VIDEO', visible: false, videoRef: 'video:1' }],
    }),
    fileKey: 'file-key',
    revision: 'rev',
  });
  assert.equal(hiddenPaint.root.fills[0].unsupported, true);
  assert.equal(hiddenPaint.root.fills[0].videoRef, 'video:1');
});

test('fails closed on visible unsupported effect types and fields while retaining hidden effects', () => {
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({ effects: [{ type: 'TEXTURE', radius: 4 }] }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported visible effect type TEXTURE/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({
        effects: [{ type: 'DROP_SHADOW', radius: 4, futureNoiseField: 0.5 }],
      }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /unsupported visible fields: futureNoiseField/,
  );

  const hiddenEffect = buildFigmaDesignIr({
    document: rectangle({
      effects: [{ type: 'TEXTURE', visible: false, density: 0.5 }],
    }),
    fileKey: 'file-key',
    revision: 'rev',
  });
  assert.equal(hiddenEffect.root.effects[0].unsupported, true);
  assert.equal(hiddenEffect.root.effects[0].density, 0.5);
});

test('fails closed on unsupported visible text style paints and style fields', () => {
  const text = {
    id: '8:1',
    type: 'TEXT',
    name: 'Mixed text',
    absoluteBoundingBox: bounds(0, 0, 100, 24),
    characters: 'Hello',
    style: {
      fontFamily: 'Inter',
      fontWeight: 400,
      fontSize: 16,
      lineHeightUnit: 'PIXELS',
      lineHeightPx: 24,
      letterSpacing: { unit: 'PIXELS', value: 0 },
      fills: [{ type: 'VIDEO', videoRef: 'video:1' }],
    },
  };
  assert.throws(
    () => buildFigmaDesignIr({ document: text, fileKey: 'file-key', revision: 'rev' }),
    /unsupported visible paint type VIDEO/,
  );
  text.style.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }];
  text.style.futureTypographyField = true;
  assert.throws(
    () => buildFigmaDesignIr({ document: text, fileKey: 'file-key', revision: 'rev' }),
    /unsupported visible fields: futureTypographyField/,
  );
});

test('rejects invalid provenance, missing roots, duplicate IDs, missing bounds and non-finite values', () => {
  assert.throws(
    () => buildFigmaDesignIr({ document: rectangle(), fileKey: '', revision: 'rev' }),
    /fileKey is required/,
  );
  assert.throws(
    () => buildFigmaDesignIr({ document: rectangle(), fileKey: 'file-key', revision: '' }),
    /revision is required/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle(),
      fileKey: 'file-key',
      revision: 'rev',
      rootId: 'missing',
    }),
    /rootId must use 123:456 syntax/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle(),
      fileKey: 'file-key',
      revision: 'rev',
      rootId: '9:9',
    }),
    /does not contain requested root 9:9/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: {
        ...rectangle({ type: 'FRAME' }),
        children: [
          rectangle({ id: '3:1', absoluteBoundingBox: bounds(0, 0, 10, 10) }),
          rectangle({ id: '3:1', absoluteBoundingBox: bounds(20, 0, 10, 10) }),
        ],
      },
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /duplicate Figma node id/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: { id: '7:1', type: 'RECTANGLE', name: 'No bounds' },
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /has no derivable bounds/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle({ opacity: Number.NaN }),
      fileKey: 'file-key',
      revision: 'rev',
    }),
    /opacity must be a finite number/,
  );
  assert.throws(
    () => buildFigmaDesignIr({
      document: rectangle(),
      fileKey: 'file-key',
      revision: 'rev',
      numberPrecision: 13,
    }),
    /numberPrecision/,
  );
});
