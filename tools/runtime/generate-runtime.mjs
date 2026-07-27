#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const spec = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.json"), "utf8"));
const payloadContractSpec = JSON.parse(
  fs.readFileSync(path.join(root, "ui-spec", "runtime-payload-contracts.json"), "utf8")
);
const payloadFixtures = JSON.parse(
  fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-payload-contract.fixtures.json"), "utf8")
);
const resultFixtures = JSON.parse(
  fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-result-contract.fixtures.json"), "utf8")
);
const checkOnly = process.argv.includes("--check");

function ensure(file) { fs.mkdirSync(path.dirname(file), { recursive: true }); }
function quoted(value) { return JSON.stringify(value); }
function optional(value, fallback) { return value === undefined ? fallback : value; }

function resolvePayloadSchema(node, stack = []) {
  if (node && typeof node === "object" && !Array.isArray(node) && node.$ref) {
    const prefix = "#/definitions/";
    if (!node.$ref.startsWith(prefix)) throw new Error(`Unsupported payload schema ref ${node.$ref}`);
    const name = node.$ref.slice(prefix.length);
    if (stack.includes(name)) throw new Error(`Cyclic payload schema ref ${[...stack, name].join(" -> ")}`);
    const target = payloadContractSpec.definitions[name];
    if (!target) throw new Error(`Unknown payload schema ref ${node.$ref}`);
    const resolved = resolvePayloadSchema(target, [...stack, name]);
    return node.nullable === true ? { ...resolved, nullable: true } : resolved;
  }
  if (Array.isArray(node)) return node.map((item) => resolvePayloadSchema(item, stack));
  if (node && typeof node === "object") {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, resolvePayloadSchema(value, stack)]));
  }
  return node;
}

const actionByEvent = new Map(spec.actions.map((action) => [action.event, action]));
const resolvedPayloadContracts = payloadContractSpec.contracts.map((contract) => {
  const action = actionByEvent.get(contract.event);
  const dispatchTarget = contract.dispatchTarget;
  const operation = dispatchTarget === "core" ? contract.coreCommand : contract.runtimeOperation;
  const actualDescriptor = action ? { action: action.action, coreSequence: action.coreSequence || [] } : null;
  if (actualDescriptor && action.value !== undefined) actualDescriptor.value = action.value;
  if (actualDescriptor && action.hostRequest !== undefined) actualDescriptor.hostRequest = action.hostRequest;
  if (!operation || JSON.stringify(actualDescriptor) !== JSON.stringify(contract.descriptor)) {
    throw new Error(`Typed payload contract does not exactly match runtime action ${contract.event}`);
  }
  const resultSchemas = contract.resultSchemas.map((item) => ({
    ...item,
    schema: resolvePayloadSchema(item.schema)
  }));
  if (new Set(resultSchemas.map((item) => item.effectType)).size !== resultSchemas.length) {
    throw new Error(`Typed result contract has duplicate effect types for ${contract.event}`);
  }
  return { ...contract, dispatchTarget, operation, payloadSchema: resolvePayloadSchema(contract.payloadSchema), resultSchemas };
});
const payloadEventSet = new Set(resolvedPayloadContracts.map((contract) => contract.event));
if (payloadEventSet.size !== spec.actions.length || payloadEventSet.size !== payloadContractSpec.contracts.length) {
  throw new Error(`Typed payload coverage must exactly match all ${spec.actions.length} runtime actions`);
}
for (const fixture of payloadFixtures) {
  if (!payloadEventSet.has(fixture.event)) throw new Error(`Fixture ${fixture.id} references an untyped event`);
}
const resultSchemaKeys = new Set(resolvedPayloadContracts.flatMap((contract) =>
  contract.resultSchemas.map((item) => `${contract.event}\u0000${item.effectType}`)
));
for (const fixture of resultFixtures) {
  if (!resultSchemaKeys.has(`${fixture.event}\u0000${fixture.effectType}`)) {
    throw new Error(`Result fixture ${fixture.id} references an undeclared event/effect pair`);
  }
}

