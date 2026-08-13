import crypto from 'node:crypto';

export const FIGMA_DESIGN_IR_KIND = 'FIGMA_DESIGN_IR';
export const FIGMA_DESIGN_IR_SCHEMA_VERSION = '1.0.0';
export const FIGMA_DESIGN_IR_NUMBER_PRECISION = 6;

const NODE_ID_PATTERN = /^\d+:\d+$/;

// B0 intentionally admits only Design-file nodes that have an explicit ArkUI
// representation plan. A later extractor extension must name a new type here
// before a visible node of that type can enter the generated visual contract.
const SUPPORTED_NODE_TYPES = new Set([
  'DOCUMENT',
  'CANVAS',
  'SECTION',
  'FRAME',
  'GROUP',
  'COMPONENT',
  'COMPONENT_SET',
  'INSTANCE',
  'TEXT',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'RECTANGLE',
  'ELLIPSE',
  'LINE',
  'REGULAR_POLYGON',
  'STAR',
  'SLICE',
]);

const CONTAINER_NODE_TYPES = new Set([
  'DOCUMENT',
  'CANVAS',
]);

const SUPPORTED_PAINT_TYPES = new Set([
  'SOLID',
  'GRADIENT_LINEAR',
  'GRADIENT_RADIAL',
  'GRADIENT_ANGULAR',
  'GRADIENT_DIAMOND',
  'IMAGE',
]);

const SUPPORTED_EFFECT_TYPES = new Set([
  'DROP_SHADOW',
  'INNER_SHADOW',
  'LAYER_BLUR',
  'BACKGROUND_BLUR',
]);

const NODE_FIELDS = new Set([
  'id',
  'type',
  'name',
  'visible',
  'opacity',
  'children',
  'absoluteBoundingBox',
  'absoluteRenderBounds',
  'relativeTransform',
  'size',
  'rotation',
  'layoutMode',
  'layoutWrap',
  'primaryAxisSizingMode',
  'counterAxisSizingMode',
  'primaryAxisAlignItems',
  'counterAxisAlignItems',
  'counterAxisAlignContent',
  'layoutSizingHorizontal',
  'layoutSizingVertical',
  'layoutAlign',
  'layoutGrow',
  'layoutPositioning',
  'minWidth',
  'maxWidth',
  'minHeight',
  'maxHeight',
  'width',
  'height',
  'preserveRatio',
  'targetAspectRatio',
  'constraints',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'itemSpacing',
  'counterAxisSpacing',
  'itemReverseZIndex',
  'strokesIncludedInLayout',
  'clipsContent',
  'overflowDirection',
  'numberOfFixedChildren',
  'scrollBehavior',
  'isFixed',
  'fixedPosition',
  'fills',
  'background',
  'backgroundColor',
  'strokes',
  'strokeWeight',
  'strokeAlign',
  'strokeCap',
  'strokeJoin',
  'strokeDashes',
  'dashPattern',
  'strokeMiterAngle',
  'strokeMiterLimit',
  'individualStrokeWeights',
  'strokeTopWeight',
  'strokeRightWeight',
  'strokeBottomWeight',
  'strokeLeftWeight',
  'effects',
  'cornerRadius',
  'rectangleCornerRadii',
  'cornerSmoothing',
  'blendMode',
  'isMask',
  'maskType',
  'isMaskOutline',
  'characters',
  'style',
  'characterStyleOverrides',
  'styleOverrideTable',
  'lineTypes',
  'lineIndentations',
  'textTruncation',
  'maxLines',
  'hasMissingFont',
  'componentId',
  'componentProperties',
  'componentPropertyDefinitions',
  'componentPropertyReferences',
  'variantProperties',
  'overrides',
  'isExposedInstance',
  'exposedInstances',
  'reactions',
  'interactions',
  'transitionNodeID',
  'transitionDuration',
  'transitionEasing',
  'prototypeStartNodeID',
  'flowStartingPoints',
  'prototypeDevice',
  'overlayPositionType',
  'overlayBackground',
  'overlayBackgroundInteraction',
  'exportSettings',
  'styles',
  'boundVariables',
  'explicitVariableModes',
  'resolvedVariableModes',
  'layoutGrids',
  'gridStyleId',
  'fillOverrideTable',
  'fillGeometry',
  'strokeGeometry',
  'vectorPaths',
  'vectorNetwork',
  'handleMirroring',
  'arcData',
  'booleanOperation',
  'pointCount',
  'innerRadius',
  'sectionContentsHidden',
  'accessibilityRole',
  'accessibilityLabel',
  // Provenance and editor metadata are intentionally non-rendering. They are
  // accepted but excluded from subtreeHash so comments or library publication
  // metadata cannot masquerade as a visual delta.
  'description',
  'descriptionMarkdown',
  'documentationLinks',
  'remote',
  'key',
  'isAsset',
  'locked',
  'devStatus',
  'annotations',
]);

