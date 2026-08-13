import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  assertSafeRelativePath,
  collectManifestGroups,
  resolveSafeRegularFile,
  sortPaths,
} from "./manifest-files.mjs";

export const RELEASE_MANIFEST_PATH = "UI_RELEASE_MANIFEST.json";
export const RELEASE_MANIFEST_SCHEMA_PATH = "ui-spec/ui-release-manifest.schema.json";

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function writeLength(hash, length) {
  const frame = Buffer.alloc(8);
  frame.writeBigUInt64BE(BigInt(length));
  hash.update(frame);
}

// Aggregate hashes are over length-framed UTF-8 paths and the original file
// bytes. They are not hashes of parsed/reformatted JSON, so whitespace and line
// ending changes remain release-significant and boundaries are unambiguous.
export function hashRawFileGroup(fileEntries) {
  const hash = crypto.createHash("sha256");
  for (const entry of fileEntries) {
    const pathBytes = Buffer.from(entry.path, "utf8");
    writeLength(hash, pathBytes.length);
    hash.update(pathBytes);
    writeLength(hash, entry.bytes.length);
    hash.update(entry.bytes);
  }
  return hash.digest("hex");
}

function readJsonBytes(bytes, label) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export const RELEASE_ABI_DEFINITIONS = Object.freeze([
  {
    name: "component-types",
    source: "contracts/view-state.schema.json",
    jsonPointer: "/$defs/Component/properties/type/enum",
  },
  {
    name: "core-commands",
    source: "contracts/core-command.schema.json",
    jsonPointer: "/properties/type/enum",
  },
  {
    name: "core-events",
    source: "contracts/core-event.schema.json",
    jsonPointer: "/properties/type/enum",
  },
  {
    name: "host-requests",
    source: "contracts/host-request.schema.json",
    jsonPointer: "/properties/type/enum",
  },
  {
    name: "motion-ids",
    source: "contracts/motion.schema.json",
    jsonPointer: "/properties/id/enum",
  },
  {
    name: "ui-events",
    source: "contracts/ui-event.schema.json",
    jsonPointer: "/properties/type/enum",
  },
]);

function resolveJsonPointer(document, pointer) {
  if (pointer === "") return document;
  if (!pointer.startsWith("/")) throw new Error(`invalid JSON pointer: ${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, segment) => value?.[segment], document);
}

function orderedStringArrayAbi(fileBytes, definition) {
  const schema = readJsonBytes(fileBytes.get(definition.source), definition.source);
  const values = resolveJsonPointer(schema, definition.jsonPointer);
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string")) {
    throw new Error(`${definition.source}${definition.jsonPointer} does not define a non-empty string array`);
  }
  if (new Set(values).size !== values.length) {
    throw new Error(`${definition.source}${definition.jsonPointer} contains duplicates`);
  }

  // Source order is ABI-significant: generated Kotlin enums expose ordinals
  // even though wire values remain strings. The newline fixes the canonical
  // serialization convention for independent consumer implementations.
  const canonicalBytes = Buffer.from(`${JSON.stringify(values)}\n`, "utf8");
  return {
    ...definition,
    entryCount: values.length,
    encoding: "ordered-json-array-utf8-lf",
    sha256: sha256(canonicalBytes),
  };
}

function releaseVersion(fileBytes) {
  const sourcePath = "contracts/VERSION.json";
  const versionDocument = readJsonBytes(fileBytes.get(sourcePath), sourcePath);
  const version = versionDocument?.version;
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    throw new Error(`${sourcePath} version must be a semantic version string`);
  }
  return version;
}

export function buildReleaseManifest(root) {
  const groups = collectManifestGroups(root);
  const allPaths = sortPaths(new Set(groups.flatMap((group) => group.files)));
  const fileBytes = new Map();

  for (const relativePath of allPaths) {
    const absolutePath = resolveSafeRegularFile(root, relativePath);
    fileBytes.set(relativePath, fs.readFileSync(absolutePath));
  }

  const files = allPaths.map((relativePath) => {
    const bytes = fileBytes.get(relativePath);
    return {
      path: relativePath,
      byteLength: bytes.length,
      sha256: sha256(bytes),
    };
  });

  const groupRecords = groups.map((group) => {
    const entries = group.files.map((relativePath) => ({ path: relativePath, bytes: fileBytes.get(relativePath) }));
    return {
      name: group.name,
      fileCount: entries.length,
      byteLength: entries.reduce((total, entry) => total + entry.bytes.length, 0),
      sha256: hashRawFileGroup(entries),
      files: group.files,
    };
  });

  return {
    $schema: RELEASE_MANIFEST_SCHEMA_PATH,
    schemaVersion: 1,
    version: releaseVersion(fileBytes),
    hashAlgorithm: "sha256",
    files,
    groups: groupRecords,
    abis: RELEASE_ABI_DEFINITIONS.map((definition) => orderedStringArrayAbi(fileBytes, definition)),
  };
}

export function serializeReleaseManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

function assertSortedUnique(values, label) {
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate values`);
  const sorted = sortPaths(values);
  const mismatch = values.findIndex((value, index) => value !== sorted[index]);
  if (mismatch !== -1) throw new Error(`${label} is not sorted in UTF-8 byte order at index ${mismatch}`);
}

