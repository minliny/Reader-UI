import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertValid } from "./mini-validator.mjs";
import { assertSafeRelativePath, sortPaths } from "../../tools/release/manifest-files.mjs";
import {
  assertReleaseManifestSafety,
  buildReleaseManifest,
  checkReleaseManifest,
  describeReleaseManifestDrift,
  hashRawFileGroup,
  RELEASE_ABI_DEFINITIONS,
  serializeReleaseManifest,
} from "../../tools/release/manifest-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const manifestPath = path.join(root, "UI_RELEASE_MANIFEST.json");
const schema = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "ui-release-manifest.schema.json"), "utf8"));
const rawManifest = fs.readFileSync(manifestPath, "utf8");
const manifest = JSON.parse(rawManifest);

function sha256(bytes) {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function copyManifestInputs() {
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reader-ui-release-manifest-"));
  for (const entry of manifest.files) {
    const source = path.join(root, ...entry.path.split("/"));
    const destination = path.join(temporaryRoot, ...entry.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }
  return temporaryRoot;
}

test("release manifest passes schema and exactly matches current repository bytes", () => {
  assertValid(schema, manifest, "UI_RELEASE_MANIFEST.json");
  assertReleaseManifestSafety(manifest);
  assert.equal(rawManifest, serializeReleaseManifest(manifest));
  assert.deepEqual(manifest, buildReleaseManifest(root));
});

test("release manifest files and groups are sorted, complete, and raw-byte hashed", () => {
  const filePaths = manifest.files.map((entry) => entry.path);
  assert.deepEqual(filePaths, sortPaths(filePaths));
  assert.equal(new Set(filePaths).size, filePaths.length);

  const filesByPath = new Map(manifest.files.map((entry) => [entry.path, entry]));
  const groupNames = manifest.groups.map((group) => group.name);
  assert.deepEqual(groupNames, sortPaths(groupNames));
  for (const group of manifest.groups) {
    assert.deepEqual(group.files, sortPaths(group.files));
    assert.equal(group.fileCount, group.files.length);
    const entries = group.files.map((relativePath) => {
      const bytes = fs.readFileSync(path.join(root, ...relativePath.split("/")));
      const file = filesByPath.get(relativePath);
      assert.ok(file, `${group.name} references ${relativePath} outside the canonical file set`);
      assert.equal(file.byteLength, bytes.length);
      assert.equal(file.sha256, sha256(bytes));
      return { path: relativePath, bytes };
    });
    assert.equal(group.byteLength, entries.reduce((total, entry) => total + entry.bytes.length, 0));
    assert.equal(group.sha256, hashRawFileGroup(entries));
  }
});

test("every local script directly loaded by the demo entrypoint is release-covered", () => {
  const indexHtml = fs.readFileSync(path.join(root, "frontend-demo-optimized", "index.html"), "utf8");
  const directRuntimeScripts = [...indexHtml.matchAll(/<script\s+src="\.\/([^"?]+)(?:\?[^\"]*)?"/g)]
    .map((match) => `frontend-demo-optimized/${match[1]}`);
  const designRuntime = new Set(manifest.groups.find((group) => group.name === "design-runtime")?.files || []);

  assert.ok(directRuntimeScripts.length > 0, "index.html must load at least one local script");
  for (const relativePath of directRuntimeScripts) {
    assert.ok(designRuntime.has(relativePath), `direct runtime script is missing from design-runtime: ${relativePath}`);
  }
});

test("all six ordered native ABI hashes have exact names, counts, sources, and pointers", () => {
  const expectedCounts = {
    "component-types": 177,
    "core-commands": 72,
    "core-events": 95,
    "host-requests": 58,
    "motion-ids": 95,
    "ui-events": 300,
  };
  assert.deepEqual(manifest.abis.map((abi) => abi.name), Object.keys(expectedCounts).sort());
  assert.deepEqual(manifest.abis.map(({ name, source, jsonPointer }) => ({ name, source, jsonPointer })), RELEASE_ABI_DEFINITIONS);

  for (const abi of manifest.abis) {
    const source = JSON.parse(fs.readFileSync(path.join(root, ...abi.source.split("/")), "utf8"));
    const values = abi.jsonPointer
      .slice(1)
      .split("/")
      .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
      .reduce((value, segment) => value[segment], source);
    const expectedHash = sha256(Buffer.from(`${JSON.stringify(values)}\n`, "utf8"));
    assert.equal(abi.entryCount, expectedCounts[abi.name], `${abi.name} count drifted`);
    assert.equal(abi.entryCount, values.length);
    assert.equal(abi.encoding, "ordered-json-array-utf8-lf");
    assert.equal(abi.sha256, expectedHash);

    const reordered = [...values];
    [reordered[0], reordered[1]] = [reordered[1], reordered[0]];
    assert.notEqual(sha256(Buffer.from(`${JSON.stringify(reordered)}\n`, "utf8")), expectedHash);
  }
});

test("manifest generation and both check entrypoints are deterministic", () => {
  const commands = [
    ["tools/release/generate-ui-release-manifest.mjs", "--check"],
    ["tools/release/generate-ui-release-manifest.mjs", "--check"],
    ["tools/release/check-ui-release-manifest.mjs"],
  ];
  for (const argumentsList of commands) {
    const result = spawnSync(process.execPath, argumentsList, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout, /\[ui-release-manifest] PASS/);
    assert.equal(fs.readFileSync(manifestPath, "utf8"), rawManifest, `${argumentsList.join(" ")} rewrote the manifest`);
  }
});

test("raw-byte mutations are isolated to the expected file and aggregate groups", (context) => {
  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  assert.deepEqual(buildReleaseManifest(temporaryRoot), manifest);

  const cases = [
    { path: "frontend-demo-optimized/styles/07-control-primitives.css", groups: ["design-runtime"] },
    { path: "device-conformance/DEVICE_CONFORMANCE_PLAN.json", groups: ["device-conformance"] },
    { path: "Package.swift", groups: ["package-entrypoints"] },
    { path: "packages/reference/reader-ui-runtime.mjs", groups: ["runtime-packages"] },
    { path: "ui-spec/runtime-actions.json", groups: ["runtime-actions", "ui-spec"] },
    { path: "contracts/route.schema.json", groups: ["schemas", "screen-graph"] },
    { path: "contracts/fixtures/token.fixtures.json", groups: ["fixtures"] },
    { path: "generated/swift/Route.swift", groups: ["generated"] },
  ];

  for (const mutation of cases) {
    const absolutePath = path.join(temporaryRoot, ...mutation.path.split("/"));
    const original = fs.readFileSync(absolutePath);
    fs.writeFileSync(absolutePath, Buffer.concat([original, Buffer.from(" ")]));
    const changed = buildReleaseManifest(temporaryRoot);
    const messages = describeReleaseManifestDrift(changed, manifest);
    assert.ok(messages.includes(`file changed: ${mutation.path}`));
    assert.deepEqual(
      messages.filter((message) => message.startsWith("group changed: ")),
      mutation.groups.map((name) => `group changed: ${name}`),
    );
    fs.writeFileSync(absolutePath, original);
    assert.deepEqual(buildReleaseManifest(temporaryRoot), manifest);
  }
});

test("new release inputs are discovered dynamically in every extensible group", (context) => {
  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const additions = [
    { path: "device-conformance/zz-release-test.json", group: "device-conformance", contents: "{}\n" },
    { path: "contracts/fixtures/zz-release-test.json", group: "fixtures", contents: "[]\n" },
    { path: "contracts/zz-release-test.schema.json", group: "schemas", contents: "{}\n" },
    { path: "frontend-demo-optimized/styles/99-release-test.css", group: "design-runtime", contents: "/* release test */\n" },
    { path: "generated/zz-release-test.txt", group: "generated", contents: "release test\n" },
    { path: "packages/arkts/reader-ui-runtime/release-test.json5", group: "package-entrypoints", contents: "{}\n" },
    { path: "packages/reference/release-test.mjs", group: "runtime-packages", contents: "export {};\n" },
    { path: "ui-spec/zz-release-test.json", group: "ui-spec", contents: "{}\n" },
  ];

  for (const addition of additions) {
    const destination = path.join(temporaryRoot, ...addition.path.split("/"));
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, addition.contents);
  }

  const changed = buildReleaseManifest(temporaryRoot);
  const changedFiles = new Map(changed.files.map((entry) => [entry.path, entry]));
  const changedGroups = new Map(changed.groups.map((group) => [group.name, group]));
  for (const addition of additions) {
    assert.ok(changedFiles.has(addition.path), `${addition.path} was not discovered`);
    assert.ok(changedGroups.get(addition.group).files.includes(addition.path));
  }
  assert.deepEqual(
    describeReleaseManifestDrift(changed, manifest).filter((message) => message.startsWith("group changed: ")),
    sortPaths(new Set(additions.map((addition) => addition.group))).map((group) => `group changed: ${group}`),
  );
});

test("atomic codegen temp files are never release inputs", (context) => {
  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const temporaryCodegenPath = path.join(temporaryRoot, "generated", "swift", "Route.swift.12345.tmp");
  fs.writeFileSync(temporaryCodegenPath, "partial atomic write\n");

  const changed = buildReleaseManifest(temporaryRoot);
  assert.deepEqual(changed, manifest);
  assert.equal(changed.files.some((entry) => entry.path.endsWith(".tmp")), false);
});

test("Hvigor BuildProfile output cannot change Reader-UI release identity", (context) => {
  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const buildProfilePath = path.join(
    temporaryRoot,
    "packages",
    "arkts",
    "reader-ui-runtime",
    "BuildProfile.ets",
  );
  fs.writeFileSync(buildProfilePath, "export const HAR_VERSION = 'build-output';\n");

  const changed = buildReleaseManifest(temporaryRoot);
  assert.deepEqual(changed, manifest);
  assert.equal(changed.files.some((entry) => entry.path.endsWith("BuildProfile.ets")), false);
});

test("ordered ABI source mutations change both raw groups and only the matching semantic ABI", (context) => {
  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const relativePath = "contracts/motion.schema.json";
  const absolutePath = path.join(temporaryRoot, ...relativePath.split("/"));
  const motionSchema = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  [motionSchema.properties.id.enum[0], motionSchema.properties.id.enum[1]] = [
    motionSchema.properties.id.enum[1],
    motionSchema.properties.id.enum[0],
  ];
  fs.writeFileSync(absolutePath, `${JSON.stringify(motionSchema, null, 2)}\n`);

  const changed = buildReleaseManifest(temporaryRoot);
  const messages = describeReleaseManifestDrift(changed, manifest);
  assert.ok(messages.includes(`file changed: ${relativePath}`));
  assert.deepEqual(messages.filter((message) => message.startsWith("group changed: ")), [
    "group changed: primitive-abi",
    "group changed: schemas",
  ]);
  assert.deepEqual(messages.filter((message) => message.startsWith("ABI changed: ")), ["ABI changed: motion-ids"]);
  assert.equal(changed.abis.find((abi) => abi.name === "motion-ids").entryCount, 95);
  assert.notEqual(
    changed.abis.find((abi) => abi.name === "motion-ids").sha256,
    manifest.abis.find((abi) => abi.name === "motion-ids").sha256,
  );
});

test("tampered manifest digests fail closed", () => {
  const tampered = structuredClone(manifest);
  tampered.files[0].sha256 = "0".repeat(64);
  const result = checkReleaseManifest(root, serializeReleaseManifest(tampered));
  assert.equal(result.ok, false);
  assert.ok(result.messages.includes(`file changed: ${tampered.files[0].path}`));

  const invalidAbi = structuredClone(manifest);
  invalidAbi.abis[0].name = "unknown-abi";
  assert.throws(() => assertValid(schema, invalidAbi, "invalid ABI"), /校验失败/);
});

test("absolute, traversal, non-canonical, and symlink inputs are rejected", (context) => {
  for (const unsafePath of ["/tmp/contract.json", "../contract.json", "contracts/../secret", "./contracts/a", "C:\\secret"] ) {
    assert.throws(() => assertSafeRelativePath(unsafePath), /(absolute|non-canonical|unsafe)/);
  }

  const tampered = structuredClone(manifest);
  tampered.files[0].path = "../outside";
  const result = checkReleaseManifest(root, serializeReleaseManifest(tampered));
  assert.equal(result.ok, false);
  assert.match(result.messages[0], /non-canonical/);

  const temporaryRoot = copyManifestInputs();
  context.after(() => fs.rmSync(temporaryRoot, { recursive: true, force: true }));
  const linkPath = path.join(temporaryRoot, "ui-spec", "runtime-actions.json");
  fs.rmSync(linkPath);
  fs.symlinkSync(path.join(temporaryRoot, "ui-spec", "runtime-ownership.json"), linkPath);
  assert.throws(() => buildReleaseManifest(temporaryRoot), /symlink is forbidden/);
});