const NON_RENDERING_NODE_FIELDS = new Set([
  'description',
  'descriptionMarkdown',
  'documentationLinks',
  'remote',
  'key',
  'isAsset',
  'locked',
  'devStatus',
  'annotations',
]);

const PAINT_FIELDS = new Set([
  'type',
  'visible',
  'opacity',
  'blendMode',
  'color',
  'gradientHandlePositions',
  'gradientStops',
  'scaleMode',
  'imageRef',
  'gifRef',
  'imageTransform',
  'scalingFactor',
  'rotation',
  'filters',
  'boundVariables',
]);

const EFFECT_FIELDS = new Set([
  'type',
  'visible',
  'radius',
  'color',
  'blendMode',
  'offset',
  'spread',
  'showShadowBehindNode',
  'boundVariables',
]);

const TEXT_STYLE_FIELDS = new Set([
  'fontFamily',
  'fontPostScriptName',
  'fontStyle',
  'fontWeight',
  'fontSize',
  'italic',
  'textAlignHorizontal',
  'textAlignVertical',
  'textAutoResize',
  'textCase',
  'textDecoration',
  'paragraphIndent',
  'paragraphSpacing',
  'paragraphListSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
  'hyperlink',
  'opentypeFlags',
  'fills',
  'letterSpacing',
  'lineHeightPx',
  'lineHeightPercent',
  'lineHeightPercentFontSize',
  'lineHeightUnit',
  'boundVariables',
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizedNumber(value, precision, label) {
  assert(typeof value === 'number' && Number.isFinite(value), `${label} must be a finite number`);
  const factor = 10 ** precision;
  const result = Math.round(value * factor) / factor;
  return Object.is(result, -0) ? 0 : result;
}

function normalizeJson(value, precision, label) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return normalizedNumber(value, precision, label);
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeJson(item, precision, `${label}[${index}]`));
  }
  assert(isPlainObject(value), `${label} must contain only JSON values`);
  const result = {};
  for (const key of Object.keys(value).sort()) {
    const item = value[key];
    assert(item !== undefined, `${label}.${key} must not be undefined`);
    result[key] = normalizeJson(item, precision, `${label}.${key}`);
  }
  return result;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!isPlainObject(value)) return value;
  const result = {};
  for (const key of Object.keys(value).sort()) result[key] = stableValue(value[key]);
  return result;
}

export function canonicalFigmaDesignIrJson(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(canonicalFigmaDesignIrJson(value)).digest('hex');
}

function validateExactFields(value, supportedFields, effectiveVisible, label) {
  const unsupported = Object.keys(value).filter((key) => !supportedFields.has(key)).sort();
  if (effectiveVisible) {
    assert(unsupported.length === 0, `${label} has unsupported visible fields: ${unsupported.join(', ')}`);
  }
  return unsupported;
}

function optionalJsonObject(source, keys, precision, label) {
  const result = {};
  for (const key of keys) {
    if (source[key] !== undefined) result[key] = normalizeJson(source[key], precision, `${label}.${key}`);
  }
  return Object.keys(result).length > 0 ? result : null;
}