const generatedContractByEvent = Object.fromEntries(resolvedPayloadContracts.map((contract) => [
  contract.event,
  {
    dispatchTarget: contract.dispatchTarget,
    operation: contract.operation,
    descriptorAction: contract.descriptor.action,
    ...(contract.descriptor.value === undefined ? {} : { descriptorValue: contract.descriptor.value }),
    descriptorCoreSequence: contract.descriptor.coreSequence,
    ...(contract.descriptor.hostRequest === undefined ? {} : { descriptorHostRequest: contract.descriptor.hostRequest }),
    schema: contract.payloadSchema,
    resultSchemas: Object.fromEntries(contract.resultSchemas.map((item) => [
      item.effectType,
      { effectKind: item.effectKind, schema: item.schema }
    ]))
  }
]));

function encodedChunks(value, maximum = 4096) {
  const encoded = JSON.stringify(value);
  const chunks = [];
  for (let offset = 0; offset < encoded.length; offset += maximum) {
    chunks.push(encoded.slice(offset, offset + maximum));
  }
  return chunks;
}

function swiftJSONValue(value) {
  if (value === null) return ".null";
  if (typeof value === "string") return `.string(${quoted(value)})`;
  if (typeof value === "boolean") return `.bool(${value})`;
  if (typeof value === "number") return `.number(${Number.isInteger(value) ? `${value}.0` : value})`;
  if (Array.isArray(value)) return `.array([${value.map(swiftJSONValue).join(", ")}])`;
  const rows = Object.keys(value).sort().map((key) => `${quoted(key)}: ${swiftJSONValue(value[key])}`);
  if (rows.length === 0) return ".object([:])";
  return `.object([${rows.join(", ")}])`;
}

function swiftJSONPayload(value) {
  const rows = Object.keys(value).sort().map((key) => `${quoted(key)}: ${swiftJSONValue(value[key])}`);
  return rows.length === 0 ? "[:]" : `[${rows.join(", ")}]`;
}

