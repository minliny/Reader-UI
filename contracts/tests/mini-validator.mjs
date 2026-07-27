// JSON Schema 2020-12 validator used by contract tests and fixture gates.
//
// Keep this module's small validate/assertValid/registerSchema API so existing
// tests stay focused on contract semantics, while delegating the actual schema
// language to Ajv. The previous hand-written subset silently ignored oneOf,
// allOf and if/then/else, which could make discriminated DTO schemas look green
// without enforcing their branches.
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const schemaRegistry = new Map();
let ajv = createAjv();
let validatorCache = new WeakMap();

function createAjv() {
  const instance = new Ajv2020({
    allErrors: true,
    allowUnionTypes: true,
    strict: true,
    validateFormats: true,
  });
  addFormats(instance);
  // state-rule.schema.json embeds the executable rule catalog beside the
  // validation vocabulary. Treat that project-specific field as an explicit
  // annotation; every other unknown keyword remains a strict-mode error.
  instance.addKeyword({ keyword: "rules", schemaType: "array", valid: true });
  return instance;
}

function rebuildAjv() {
  ajv = createAjv();
  validatorCache = new WeakMap();

  const registeredObjects = new Set();
  for (const [name, schema] of schemaRegistry.entries()) {
    if (registeredObjects.has(schema)) continue;
    registeredObjects.add(schema);

    // The filename alias supports legacy relative refs such as
    // motion.schema.json#/$defs/MotionId. Ajv also registers schema.$id, so
    // standards-compliant absolute resolution works at the same time.
    ajv.addSchema(schema, name === schema.$id ? undefined : name);
  }
}

export function registerSchema(name, schema) {
  schemaRegistry.set(name, schema);
  if (schema && schema.$id) schemaRegistry.set(schema.$id, schema);
  rebuildAjv();
}

export function registerSchemas(obj) {
  for (const [name, schema] of Object.entries(obj)) {
    schemaRegistry.set(name, schema);
    if (schema && schema.$id) schemaRegistry.set(schema.$id, schema);
  }
  rebuildAjv();
}

function stripFixtureComments(value) {
  if (Array.isArray(value)) return value.map(stripFixtureComments);
  if (value === null || typeof value !== "object") return value;

  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "_comment") continue;
    result[key] = stripFixtureComments(child);
  }
  return result;
}

function validatorFor(schema) {
  if (validatorCache.has(schema)) return validatorCache.get(schema);

  let compiled = schema?.$id ? ajv.getSchema(schema.$id) : undefined;
  if (!compiled) compiled = ajv.compile(schema);
  validatorCache.set(schema, compiled);
  return compiled;
}

function pointerPath(instancePath, fallbackPath) {
  if (!instancePath) return fallbackPath;
  const parts = instancePath
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  return parts.reduce(
    (path, part) => (/^(0|[1-9][0-9]*)$/.test(part) ? `${path}[${part}]` : `${path}.${part}`),
    fallbackPath,
  );
}

export function validate(schema, data, _root = schema, path = "$") {
  if (schema == null) return [];

  try {
    const compiled = validatorFor(schema);
    if (compiled(stripFixtureComments(data))) return [];
    return (compiled.errors ?? []).map((error) => ({
      path: pointerPath(error.instancePath, path),
      message: error.message ?? error.keyword,
      keyword: error.keyword,
      schemaPath: error.schemaPath,
      params: error.params,
    }));
  } catch (error) {
    return [{
      path,
      message: `schema 编译失败: ${error instanceof Error ? error.message : String(error)}`,
      keyword: "schema",
    }];
  }
}

export function assertValid(schema, data, label) {
  const errors = validate(schema, data);
  if (errors.length > 0) {
    const msg = errors.map((error) => `${error.path}: ${error.message}`).join("\n  - ");
    throw new Error(`[${label}] 校验失败：\n  - ${msg}`);
  }
}