function numericRectangle(value, precision, label) {
  if (value === null || value === undefined) return null;
  assert(isPlainObject(value), `${label} must be an object`);
  for (const key of ['x', 'y', 'width', 'height']) {
    assert(typeof value[key] === 'number' && Number.isFinite(value[key]), `${label}.${key} must be a finite number`);
  }
  return {
    x: normalizedNumber(value.x, precision, `${label}.x`),
    y: normalizedNumber(value.y, precision, `${label}.y`),
    width: normalizedNumber(value.width, precision, `${label}.width`),
    height: normalizedNumber(value.height, precision, `${label}.height`),
  };
}

function normalizedTransform(value, precision, label) {
  if (value === null || value === undefined) return null;
  assert(
    Array.isArray(value) &&
      value.length === 2 &&
      value.every((row) => Array.isArray(row) && row.length === 3),
    `${label} must be a 2x3 matrix`,
  );
  return value.map((row, rowIndex) =>
    row.map((item, columnIndex) =>
      normalizedNumber(item, precision, `${label}[${rowIndex}][${columnIndex}]`),
    ),
  );
}

function deriveRelativeBounds(node, parentAbsoluteBounds, isRoot, precision, effectiveVisible) {
  const absolute = numericRectangle(
    node.absoluteBoundingBox,
    precision,
    `${node.id}.absoluteBoundingBox`,
  );
  const transform = normalizedTransform(
    node.relativeTransform,
    precision,
    `${node.id}.relativeTransform`,
  );
  const size = node.size === undefined
    ? null
    : optionalJsonObject(node.size, ['x', 'y'], precision, `${node.id}.size`);

  if (!absolute && !size) {
    assert(
      !effectiveVisible || CONTAINER_NODE_TYPES.has(node.type),
      `visible Figma node ${node.id} (${node.type}) has no derivable bounds`,
    );
    return null;
  }

  const width = size?.x ?? absolute?.width;
  const height = size?.y ?? absolute?.height;
  let x = 0;
  let y = 0;
  if (!isRoot) {
    if (transform) {
      x = transform[0][2];
      y = transform[1][2];
    } else if (absolute && parentAbsoluteBounds) {
      x = normalizedNumber(
        absolute.x - parentAbsoluteBounds.x,
        precision,
        `${node.id}.relativeBounds.x`,
      );
      y = normalizedNumber(
        absolute.y - parentAbsoluteBounds.y,
        precision,
        `${node.id}.relativeBounds.y`,
      );
    } else if (absolute) {
      x = absolute.x;
      y = absolute.y;
    }
  }

  return {
    x: normalizedNumber(x, precision, `${node.id}.relativeBounds.x`),
    y: normalizedNumber(y, precision, `${node.id}.relativeBounds.y`),
    width: normalizedNumber(width, precision, `${node.id}.relativeBounds.width`),
    height: normalizedNumber(height, precision, `${node.id}.relativeBounds.height`),
    ...(transform ? { transform } : {}),
    ...(node.rotation !== undefined
      ? { rotation: normalizedNumber(node.rotation, precision, `${node.id}.rotation`) }
      : {}),
  };
}

function relativeRectangle(value, parentAbsoluteBounds, rootAbsoluteBounds, precision, label) {
  const absolute = numericRectangle(value, precision, label);
  if (!absolute) return null;
  const origin = parentAbsoluteBounds || rootAbsoluteBounds;
  return {
    x: normalizedNumber(absolute.x - (origin?.x || 0), precision, `${label}.relativeX`),
    y: normalizedNumber(absolute.y - (origin?.y || 0), precision, `${label}.relativeY`),
    width: absolute.width,
    height: absolute.height,
  };
}

