#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const versionManifest = JSON.parse(fs.readFileSync(path.join(root, "contracts", "VERSION.json"), "utf8"));
const version = versionManifest.version;
const hostRequestSchemaVersion = versionManifest.schema?.["host-request"];
const actionsSource = fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.json"));
const actions = JSON.parse(actionsSource.toString("utf8"));
const actionHash = crypto.createHash("sha256").update(actionsSource).digest("hex");
const runtimePayloadContractsSource = fs.readFileSync(
  path.join(root, "ui-spec", "runtime-payload-contracts.json"),
);
const runtimePayloadContracts = JSON.parse(
  runtimePayloadContractsSource.toString("utf8"),
);
const runtimePayloadContractsHash = crypto
  .createHash("sha256")
  .update(runtimePayloadContractsSource)
  .digest("hex");
const canonicalEvents = new Set(actions.actions.map((item) => item.event));
const actionByEvent = new Map(actions.actions.map((item) => [item.event, item]));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "host-consumers.json"), "utf8"));
const rolloutPolicy = manifest.rolloutPolicy || {};
const expectedCoveredEvents = rolloutPolicy.coveredEvents || [];
const expectedPilotEvents = rolloutPolicy.pilotEvents || [];
const expectedEffectfulPilotEvents = rolloutPolicy.effectfulPilotEvents || [];
const declaredEffectfulEvents = new Set(rolloutPolicy.effectfulEvents || []);
const requiredDynamicEffectfulEvents = ["reader.autoPage.start", "reader.autoPage.stop"];
const requestedHost = process.argv.includes("--host") ? process.argv[process.argv.indexOf("--host") + 1] : null;
const failures = [];
const results = [];
let sourceSha = null;
let releaseManifestSha256 = null;
let targetConfigSha256 = null;