export function assertReleaseManifestSafety(manifest) {
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new Error("release manifest must be an object");
  }
  if (!Array.isArray(manifest.files) || !Array.isArray(manifest.groups) || !Array.isArray(manifest.abis)) {
    throw new Error("release manifest files, groups, and abis must be arrays");
  }

  const filePaths = manifest.files.map((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("release manifest file entry must be an object");
    }
    return assertSafeRelativePath(entry.path);
  });
  assertSortedUnique(filePaths, "release manifest files");
  const knownFiles = new Set(filePaths);

  const groupNames = manifest.groups.map((group) => {
    if (group === null || typeof group !== "object" || !Array.isArray(group.files)) {
      throw new Error("release manifest group entry must contain a files array");
    }
    const paths = group.files.map(assertSafeRelativePath);
    assertSortedUnique(paths, `release manifest group ${group.name}`);
    for (const relativePath of paths) {
      if (!knownFiles.has(relativePath)) {
        throw new Error(`release manifest group ${group.name} references unknown file: ${relativePath}`);
      }
    }
    return group.name;
  });
  assertSortedUnique(groupNames, "release manifest groups");

  const abiNames = manifest.abis.map((abi) => {
    if (abi === null || typeof abi !== "object" || Array.isArray(abi)) {
      throw new Error("release manifest ABI entry must be an object");
    }
    const source = assertSafeRelativePath(abi.source);
    if (!knownFiles.has(source)) throw new Error(`release manifest ABI ${abi.name} references unknown file: ${source}`);
    return abi.name;
  });
  assertSortedUnique(abiNames, "release manifest ABIs");
}

function indexBy(entries, key) {
  return new Map(entries.map((entry) => [entry[key], entry]));
}

export function describeReleaseManifestDrift(expected, actual) {
  const messages = [];
  if (expected.version !== actual.version) messages.push(`version ${actual.version ?? "<missing>"} -> ${expected.version}`);

  const expectedFiles = indexBy(expected.files, "path");
  const actualFiles = indexBy(actual.files, "path");
  for (const relativePath of sortPaths(new Set([...expectedFiles.keys(), ...actualFiles.keys()]))) {
    const left = actualFiles.get(relativePath);
    const right = expectedFiles.get(relativePath);
    if (!left) messages.push(`file added: ${relativePath}`);
    else if (!right) messages.push(`file removed: ${relativePath}`);
    else if (left.byteLength !== right.byteLength || left.sha256 !== right.sha256) messages.push(`file changed: ${relativePath}`);
  }

  const expectedGroups = indexBy(expected.groups, "name");
  const actualGroups = indexBy(actual.groups, "name");
  for (const name of sortPaths(new Set([...expectedGroups.keys(), ...actualGroups.keys()]))) {
    const left = actualGroups.get(name);
    const right = expectedGroups.get(name);
    if (!left) messages.push(`group added: ${name}`);
    else if (!right) messages.push(`group removed: ${name}`);
    else if (left.sha256 !== right.sha256 || left.fileCount !== right.fileCount || left.byteLength !== right.byteLength) {
      messages.push(`group changed: ${name}`);
    }
  }

  const expectedAbis = indexBy(expected.abis, "name");
  const actualAbis = indexBy(actual.abis, "name");
  for (const name of sortPaths(new Set([...expectedAbis.keys(), ...actualAbis.keys()]))) {
    const left = actualAbis.get(name);
    const right = expectedAbis.get(name);
    if (!left) messages.push(`ABI added: ${name}`);
    else if (!right) messages.push(`ABI removed: ${name}`);
    else if (left.sha256 !== right.sha256 || left.entryCount !== right.entryCount) messages.push(`ABI changed: ${name}`);
  }
  return messages;
}

export function checkReleaseManifest(root, rawManifest) {
  let actual;
  try {
    actual = JSON.parse(rawManifest);
  } catch (error) {
    return { ok: false, messages: [`${RELEASE_MANIFEST_PATH} is invalid JSON: ${error.message}`] };
  }

  try {
    assertReleaseManifestSafety(actual);
  } catch (error) {
    return { ok: false, messages: [error instanceof Error ? error.message : String(error)] };
  }

  const expected = buildReleaseManifest(root);
  const expectedText = serializeReleaseManifest(expected);
  const canonicalActual = serializeReleaseManifest(actual);
  const messages = describeReleaseManifestDrift(expected, actual);
  if (rawManifest !== canonicalActual) messages.unshift(`${RELEASE_MANIFEST_PATH} is not canonical two-space JSON with LF`);
  if (canonicalActual !== expectedText && messages.length === 0) messages.push(`${RELEASE_MANIFEST_PATH} structure drifted`);
  return { ok: messages.length === 0, messages, expected, actual };
}

export function readCheckedReleaseManifest(root) {
  const manifestPath = path.join(root, RELEASE_MANIFEST_PATH);
  const rawManifest = fs.readFileSync(manifestPath, "utf8");
  return checkReleaseManifest(root, rawManifest);
}