function normalizePaint(paint, precision, effectiveVisible, label) {
  assert(isPlainObject(paint), `${label} must be an object`);
  const visible = paint.visible !== false;
  const paintIsVisible = effectiveVisible && visible;

  if (!SUPPORTED_PAINT_TYPES.has(paint.type)) {
    assert(!paintIsVisible, `${label} has unsupported visible paint type ${paint.type || '<missing>'}`);
    return {
      ...normalizeJson(paint, precision, label),
      unsupported: true,
    };
  }
  validateExactFields(paint, PAINT_FIELDS, paintIsVisible, label);

  const result = {
    type: paint.type,
    visible,
    opacity: paint.opacity === undefined
      ? 1
      : normalizedNumber(paint.opacity, precision, `${label}.opacity`),
  };
  for (const key of [
    'blendMode',
    'color',
    'gradientHandlePositions',
    'gradientStops',
    'scaleMode',
    'imageRef',
    'gifRef',
    'imageTransform',
    'scalingFactor',
    'rotation',
    'filters',
    'boundVariables',
  ]) {
    if (paint[key] !== undefined) {
      result[key] = normalizeJson(paint[key], precision, `${label}.${key}`);
    }
  }
  return result;
}

function normalizePaintArray(value, precision, effectiveVisible, label) {
  if (value === undefined || value === null) return [];
  assert(Array.isArray(value), `${label} must be an array`);
  // Paint order is rendering order and must never be sorted by ID/type.
  return value.map((paint, index) =>
    normalizePaint(paint, precision, effectiveVisible, `${label}[${index}]`),
  );
}

function normalizeEffect(effect, precision, effectiveVisible, label) {
  assert(isPlainObject(effect), `${label} must be an object`);
  const visible = effect.visible !== false;
  const effectIsVisible = effectiveVisible && visible;

  if (!SUPPORTED_EFFECT_TYPES.has(effect.type)) {
    assert(!effectIsVisible, `${label} has unsupported visible effect type ${effect.type || '<missing>'}`);
    return {
      ...normalizeJson(effect, precision, label),
      unsupported: true,
    };
  }
  validateExactFields(effect, EFFECT_FIELDS, effectIsVisible, label);

  const result = {
    type: effect.type,
    visible,
  };
  for (const key of [
    'radius',
    'color',
    'blendMode',
    'offset',
    'spread',
    'showShadowBehindNode',
    'boundVariables',
  ]) {
    if (effect[key] !== undefined) {
      result[key] = normalizeJson(effect[key], precision, `${label}.${key}`);
    }
  }
  return result;
}

function normalizeEffectArray(value, precision, effectiveVisible, label) {
  if (value === undefined || value === null) return [];
  assert(Array.isArray(value), `${label} must be an array`);
  // Effect order is part of Figma paint composition.
  return value.map((effect, index) =>
    normalizeEffect(effect, precision, effectiveVisible, `${label}[${index}]`),
  );
}

function normalizeTextStyle(style, precision, effectiveVisible, label) {
  if (style === undefined || style === null) return null;
  assert(isPlainObject(style), `${label} must be an object`);
  validateExactFields(style, TEXT_STYLE_FIELDS, effectiveVisible, label);
  const result = {};
  for (const key of Object.keys(style).sort()) {
    if (key === 'fills') {
      result.fills = normalizePaintArray(style.fills, precision, effectiveVisible, `${label}.fills`);
    } else {
      result[key] = normalizeJson(style[key], precision, `${label}.${key}`);
    }
  }
  return result;
}