try {
  sourceSha = execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(sourceSha)) throw new Error(`invalid Git object id ${sourceSha}`);
} catch (error) {
  failures.push(`cannot resolve Reader UI source SHA: ${error.message}`);
}
for (const [label, relativePath, assign] of [
  ["release manifest", "UI_RELEASE_MANIFEST.json", (value) => { releaseManifestSha256 = value; }],
  ["release host target config", "tools/release/release-host-targets.json", (value) => { targetConfigSha256 = value; }]
]) {
  try {
    assign(crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex"));
  } catch (error) {
    failures.push(`cannot hash Reader UI ${label}: ${error.message}`);
  }
}

function sameOrderedValues(actual, expected) {
  return Array.isArray(actual) && Array.isArray(expected) &&
    actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

if (manifest.schemaVersion !== 2) failures.push(`host-consumers schemaVersion must be 2`);
if (rolloutPolicy.hostRequestSchemaVersion !== hostRequestSchemaVersion) {
  failures.push(`host-consumers HostRequest schema ${rolloutPolicy.hostRequestSchemaVersion}, expected ${hostRequestSchemaVersion}`);
}
if (rolloutPolicy.defaultMode !== "shadow") failures.push(`host-consumers default rollout must be shadow`);
if (rolloutPolicy.pilotEffectPolicy !== "none") failures.push(`host-consumers directory Pilot effectPolicy must be none`);
for (const [name, events] of [
  ["covered", expectedCoveredEvents],
  ["pilot", expectedPilotEvents],
  ["effectful", [...declaredEffectfulEvents]]
]) {
  if (new Set(events).size !== events.length) failures.push(`host-consumers ${name} events contain duplicates`);
  for (const event of events) {
    if (!canonicalEvents.has(event)) failures.push(`host-consumers ${name} event ${event} is not canonical`);
  }
}
for (const event of expectedPilotEvents) {
  if (!expectedCoveredEvents.includes(event)) failures.push(`host-consumers Pilot event ${event} is not covered`);
}
for (const event of declaredEffectfulEvents) {
  if (!expectedCoveredEvents.includes(event)) failures.push(`host-consumers effectful event ${event} is not covered`);
}
for (const event of requiredDynamicEffectfulEvents) {
  if (!declaredEffectfulEvents.has(event)) {
    failures.push(`host-consumers must classify dynamic Host effect event ${event} as effectful`);
  }
}

for (const consumer of manifest.hosts) {
  if (requestedHost && consumer.host !== requestedHost) continue;
  const repo = path.resolve(root, consumer.repo);
  const lockFile = path.join(repo, consumer.lock);
  if (!fs.existsSync(lockFile)) {
    failures.push(`${consumer.host}: missing ${lockFile}`);
    continue;
  }

  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  } catch (error) {
    failures.push(`${consumer.host}: invalid lock JSON: ${error.message}`);
    continue;
  }
  if (lock.schemaVersion !== 3) failures.push(`${consumer.host}: lock schemaVersion must be 3`);
  const lockKeys = Object.keys(lock).sort();
  const expectedLockKeys = [
    "blockedProof",
    "host",
    "hostRequestSchemaVersion",
    "knownDifferences",
    "readerUiVersion",
    "releaseIdentity",
    "rollout",
    "runtimeActionsSchemaVersion",
    "runtimeActionsSha256",
    "runtimePayloadContractsSchemaVersion",
    "runtimePayloadContractsSha256",
    "schemaVersion"
  ];
  if (!sameOrderedValues(lockKeys, expectedLockKeys)) {
    failures.push(`${consumer.host}: lock keys must exactly match host-consumer-lock schema v3`);
  }
  if (lock.host !== consumer.host) failures.push(`${consumer.host}: lock host is ${lock.host}`);
  if (lock.readerUiVersion !== version) failures.push(`${consumer.host}: Reader UI ${lock.readerUiVersion}, expected ${version}`);
  if (lock.hostRequestSchemaVersion !== hostRequestSchemaVersion) {
    failures.push(`${consumer.host}: HostRequest schema ${lock.hostRequestSchemaVersion}, expected ${hostRequestSchemaVersion}`);
  }
  if (lock.runtimeActionsSchemaVersion !== actions.schemaVersion) {
    failures.push(`${consumer.host}: runtime schema ${lock.runtimeActionsSchemaVersion}, expected ${actions.schemaVersion}`);
  }
  if (lock.runtimeActionsSha256 !== actionHash) failures.push(`${consumer.host}: runtime action hash drift`);
  if (
    lock.runtimePayloadContractsSchemaVersion !==
    runtimePayloadContracts.schemaVersion
  ) {
    failures.push(
      `${consumer.host}: runtime payload schema ` +
      `${lock.runtimePayloadContractsSchemaVersion}, expected ` +
      `${runtimePayloadContracts.schemaVersion}`,
    );
  }
  if (lock.runtimePayloadContractsSha256 !== runtimePayloadContractsHash) {
    failures.push(`${consumer.host}: runtime payload contract hash drift`);
  }
  const identity = lock.releaseIdentity;
  if (!identity || typeof identity !== "object" || Array.isArray(identity)) {
    failures.push(`${consumer.host}: releaseIdentity must be an object`);
  } else {
    const identityKeys = Object.keys(identity).sort();
    const expectedIdentityKeys = ["manifestSha256", "releaseId", "sourceSha", "targetConfigSha256"];
    if (!sameOrderedValues(identityKeys, expectedIdentityKeys)) {
      failures.push(`${consumer.host}: releaseIdentity keys must be exactly ${expectedIdentityKeys.join(",")}`);
    }
    if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(identity.sourceSha || "")) {
      failures.push(`${consumer.host}: releaseIdentity sourceSha is invalid`);
    }
    for (const field of ["manifestSha256", "targetConfigSha256"]) {
      if (!/^[0-9a-f]{64}$/.test(identity[field] || "")) failures.push(`${consumer.host}: releaseIdentity ${field} is invalid`);
    }
    if (identity.releaseId !== `${identity.sourceSha}:${identity.manifestSha256}`) {
      failures.push(`${consumer.host}: releaseIdentity releaseId must equal sourceSha:manifestSha256`);
    }
    if (sourceSha && identity.sourceSha !== sourceSha) {
      failures.push(`${consumer.host}: releaseIdentity source SHA ${identity.sourceSha}, expected ${sourceSha}`);
    }
    if (releaseManifestSha256 && identity.manifestSha256 !== releaseManifestSha256) {
      failures.push(`${consumer.host}: release manifest hash drift`);
    }
    if (targetConfigSha256 && identity.targetConfigSha256 !== targetConfigSha256) {
      failures.push(`${consumer.host}: release host target config hash drift`);
    }
  }
  if (!lock.rollout || !["shadow", "pilot", "authoritative"].includes(lock.rollout.mode)) {
    failures.push(`${consumer.host}: invalid rollout mode`);
  }
  const coveredEvents = lock.rollout?.coveredEvents || [];
  if (new Set(coveredEvents).size !== coveredEvents.length) {
    failures.push(`${consumer.host}: duplicate covered event`);
  }
  for (const event of coveredEvents) {
    if (!canonicalEvents.has(event)) failures.push(`${consumer.host}: covered event ${event} is not in runtime-actions.json`);
  }
  if (!sameOrderedValues(coveredEvents, expectedCoveredEvents)) {
    failures.push(`${consumer.host}: covered events must exactly match host-consumers rollout policy`);
  }
  if (lock.rollout?.mode !== rolloutPolicy.defaultMode) {
    failures.push(`${consumer.host}: default rollout ${lock.rollout?.mode}, expected ${rolloutPolicy.defaultMode}`);
  }
  const cohortEvents = new Map();
  const cohortIds = new Set();
  const cohorts = lock.rollout?.cohorts || [];
  if (cohorts.length < 1) failures.push(`${consumer.host}: must define at least one cohort`);
  for (const cohort of cohorts) {
    if (typeof cohort.id !== "string" || cohort.id.length === 0) {
      failures.push(`${consumer.host}: cohort missing id`);
      continue;
    }
    if (cohortIds.has(cohort.id)) failures.push(`${consumer.host}: duplicate cohort ${cohort.id}`);
    cohortIds.add(cohort.id);
    if (!["shadow", "pilot", "authoritative"].includes(cohort.mode)) {
      failures.push(`${consumer.host}: cohort ${cohort.id} has invalid mode`);
    }
    if (cohort.mode !== "shadow") {
      for (const field of ["evidence", "rollback", "effectPolicy"]) {
        if (typeof cohort[field] !== "string" || cohort[field].length === 0) {
          failures.push(consumer.host + ": cohort " + cohort.id + " missing " + field + " for " + cohort.mode);
        }
      }
      if (!["none", "exactly-once"].includes(cohort.effectPolicy)) {
        failures.push(consumer.host + ": cohort " + cohort.id + " has invalid effectPolicy");
      }
    }
    if (!Array.isArray(cohort.events) || cohort.events.length === 0) {
      failures.push(`${consumer.host}: cohort ${cohort.id} has no events`);
      continue;
    }
    for (const event of cohort.events) {
      if (!coveredEvents.includes(event)) failures.push(`${consumer.host}: cohort ${cohort.id} event ${event} is not covered`);
      if (!canonicalEvents.has(event)) failures.push(`${consumer.host}: cohort ${cohort.id} event ${event} is not in runtime-actions.json`);
      if (cohortEvents.has(event)) failures.push(`${consumer.host}: event ${event} appears in multiple cohorts`);
      cohortEvents.set(event, cohort.mode);
      const action = actionByEvent.get(event);
      const isEffectful = declaredEffectfulEvents.has(event) ||
        (action && ((action.coreSequence || []).length > 0 || action.hostRequest));
      if (cohort.mode !== "shadow" && cohort.effectPolicy === "none" && isEffectful) {
        failures.push(consumer.host + ": effectPolicy=none cohort " + cohort.id + " contains effectful " + event);
      }
    }
  }
  const pilotCohorts = cohorts.filter((cohort) => cohort.mode === "pilot");
  if (pilotCohorts.length < 1) {
    failures.push(`${consumer.host}: must define at least one Pilot cohort`);
  } else {
    // Union of all pilot cohort events must match expectedPilotEvents + effectfulPilotEvents
    const allPilotEvents = new Set();
    const effectfulPilotEvents = new Set(expectedEffectfulPilotEvents);
    for (const pilot of pilotCohorts) {
      for (const event of pilot.events) {
        allPilotEvents.add(event);
      }
    }
    const expectedAllPilot = new Set([...expectedPilotEvents, ...expectedEffectfulPilotEvents]);
    // Check union matches
    for (const event of allPilotEvents) {
      if (!expectedAllPilot.has(event)) {
        failures.push(`${consumer.host}: pilot cohort event ${event} is not in host-consumers pilot/effectfulPilot events`);
      }
    }
    for (const event of expectedAllPilot) {
      if (!allPilotEvents.has(event)) {
        failures.push(`${consumer.host}: expected pilot event ${event} is not in any pilot cohort`);
      }
    }
    // effectfulPilotEvents must be in cohorts with effectPolicy=exactly-once
    for (const pilot of pilotCohorts) {
      for (const event of pilot.events) {
        if (effectfulPilotEvents.has(event) && pilot.effectPolicy !== "exactly-once") {
          failures.push(`${consumer.host}: effectful pilot event ${event} must be in a cohort with effectPolicy=exactly-once`);
        }
        if (!effectfulPilotEvents.has(event) && pilot.effectPolicy !== rolloutPolicy.pilotEffectPolicy) {
          failures.push(`${consumer.host}: non-effectful pilot event ${event} has effectPolicy ${pilot.effectPolicy}, expected ${rolloutPolicy.pilotEffectPolicy}`);
        }
      }
    }
  }
  for (const field of ["knownDifferences", "blockedProof"]) {
    if (!Array.isArray(lock[field])) failures.push(`${consumer.host}: ${field} must be an array`);
  }
  const differenceIds = new Set();
  for (const difference of lock.knownDifferences || []) {
    for (const field of ["id", "description", "owner", "exitCriteria"]) {
      if (typeof difference[field] !== "string" || difference[field].length === 0) {
        failures.push(`${consumer.host}: known difference missing ${field}`);
      }
    }
    if (differenceIds.has(difference.id)) failures.push(`${consumer.host}: duplicate known difference ${difference.id}`);
    differenceIds.add(difference.id);
  }
  for (const blocked of lock.blockedProof || []) {
    for (const field of ["gate", "reason", "evidence"]) {
      if (typeof blocked[field] !== "string" || blocked[field].length === 0) {
        failures.push(`${consumer.host}: blocked proof missing ${field}`);
      }
    }
  }
  for (const check of consumer.dependencyChecks || []) {
    const file = path.join(repo, check.file);
    if (!fs.existsSync(file)) {
      failures.push(`${consumer.host}: missing dependency file ${check.file}`);
    } else if (!fs.readFileSync(file, "utf8").includes(check.contains)) {
      failures.push(`${consumer.host}: ${check.file} does not contain ${check.contains}`);
    }
  }
  for (const check of consumer.packageVersionChecks || []) {
    const file = path.join(repo, check.file);
    if (!fs.existsSync(file)) {
      failures.push(`${consumer.host}: missing package lock ${check.file}`);
      continue;
    }
    let packageLock;
    try {
      packageLock = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      failures.push(`${consumer.host}: invalid package lock ${check.file}: ${error.message}`);
      continue;
    }
    const matches = Object.values(packageLock.packages || {}).filter((item) => item?.name === check.package);
    if (matches.length !== 1) {
      failures.push(`${consumer.host}: ${check.file} must lock exactly one ${check.package} package`);
    } else if (matches[0].version !== version) {
      failures.push(`${consumer.host}: ${check.file} locks ${check.package} ${matches[0].version}, expected ${version}`);
    }
  }
  const modes = {};
  for (const event of coveredEvents) {
    const mode = cohortEvents.get(event) || lock.rollout?.mode || "invalid";
    modes[mode] = (modes[mode] || 0) + 1;
  }
  const modeSummary = Object.entries(modes).sort(([left], [right]) => left.localeCompare(right))
    .map(([mode, count]) => mode + ":" + count).join(",");
  results.push(`${consumer.host}:${modeSummary || "invalid"}`);
}

if (requestedHost && results.length === 0 && !failures.some((item) => item.startsWith(`${requestedHost}:`))) {
  failures.push(`unknown host ${requestedHost}`);
}
if (failures.length > 0) {
  console.error(
    `[host-consumers] FAIL version=${version} actions=${actionHash} ` +
    `payloads=${runtimePayloadContractsHash}\n${failures.join("\n")}`,
  );
  process.exit(1);
}
console.log(
  `[host-consumers] PASS version=${version} actions=${actionHash} ` +
  `payloads=${runtimePayloadContractsHash} ${results.join(" ")}`,
);