function swift() {
  const rows = spec.actions.map((a) => {
    const required = optional(a.requiredPayload, []).map(quoted).join(", ");
    const guards = optional(a.guards, []).map(quoted).join(", ");
    const core = optional(a.coreSequence, []).map(quoted).join(", ");
    return `        ${quoted(a.event)}: RuntimeActionDescriptor(action: ${quoted(a.action)}, value: ${a.value === undefined ? "nil" : quoted(a.value)}, requiredPayload: [${required}], guards: [${guards}], coreSequence: [${core}], hostRequest: ${a.hostRequest === undefined ? "nil" : quoted(a.hostRequest)})`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport Foundation\n\npublic struct RuntimeActionDescriptor: Sendable, Equatable {\n    public let action: String\n    public let value: String?\n    public let requiredPayload: [String]\n    public let guards: [String]\n    public let coreSequence: [String]\n    public let hostRequest: String?\n}\n\npublic enum GeneratedRuntimeActions {\n    public static let schemaVersion = ${spec.schemaVersion}\n    public static let byEvent: [String: RuntimeActionDescriptor] = [\n${rows.join(",\n")}\n    ]\n}\n`;
}

function kotlin() {
  const rows = spec.actions.map((a) => {
    const required = optional(a.requiredPayload, []).map(quoted).join(", ");
    const guards = optional(a.guards, []).map(quoted).join(", ");
    const core = optional(a.coreSequence, []).map(quoted).join(", ");
    return `        ${quoted(a.event)} to RuntimeActionDescriptor(${quoted(a.action)}, ${a.value === undefined ? "null" : quoted(a.value)}, listOf(${required}), listOf(${guards}), listOf(${core}), ${a.hostRequest === undefined ? "null" : quoted(a.hostRequest)})`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\npackage io.reader.ui.runtime\n\ndata class RuntimeActionDescriptor(\n    val action: String,\n    val value: String?,\n    val requiredPayload: List<String>,\n    val guards: List<String>,\n    val coreSequence: List<String>,\n    val hostRequest: String?\n)\n\nobject GeneratedRuntimeActions {\n    const val schemaVersion: Int = ${spec.schemaVersion}\n    val byEvent: Map<String, RuntimeActionDescriptor> = mapOf(\n${rows.join(",\n")}\n    )\n}\n`;
}

function arkts() {
  const rows = spec.actions.map((a) => `  ${quoted(a.event)}: { action: ${quoted(a.action)}, value: ${a.value === undefined ? "undefined" : quoted(a.value)}, requiredPayload: ${JSON.stringify(optional(a.requiredPayload, []))}, guards: ${JSON.stringify(optional(a.guards, []))}, coreSequence: ${JSON.stringify(optional(a.coreSequence, []))}, hostRequest: ${a.hostRequest === undefined ? "undefined" : quoted(a.hostRequest)} }`);
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nexport interface RuntimeActionDescriptor {\n  action: string;\n  value?: string;\n  requiredPayload: string[];\n  guards: string[];\n  coreSequence: string[];\n  hostRequest?: string;\n}\n\nexport const RUNTIME_ACTION_SCHEMA_VERSION: number = ${spec.schemaVersion};\nexport const GENERATED_RUNTIME_ACTIONS: Record<string, RuntimeActionDescriptor> = {\n${rows.join(",\n")}\n};\n`;
}

function referencePayloadContracts() {
  const byEvent = Object.fromEntries(Object.entries(generatedContractByEvent).map(([event, contract]) => [
    event,
    {
      ...contract,
      descriptor: {
        action: contract.descriptorAction,
        coreSequence: contract.descriptorCoreSequence,
        ...(contract.descriptorValue === undefined ? {} : { value: contract.descriptorValue }),
        ...(contract.descriptorHostRequest === undefined ? {} : { hostRequest: contract.descriptorHostRequest })
      }
    }
  ]));
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nexport const RUNTIME_TYPED_PAYLOAD_SCHEMA_VERSION = ${payloadContractSpec.schemaVersion};\nexport const GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS = Object.freeze(${JSON.stringify(byEvent, null, 2)});\n`;
}

function swiftPayloadContracts() {
  const chunks = encodedChunks(generatedContractByEvent).map((chunk) => `        ${quoted(chunk)}`).join(",\n");
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport Foundation\n\nprivate struct GeneratedWireTypedResultContract: Decodable {\n    let effectKind: String\n    let schema: ReaderUIJSONValue\n}\n\nprivate struct GeneratedWireTypedPayloadContract: Decodable {\n    let dispatchTarget: String\n    let operation: String\n    let descriptorAction: String\n    let descriptorValue: String?\n    let descriptorCoreSequence: [String]\n    let descriptorHostRequest: String?\n    let schema: ReaderUIJSONValue\n    let resultSchemas: [String: GeneratedWireTypedResultContract]\n}\n\npublic enum GeneratedRuntimeTypedPayloadContracts {\n    public static let schemaVersion = ${payloadContractSpec.schemaVersion}\n    private static let encodedChunks: [String] = [\n${chunks}\n    ]\n    public static let byEvent: [String: ReaderUITypedPayloadContract] = {\n        let data = Data(encodedChunks.joined().utf8)\n        guard let decoded = try? JSONDecoder().decode([String: GeneratedWireTypedPayloadContract].self, from: data) else {\n            preconditionFailure("Generated typed runtime contract JSON is invalid")\n        }\n        return decoded.mapValues { contract in\n            ReaderUITypedPayloadContract(\n                dispatchTarget: contract.dispatchTarget,\n                operation: contract.operation,\n                descriptorAction: contract.descriptorAction,\n                descriptorValue: contract.descriptorValue,\n                descriptorCoreSequence: contract.descriptorCoreSequence,\n                descriptorHostRequest: contract.descriptorHostRequest,\n                schema: contract.schema,\n                resultSchemas: contract.resultSchemas.mapValues { result in\n                    ReaderUITypedResultContract(effectKind: result.effectKind, schema: result.schema)\n                }\n            )\n        }\n    }()\n}\n`;
}

function kotlinPayloadContracts() {
  const chunks = encodedChunks(generatedContractByEvent).map((chunk) => `        ${quoted(chunk)}`).join(",\n");
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\npackage io.reader.ui.runtime\n\nimport kotlinx.serialization.json.Json\nimport kotlinx.serialization.json.JsonNull\nimport kotlinx.serialization.json.jsonArray\nimport kotlinx.serialization.json.jsonObject\nimport kotlinx.serialization.json.jsonPrimitive\n\nobject GeneratedRuntimeTypedPayloadContracts {\n    const val schemaVersion: Int = ${payloadContractSpec.schemaVersion}\n    private val encodedChunks: List<String> = listOf(\n${chunks}\n    )\n    val byEvent: Map<String, ReaderUITypedPayloadContract> =\n        Json.parseToJsonElement(encodedChunks.joinToString(separator = "")).jsonObject.mapValues { (_, element) ->\n            val contract = element.jsonObject\n            ReaderUITypedPayloadContract(\n                dispatchTarget = contract.getValue("dispatchTarget").jsonPrimitive.content,\n                operation = contract.getValue("operation").jsonPrimitive.content,\n                descriptorAction = contract.getValue("descriptorAction").jsonPrimitive.content,\n                descriptorValue = contract["descriptorValue"]?.takeUnless { it is JsonNull }?.jsonPrimitive?.content,\n                descriptorCoreSequence = contract.getValue("descriptorCoreSequence").jsonArray.map { it.jsonPrimitive.content },\n                descriptorHostRequest = contract["descriptorHostRequest"]?.takeUnless { it is JsonNull }?.jsonPrimitive?.content,\n                schema = contract.getValue("schema"),\n                resultSchemas = contract.getValue("resultSchemas").jsonObject.mapValues { (_, resultElement) ->\n                    val result = resultElement.jsonObject\n                    ReaderUITypedResultContract(\n                        effectKind = result.getValue("effectKind").jsonPrimitive.content,\n                        schema = result.getValue("schema")\n                    )\n                }\n            )\n        }\n}\n`;
}

function arktsPayloadContracts() {
  const chunks = encodedChunks(generatedContractByEvent).map((chunk) => `  ${quoted(chunk)}`).join(",\n");
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nexport interface GeneratedRuntimeTypedResultContract {\n  effectKind: string\n  schema: object\n}\n\nexport interface GeneratedRuntimeTypedPayloadContract {\n  dispatchTarget: string\n  operation: string\n  descriptorAction: string\n  descriptorValue?: string\n  descriptorCoreSequence: string[]\n  descriptorHostRequest?: string\n  schema: object\n  resultSchemas: Record<string, GeneratedRuntimeTypedResultContract>\n}\n\nconst GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACT_CHUNKS: string[] = [\n${chunks}\n]\n\nexport const RUNTIME_TYPED_PAYLOAD_SCHEMA_VERSION: number = ${payloadContractSpec.schemaVersion}\nexport const GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS: Record<string, GeneratedRuntimeTypedPayloadContract> =\n  JSON.parse(GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACT_CHUNKS.join('')) as Record<string, GeneratedRuntimeTypedPayloadContract>\n`;
}

function swiftPayloadFixtures() {
  const rows = payloadFixtures.map((fixture) =>
    `    RuntimeTypedPayloadFixture(id: ${quoted(fixture.id)}, event: ${quoted(fixture.event)}, valid: ${fixture.valid}, payload: ${swiftJSONPayload(fixture.payload)})`
  );
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport ReaderUIRuntime\n\nstruct RuntimeTypedPayloadFixture {\n    let id: String\n    let event: String\n    let valid: Bool\n    let payload: ReaderUIJSONPayload\n}\n\nlet GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES: [RuntimeTypedPayloadFixture] = [\n${rows.join(",\n")}\n]\n`;
}

function kotlinPayloadFixtures() {
  const rows = payloadFixtures.map((fixture) => {
    const payload = JSON.stringify(fixture.payload);
    return `    RuntimeTypedPayloadFixture(${quoted(fixture.id)}, ${quoted(fixture.event)}, ${fixture.valid}, Json.parseToJsonElement(${quoted(payload)}).jsonObject)`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\npackage io.reader.ui.runtime\n\nimport kotlinx.serialization.json.Json\nimport kotlinx.serialization.json.jsonObject\n\ndata class RuntimeTypedPayloadFixture(\n    val id: String,\n    val event: String,\n    val valid: Boolean,\n    val payload: ReaderUIJSONPayload\n)\n\nval GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES: List<RuntimeTypedPayloadFixture> = listOf(\n${rows.join(",\n")}\n)\n`;
}

function arktsPayloadFixtures() {
  const rows = payloadFixtures.map((fixture) => {
    const payload = quoted(JSON.stringify(fixture.payload));
    return `  { id: ${quoted(fixture.id)}, event: ${quoted(fixture.event)}, valid: ${fixture.valid}, payload: JSON.parse(${payload}) as ReaderUIJSONPayload }`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport { ReaderUIJSONPayload } from '../main/ets/ReaderUIRuntime'\n\nexport interface RuntimeTypedPayloadFixture {\n  id: string\n  event: string\n  valid: boolean\n  payload: ReaderUIJSONPayload\n}\n\nexport const GENERATED_RUNTIME_TYPED_PAYLOAD_FIXTURES: RuntimeTypedPayloadFixture[] = [\n${rows.join(",\n")}\n]\n`;
}

function swiftResultFixtures() {
  const rows = resultFixtures.map((fixture) =>
    `    RuntimeTypedResultFixture(id: ${quoted(fixture.id)}, event: ${quoted(fixture.event)}, effectType: ${quoted(fixture.effectType)}, valid: ${fixture.valid}, result: ${swiftJSONPayload(fixture.result)})`
  );
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport ReaderUIRuntime\n\nstruct RuntimeTypedResultFixture {\n    let id: String\n    let event: String\n    let effectType: String\n    let valid: Bool\n    let result: ReaderUIJSONResult\n}\n\nlet GENERATED_RUNTIME_TYPED_RESULT_FIXTURES: [RuntimeTypedResultFixture] = [\n${rows.join(",\n")}\n]\n`;
}

function kotlinResultFixtures() {
  const rows = resultFixtures.map((fixture) => {
    const result = JSON.stringify(fixture.result);
    return `    RuntimeTypedResultFixture(${quoted(fixture.id)}, ${quoted(fixture.event)}, ${quoted(fixture.effectType)}, ${fixture.valid}, Json.parseToJsonElement(${quoted(result)}).jsonObject)`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\npackage io.reader.ui.runtime\n\nimport kotlinx.serialization.json.Json\nimport kotlinx.serialization.json.jsonObject\n\ndata class RuntimeTypedResultFixture(\n    val id: String,\n    val event: String,\n    val effectType: String,\n    val valid: Boolean,\n    val result: ReaderUIJSONResult\n)\n\nval GENERATED_RUNTIME_TYPED_RESULT_FIXTURES: List<RuntimeTypedResultFixture> = listOf(\n${rows.join(",\n")}\n)\n`;
}

function arktsResultFixtures() {
  const rows = resultFixtures.map((fixture) => {
    const result = quoted(JSON.stringify(fixture.result));
    return `  { id: ${quoted(fixture.id)}, event: ${quoted(fixture.event)}, effectType: ${quoted(fixture.effectType)}, valid: ${fixture.valid}, result: JSON.parse(${result}) as ReaderUIJSONResult }`;
  });
  return `// AUTO-GENERATED by tools/runtime/generate-runtime.mjs. DO NOT EDIT.\nimport { ReaderUIJSONResult } from '../main/ets/ReaderUIRuntime'\n\nexport interface RuntimeTypedResultFixture {\n  id: string\n  event: string\n  effectType: string\n  valid: boolean\n  result: ReaderUIJSONResult\n}\n\nexport const GENERATED_RUNTIME_TYPED_RESULT_FIXTURES: RuntimeTypedResultFixture[] = [\n${rows.join(",\n")}\n]\n`;
}

const outputs = [
  [path.join(root, "packages", "swift", "ReaderUIRuntime", "Sources", "ReaderUIRuntime", "GeneratedRuntimeActions.swift"), swift()],
  [path.join(root, "packages", "kotlin", "reader-ui-runtime", "src", "main", "kotlin", "io", "reader", "ui", "runtime", "GeneratedRuntimeActions.kt"), kotlin()],
  [path.join(root, "packages", "arkts", "reader-ui-runtime", "src", "main", "ets", "GeneratedRuntimeActions.ets"), arkts()],
  [path.join(root, "packages", "reference", "generated-runtime-payload-contracts.mjs"), referencePayloadContracts()],
  [path.join(root, "packages", "swift", "ReaderUIRuntime", "Sources", "ReaderUIRuntime", "GeneratedRuntimeTypedPayloadContracts.swift"), swiftPayloadContracts()],
  [path.join(root, "packages", "kotlin", "reader-ui-runtime", "src", "main", "kotlin", "io", "reader", "ui", "runtime", "GeneratedRuntimeTypedPayloadContracts.kt"), kotlinPayloadContracts()],
  [path.join(root, "packages", "arkts", "reader-ui-runtime", "src", "main", "ets", "GeneratedRuntimeTypedPayloadContracts.ets"), arktsPayloadContracts()],
  [path.join(root, "packages", "swift", "ReaderUIRuntime", "Tests", "ReaderUIRuntimeTests", "GeneratedRuntimeTypedPayloadFixtures.swift"), swiftPayloadFixtures()],
  [path.join(root, "packages", "swift", "ReaderUIRuntime", "Tests", "ReaderUIRuntimeTests", "GeneratedRuntimeTypedResultFixtures.swift"), swiftResultFixtures()],
  [path.join(root, "packages", "kotlin", "reader-ui-runtime", "src", "test", "kotlin", "io", "reader", "ui", "runtime", "GeneratedRuntimeTypedPayloadFixtures.kt"), kotlinPayloadFixtures()],
  [path.join(root, "packages", "kotlin", "reader-ui-runtime", "src", "test", "kotlin", "io", "reader", "ui", "runtime", "GeneratedRuntimeTypedResultFixtures.kt"), kotlinResultFixtures()],
  [path.join(root, "packages", "arkts", "reader-ui-runtime", "src", "test", "GeneratedRuntimeTypedPayloadFixtures.ets"), arktsPayloadFixtures()],
  [path.join(root, "packages", "arkts", "reader-ui-runtime", "src", "test", "GeneratedRuntimeTypedResultFixtures.ets"), arktsResultFixtures()]
];
const drift = [];
for (const [file, content] of outputs) {
  if (checkOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content) drift.push(path.relative(root, file));
  } else {
    ensure(file);
    fs.writeFileSync(file, content);
  }
}
if (drift.length > 0) {
  console.error(`[runtime-codegen] drift:\n${drift.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`[runtime-codegen] ${checkOnly ? "check" : "write"} actions=${spec.actions.length} typedPayloads=${resolvedPayloadContracts.length} payloadFixtures=${payloadFixtures.length} resultMappings=${resultSchemaKeys.size} resultFixtures=${resultFixtures.length} schemaVersion=${spec.schemaVersion}`);
}