function normalizeText(node, precision, effectiveVisible) {
  const hasText = node.type === 'TEXT' || node.characters !== undefined || node.style !== undefined;
  if (!hasText) {
    return {
      text: null,
      font: null,
      lineHeight: null,
      letterSpacing: null,
    };
  }

  assert(
    typeof node.characters === 'string' || !effectiveVisible,
    `visible text node ${node.id} must have characters`,
  );
  const style = normalizeTextStyle(node.style, precision, effectiveVisible, `${node.id}.style`);
  const overrideTable = {};
  if (node.styleOverrideTable !== undefined) {
    assert(isPlainObject(node.styleOverrideTable), `${node.id}.styleOverrideTable must be an object`);
    for (const key of Object.keys(node.styleOverrideTable).sort()) {
      overrideTable[key] = normalizeTextStyle(
        node.styleOverrideTable[key],
        precision,
        effectiveVisible,
        `${node.id}.styleOverrideTable.${key}`,
      );
    }
  }

  const font = style
    ? optionalJsonObject(style, [
      'fontFamily',
      'fontPostScriptName',
      'fontStyle',
      'fontWeight',
      'fontSize',
      'italic',
    ], precision, `${node.id}.font`)
    : null;
  const lineHeight = style
    ? optionalJsonObject(style, [
      'lineHeightUnit',
      'lineHeightPx',
      'lineHeightPercent',
      'lineHeightPercentFontSize',
    ], precision, `${node.id}.lineHeight`)
    : null;
  const letterSpacing = style?.letterSpacing === undefined
    ? null
    : normalizeJson(style.letterSpacing, precision, `${node.id}.letterSpacing`);

  return {
    text: {
      characters: typeof node.characters === 'string' ? node.characters : '',
      style,
      characterStyleOverrides: node.characterStyleOverrides === undefined
        ? []
        : normalizeJson(
          node.characterStyleOverrides,
          precision,
          `${node.id}.characterStyleOverrides`,
        ),
      styleOverrideTable: overrideTable,
      lineTypes: node.lineTypes === undefined
        ? []
        : normalizeJson(node.lineTypes, precision, `${node.id}.lineTypes`),
      lineIndentations: node.lineIndentations === undefined
        ? []
        : normalizeJson(node.lineIndentations, precision, `${node.id}.lineIndentations`),
      textTruncation: node.textTruncation ?? null,
      maxLines: node.maxLines === undefined
        ? null
        : normalizeJson(node.maxLines, precision, `${node.id}.maxLines`),
      hasMissingFont: node.hasMissingFont === true,
    },
    font,
    lineHeight,
    letterSpacing,
  };
}

function normalizeStrokes(node, precision, effectiveVisible) {
  return {
    paints: normalizePaintArray(node.strokes, precision, effectiveVisible, `${node.id}.strokes`),
    style: optionalJsonObject(node, [
      'strokeWeight',
      'strokeAlign',
      'strokeCap',
      'strokeJoin',
      'strokeDashes',
      'dashPattern',
      'strokeMiterAngle',
      'strokeMiterLimit',
      'individualStrokeWeights',
      'strokeTopWeight',
      'strokeRightWeight',
      'strokeBottomWeight',
      'strokeLeftWeight',
    ], precision, `${node.id}.strokeStyle`),
  };
}

function normalizeRadii(node, precision) {
  if (
    node.cornerRadius === undefined &&
    node.rectangleCornerRadii === undefined &&
    node.cornerSmoothing === undefined
  ) return null;
  if (node.cornerRadius !== undefined) {
    assert(
      typeof node.cornerRadius === 'number',
      `${node.id}.cornerRadius must be numeric; mixed radii require rectangleCornerRadii`,
    );
  }
  if (node.rectangleCornerRadii !== undefined) {
    assert(
      Array.isArray(node.rectangleCornerRadii) && node.rectangleCornerRadii.length === 4,
      `${node.id}.rectangleCornerRadii must contain four values`,
    );
  }
  return {
    uniform: node.cornerRadius === undefined
      ? null
      : normalizedNumber(node.cornerRadius, precision, `${node.id}.cornerRadius`),
    corners: node.rectangleCornerRadii === undefined
      ? null
      : node.rectangleCornerRadii.map((value, index) =>
        normalizedNumber(value, precision, `${node.id}.rectangleCornerRadii[${index}]`),
      ),
    smoothing: node.cornerSmoothing === undefined
      ? null
      : normalizedNumber(node.cornerSmoothing, precision, `${node.id}.cornerSmoothing`),
  };
}

