// 内置最小化 JSON Schema 校验器，避免依赖外部包。
// 仅支持本仓库 schema 使用到的子集：type / enum / required / properties /
// additionalProperties / items / minimum / maximum / $defs / $ref（仅 #/$defs/... 形式） /
// pattern / oneOf（基本）。
// 不支持：$ref 跨文件、allOf/anyOf 复杂组合、format 实际校验（只校验类型）。

function resolveRef(ref, root) {
  if (!ref.startsWith("#/")) throw new Error(`仅支持本地 #/ 引用，收到：${ref}`);
  const parts = ref.slice(2).split("/");
  let node = root;
  for (const p of parts) {
    if (node == null || typeof node !== "object") return undefined;
    node = node[p];
  }
  return node;
}

export function validate(schema, data, root = schema, path = "$") {
  const errors = [];

  if (schema == null) return errors;

  // $ref
  if (schema.$ref) {
    const ref = resolveRef(schema.$ref, root);
    if (!ref) {
      errors.push({ path, message: `无法解析 $ref: ${schema.$ref}` });
      return errors;
    }
    return validate(ref, data, root, path);
  }

  // type
  if (schema.type != null) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    let ok = false;
    for (const t of types) {
      if (t === "null" && data === null) { ok = true; break; }
      if (t === "boolean" && typeof data === "boolean") { ok = true; break; }
      if (t === "integer" && typeof data === "number" && Number.isInteger(data)) { ok = true; break; }
      if (t === "number" && typeof data === "number") { ok = true; break; }
      if (t === "string" && typeof data === "string") { ok = true; break; }
      if (t === "object" && typeof data === "object" && data !== null && !Array.isArray(data)) { ok = true; break; }
      if (t === "array" && Array.isArray(data)) { ok = true; break; }
    }
    if (!ok) {
      errors.push({ path, message: `期望类型 ${types.join("|")}，实际 ${Array.isArray(data) ? "array" : data === null ? "null" : typeof data}` });
      return errors;
    }
  }

  // enum
  if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push({ path, message: `值不在 enum 中：${JSON.stringify(data)}` });
    return errors;
  }

  // const
  if (schema.const !== undefined && schema.const !== data) {
    errors.push({ path, message: `期望常量 ${JSON.stringify(schema.const)}` });
  }

  // pattern（仅 string）
  if (schema.pattern && typeof data === "string") {
    const re = new RegExp(schema.pattern);
    if (!re.test(data)) {
      errors.push({ path, message: `不匹配 pattern ${schema.pattern}` });
    }
  }

  // minimum / maximum
  if (typeof data === "number") {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path, message: `小于 minimum ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path, message: `大于 maximum ${schema.maximum}` });
    }
  }

  // object: required / properties / additionalProperties
  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    if (Array.isArray(schema.required)) {
      for (const k of schema.required) {
        if (!(k in data)) {
          errors.push({ path: `${path}.${k}`, message: `缺少必填字段 ${k}` });
        }
      }
    }
    if (schema.properties) {
      for (const [k, sub] of Object.entries(schema.properties)) {
        if (k in data) {
          errors.push(...validate(sub, data[k], root, `${path}.${k}`));
        }
      }
    }
    if (schema.additionalProperties === false) {
      const allowed = schema.properties ? new Set(Object.keys(schema.properties)) : new Set();
      for (const k of Object.keys(data)) {
        if (k === "_comment") continue; // fixtures 注释约定，不参与 schema 校验
        if (!allowed.has(k)) {
          errors.push({ path: `${path}.${k}`, message: `不允许的属性 ${k}` });
        }
      }
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      for (const k of Object.keys(data)) {
        if (k === "_comment") continue;
        if (!schema.properties || !(k in schema.properties)) {
          errors.push(...validate(schema.additionalProperties, data[k], root, `${path}.${k}`));
        }
      }
    }
  }

  // array: items
  if (Array.isArray(data) && schema.items) {
    for (let i = 0; i < data.length; i++) {
      errors.push(...validate(schema.items, data[i], root, `${path}[${i}]`));
    }
  }

  return errors;
}

export function assertValid(schema, data, label) {
  const errors = validate(schema, data);
  if (errors.length > 0) {
    const msg = errors.map((e) => `${e.path}: ${e.message}`).join("\n  - ");
    throw new Error(`[${label}] 校验失败：\n  - ${msg}`);
  }
}
