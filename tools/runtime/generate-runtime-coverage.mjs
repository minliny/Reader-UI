#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const checkOnly = process.argv.includes("--check");
const failures = [];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function sortedCounts(items, key) {
  const counts = {};
  for (const item of items) counts[item[key]] = (counts[item[key]] || 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function matches(rule, event) {
  if (Array.isArray(rule.events) && rule.events.includes(event)) return true;
  if (Array.isArray(rule.prefixes) && rule.prefixes.some((prefix) => event.startsWith(prefix))) return true;
  return rule.fallback === true;
}

function firstFallback(rules, label) {
  const fallbackIndexes = rules.map((rule, index) => rule.fallback === true ? index : -1).filter((index) => index >= 0);
  if (fallbackIndexes.length !== 1 || fallbackIndexes[0] !== rules.length - 1) {
    failures.push(label + " must contain exactly one final fallback rule");
  }
  return rules[fallbackIndexes[0]];
}

const uiEvents = readJson("contracts/ui-event.schema.json").properties.type.enum;
const actions = readJson("ui-spec/runtime-actions.json").actions;
const ownership = readJson("ui-spec/runtime-ownership.json");
const outputFile = path.join(root, "generated", "runtime-coverage.json");

if (new Set(uiEvents).size !== uiEvents.length) failures.push("canonical UiEvent values are not unique");
if (ownership.canonicalUiEventCount !== uiEvents.length) {
  failures.push("runtime ownership expects " + ownership.canonicalUiEventCount + " canonical events, found " + uiEvents.length);
}
if (new Set(actions.map((action) => action.event)).size !== actions.length) failures.push("runtime action events are not unique");
if (ownership.expectedImplementedActions !== actions.length) {
  failures.push("runtime ownership expects " + ownership.expectedImplementedActions + " actions, found " + actions.length);
}

const allowedEvents = new Set(uiEvents);
for (const rule of [...ownership.ownershipRules, ...ownership.workflowRules]) {
  for (const event of rule.events || []) {
    if (!allowedEvents.has(event)) failures.push("rule " + rule.id + " references unknown event " + event);
  }
}

const fallbackOwnership = firstFallback(ownership.ownershipRules, "ownershipRules");
const fallbackWorkflow = firstFallback(ownership.workflowRules, "workflowRules");
const actionByEvent = new Map(actions.map((action) => [action.event, action]));
const entries = [];

for (const event of uiEvents) {
  const explicitOwnership = ownership.ownershipRules.filter((rule) => rule !== fallbackOwnership && matches(rule, event));
  if (explicitOwnership.length > 1) failures.push("event " + event + " matches multiple ownership rules");
  const ownershipRule = explicitOwnership[0] || fallbackOwnership;
  const workflowRule = ownership.workflowRules.find((rule) => matches(rule, event)) || fallbackWorkflow;
  const action = actionByEvent.get(event);
  if (action && ownershipRule.owner !== "runtime") {
    failures.push("implemented action " + event + " cannot be owned by " + ownershipRule.owner);
  }
  entries.push({
    event,
    workflow: workflowRule.workflow,
    owner: ownershipRule.owner,
    coverage: action ? "implemented" : ownershipRule.coverage,
    ownershipRule: ownershipRule.id,
    rationale: ownershipRule.rationale,
    action: action ? {
      kind: action.action,
      coreSequence: action.coreSequence || [],
      hostRequest: action.hostRequest || null
    } : null
  });
}

const implemented = entries.filter((entry) => entry.coverage === "implemented");
const planned = entries.filter((entry) => entry.coverage === "planned");
const platform = entries.filter((entry) => entry.coverage === "platform");
if (implemented.length !== actions.length) failures.push("implemented coverage count does not equal runtime action count");
if (entries.length !== uiEvents.length) failures.push("coverage report does not include every canonical event");

const report = {
  schemaVersion: 1,
  source: {
    uiEventSchema: "contracts/ui-event.schema.json",
    runtimeActionSpec: "ui-spec/runtime-actions.json",
    ownershipSpec: "ui-spec/runtime-ownership.json"
  },
  summary: {
    canonicalEvents: entries.length,
    implemented: implemented.length,
    planned: planned.length,
    platform: platform.length,
    byWorkflow: sortedCounts(entries, "workflow"),
    byOwner: sortedCounts(entries, "owner")
  },
  events: entries
};

if (failures.length > 0) {
  console.error("[runtime-coverage] FAIL\n" + failures.join("\n"));
  process.exit(1);
}

const content = JSON.stringify(report, null, 2) + "\n";
if (checkOnly) {
  if (!fs.existsSync(outputFile) || fs.readFileSync(outputFile, "utf8") !== content) {
    console.error("[runtime-coverage] drift: generated/runtime-coverage.json");
    process.exit(1);
  }
} else {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  fs.writeFileSync(outputFile, content);
}

console.log(
  "[runtime-coverage] " + (checkOnly ? "check" : "write") +
  " canonical=" + entries.length +
  " implemented=" + implemented.length +
  " planned=" + planned.length +
  " platform=" + platform.length
);