function normalizeMap(value, precision, label) {
  if (value === undefined) return {};
  assert(isPlainObject(value), `${label} must be an object`);
  return normalizeJson(value, precision, label);
}

function normalizeComponentProperties(node, precision) {
  const values = normalizeMap(
    node.componentProperties,
    precision,
    `${node.id}.componentProperties`,
  );
  const definitions = normalizeMap(
    node.componentPropertyDefinitions,
    precision,
    `${node.id}.componentPropertyDefinitions`,
  );
  const variants = normalizeMap(
    node.variantProperties,
    precision,
    `${node.id}.variantProperties`,
  );
  assert(node.overrides === undefined || Array.isArray(node.overrides), `${node.id}.overrides must be an array`);
  const overrides = normalizeJson(node.overrides ?? [], precision, `${node.id}.overrides`);
  const references = normalizeMap(
    node.componentPropertyReferences,
    precision,
    `${node.id}.componentPropertyReferences`,
  );
  if (
    Object.keys(values).length === 0 &&
    Object.keys(definitions).length === 0 &&
    Object.keys(variants).length === 0 &&
    overrides.length === 0 &&
    Object.keys(references).length === 0
  ) {
    return null;
  }
  return { values, definitions, variants, overrides, references };
}

function normalizeFillOverrideTable(node, precision, effectiveVisible) {
  if (node.fillOverrideTable === undefined) return null;
  assert(isPlainObject(node.fillOverrideTable), `${node.id}.fillOverrideTable must be an object`);
  const result = {};
  for (const key of Object.keys(node.fillOverrideTable).sort()) {
    result[key] = normalizePaint(
      node.fillOverrideTable[key],
      precision,
      effectiveVisible,
      `${node.id}.fillOverrideTable.${key}`,
    );
  }
  return result;
}

function normalizePrototype(node, precision, effectiveVisible) {
  const result = optionalJsonObject(node, [
    'transitionNodeID',
    'transitionDuration',
    'transitionEasing',
    'prototypeStartNodeID',
    'flowStartingPoints',
    'prototypeDevice',
    'overlayPositionType',
    'overlayBackgroundInteraction',
  ], precision, `${node.id}.prototype`) || {};
  if (node.overlayBackground !== undefined) {
    result.overlayBackground = normalizePaint(
      node.overlayBackground,
      precision,
      effectiveVisible,
      `${node.id}.overlayBackground`,
    );
  }
  return Object.keys(result).length > 0 ? result : null;
}

function renderingSupplement(node, precision) {
  return optionalJsonObject(node, [
    'blendMode',
    'clipsContent',
    'backgroundColor',
    'itemReverseZIndex',
    'strokesIncludedInLayout',
    'overflowDirection',
    'numberOfFixedChildren',
    'scrollBehavior',
    'isFixed',
    'fixedPosition',
    'preserveRatio',
    'targetAspectRatio',
    'isExposedInstance',
    'exposedInstances',
    'layoutGrids',
    'gridStyleId',
    'sectionContentsHidden',
    'accessibilityRole',
    'accessibilityLabel',
  ], precision, `${node.id}.rendering`);
}

function normalizeNode({
  node,
  parentAbsoluteBounds,
  rootAbsoluteBounds,
  isRoot,
  inheritedVisible,
  precision,
  seenNodeIds,
}) {
  assert(isPlainObject(node), 'Figma node must be an object');
  assert(typeof node.id === 'string' && NODE_ID_PATTERN.test(node.id), 'Figma node id must use 123:456 syntax');
  assert(!seenNodeIds.has(node.id), `duplicate Figma node id in subtree: ${node.id}`);
  seenNodeIds.add(node.id);
  assert(typeof node.type === 'string' && node.type.length > 0, `${node.id}: node type is required`);
  assert(typeof node.name === 'string', `${node.id}: node name is required`);

  const visible = node.visible !== false;
  const effectiveVisible = inheritedVisible && visible;
  const supportedNodeType = SUPPORTED_NODE_TYPES.has(node.type);
  assert(
    supportedNodeType || !effectiveVisible,
    `visible Figma node ${node.id} has unsupported node type ${node.type}`,
  );
  const unsupportedFields = validateExactFields(
    node,
    NODE_FIELDS,
    effectiveVisible,
    `Figma node ${node.id} (${node.type})`,
  );

  const absoluteBounds = numericRectangle(
    node.absoluteBoundingBox,
    precision,
    `${node.id}.absoluteBoundingBox`,
  );
  const relativeBounds = deriveRelativeBounds(
    node,
    parentAbsoluteBounds,
    isRoot,
    precision,
    effectiveVisible,
  );
  const relativeRenderBounds = relativeRectangle(
    node.absoluteRenderBounds,
    isRoot ? rootAbsoluteBounds : parentAbsoluteBounds,
    rootAbsoluteBounds,
    precision,
    `${node.id}.absoluteRenderBounds`,
  );

  const children = node.children === undefined ? [] : node.children;
  assert(Array.isArray(children), `${node.id}.children must be an array`);
  // Child order is the Figma z-order. Determinism comes from preserving this
  // source order and canonicalizing maps, never by sorting children by ID.
  const normalizedChildren = children.map((child) =>
    normalizeNode({
      node: child,
      parentAbsoluteBounds: absoluteBounds || parentAbsoluteBounds,
      rootAbsoluteBounds,
      isRoot: false,
      inheritedVisible: effectiveVisible,
      precision,
      seenNodeIds,
    }),
  );

  const textFields = normalizeText(node, precision, effectiveVisible);
  const normalized = {
    id: node.id,
    type: node.type,
    name: node.name,
    relativeBounds,
    relativeRenderBounds,
    layoutMode: node.layoutMode ?? null,
    sizing: optionalJsonObject(node, [
      'primaryAxisSizingMode',
      'counterAxisSizingMode',
      'primaryAxisAlignItems',
      'counterAxisAlignItems',
      'counterAxisAlignContent',
      'layoutSizingHorizontal',
      'layoutSizingVertical',
      'layoutAlign',
      'layoutGrow',
      'layoutPositioning',
      'layoutWrap',
      'minWidth',
      'maxWidth',
      'minHeight',
      'maxHeight',
      'width',
      'height',
    ], precision, `${node.id}.sizing`),
    constraints: node.constraints === undefined
      ? null
      : normalizeJson(node.constraints, precision, `${node.id}.constraints`),
    padding: optionalJsonObject(node, [
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
    ], precision, `${node.id}.padding`),
    gap: optionalJsonObject(node, [
      'itemSpacing',
      'counterAxisSpacing',
    ], precision, `${node.id}.gap`),
    fills: normalizePaintArray(node.fills, precision, effectiveVisible, `${node.id}.fills`),
    background: {
      paints: normalizePaintArray(
        node.background,
        precision,
        effectiveVisible,
        `${node.id}.background`,
      ),
      color: node.backgroundColor === undefined
        ? null
        : normalizeJson(node.backgroundColor, precision, `${node.id}.backgroundColor`),
    },
    strokes: normalizeStrokes(node, precision, effectiveVisible),
    effects: normalizeEffectArray(node.effects, precision, effectiveVisible, `${node.id}.effects`),
    radii: normalizeRadii(node, precision),
    opacity: node.opacity === undefined
      ? 1
      : normalizedNumber(node.opacity, precision, `${node.id}.opacity`),
    visible,
    ...textFields,
    componentId: node.componentId ?? null,
    componentProperties: normalizeComponentProperties(node, precision),
    reactions: normalizeJson(
      node.reactions ?? node.interactions ?? [],
      precision,
      `${node.id}.reactions`,
    ),
    exportSettings: normalizeJson(
      node.exportSettings ?? [],
      precision,
      `${node.id}.exportSettings`,
    ),
    rendering: renderingSupplement(node, precision),
    mask: optionalJsonObject(node, [
      'isMask',
      'maskType',
      'isMaskOutline',
    ], precision, `${node.id}.mask`),
    styleBindings: optionalJsonObject(node, [
      'styles',
      'boundVariables',
      'explicitVariableModes',
      'resolvedVariableModes',
    ], precision, `${node.id}.styleBindings`),
    geometry: optionalJsonObject(node, [
      'fillGeometry',
      'strokeGeometry',
      'vectorPaths',
      'vectorNetwork',
      'handleMirroring',
      'arcData',
      'booleanOperation',
      'pointCount',
      'innerRadius',
    ], precision, `${node.id}.geometry`),
    fillOverrideTable: normalizeFillOverrideTable(node, precision, effectiveVisible),
    prototype: normalizePrototype(node, precision, effectiveVisible),
    children: normalizedChildren,
  };

  if (!effectiveVisible && (!supportedNodeType || unsupportedFields.length > 0)) {
    normalized.hiddenUnsupportedSource = {
      ...(supportedNodeType ? {} : { nodeType: node.type }),
      fields: Object.fromEntries(
        Object.keys(node)
          .filter((key) => !NODE_FIELDS.has(key) && !NON_RENDERING_NODE_FIELDS.has(key))
          .sort()
          .map((key) => [
            key,
            normalizeJson(node[key], precision, `${node.id}.${key}`),
          ]),
      ),
    };
  }

  const subtreeHash = sha256(normalized);
  return {
    ...normalized,
    subtreeHash,
  };
}

function findNodeAndAncestors(document, rootId) {
  const visit = (node, ancestors) => {
    if (!isPlainObject(node)) return null;
    if (node.id === rootId) return { node, ancestors };
    if (!Array.isArray(node.children)) return null;
    for (const child of node.children) {
      const found = visit(child, [...ancestors, node]);
      if (found) return found;
    }
    return null;
  };
  return visit(document, []);
}

/**
 * Build a deterministic, revision-bound Figma Design IR from a REST node
 * document already obtained by the caller. This function performs no I/O and
 * no network access.
 */
export function buildFigmaDesignIr({
  document,
  fileKey,
  revision,
  rootId = document?.id,
  numberPrecision = FIGMA_DESIGN_IR_NUMBER_PRECISION,
}) {
  assert(isPlainObject(document), 'document must be a Figma REST node document object');
  assert(typeof fileKey === 'string' && fileKey.trim().length > 0, 'fileKey is required');
  assert(typeof revision === 'string' && revision.trim().length > 0, 'revision is required');
  assert(typeof rootId === 'string' && NODE_ID_PATTERN.test(rootId), 'rootId must use 123:456 syntax');
  assert(
    Number.isInteger(numberPrecision) && numberPrecision >= 0 && numberPrecision <= 12,
    'numberPrecision must be an integer from 0 through 12',
  );

  const found = findNodeAndAncestors(document, rootId);
  assert(found, `Figma document does not contain requested root ${rootId}`);
  const rootAbsoluteBounds = numericRectangle(
    found.node.absoluteBoundingBox,
    numberPrecision,
    `${rootId}.absoluteBoundingBox`,
  );
  const root = normalizeNode({
    node: found.node,
    parentAbsoluteBounds: null,
    rootAbsoluteBounds,
    isRoot: true,
    inheritedVisible: found.ancestors.every((ancestor) => ancestor.visible !== false),
    precision: numberPrecision,
    seenNodeIds: new Set(),
  });

  return {
    kind: FIGMA_DESIGN_IR_KIND,
    schemaVersion: FIGMA_DESIGN_IR_SCHEMA_VERSION,
    fileKey: fileKey.trim(),
    revision: revision.trim(),
    rootId,
    numberPrecision,
    subtreeHash: root.subtreeHash,
    root,
  };
}
