import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertValid } from "./mini-validator.mjs";
import {
  ReaderUIRuntime,
  ReaderUIRuntimeError,
  initialReaderUIState,
  validateReaderUITypedPayload,
  validateReaderUITypedResult
} from "../../packages/reference/reader-ui-runtime.mjs";
import { GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS } from "../../packages/reference/generated-runtime-payload-contracts.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const actions = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-actions.json"), "utf8"));
const contractSchema = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-payload-contracts.schema.json"), "utf8"));
const contracts = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "runtime-payload-contracts.json"), "utf8"));
const fixtureSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-payload-contract.fixtures.schema.json"), "utf8"));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-payload-contract.fixtures.json"), "utf8"));
const resultFixtureSchema = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-result-contract.fixtures.schema.json"), "utf8"));
const resultFixtures = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "runtime-result-contract.fixtures.json"), "utf8"));
const canonicalUiEventFixtures = JSON.parse(fs.readFileSync(path.join(root, "contracts", "fixtures", "ui-event.fixtures.json"), "utf8"));
const consumers = JSON.parse(fs.readFileSync(path.join(root, "ui-spec", "host-consumers.json"), "utf8"));

test("typed payload registry and fixtures pass their machine schemas", () => {
  assertValid(contractSchema, contracts, "runtime-payload-contracts.json");
  assertValid(fixtureSchema, fixtures, "runtime-payload-contract.fixtures.json");
  assertValid(resultFixtureSchema, resultFixtures, "runtime-result-contract.fixtures.json");
  assert.equal(contracts.contracts.length, 61);
  assert.equal(new Set(contracts.contracts.map((item) => item.event)).size, 61);
  assert.deepEqual(new Set(contracts.contracts.map((item) => item.event)), new Set(actions.actions.map((item) => item.event)));
  assert.equal(fixtures.length, 170);
  assert.equal(contracts.contracts.reduce((count, item) => count + item.resultSchemas.length, 0), 70);
  assert.equal(resultFixtures.length, 142);
  for (const contract of contracts.contracts) {
    assert.ok(Array.isArray(contract.resultSchemas), `${contract.event} must explicitly declare resultSchemas`);
  }
});

test("typed registry exactly matches every navigation, session, composite, Core and runtime descriptor", () => {
  const actionsByEvent = new Map(actions.actions.map((action) => [action.event, action]));
  for (const contract of contracts.contracts) {
    const action = actionsByEvent.get(contract.event);
    const target = contract.dispatchTarget;
    const operation = target === "core" ? contract.coreCommand : contract.runtimeOperation;
    assert.deepEqual(contract.descriptor, {
      action: action.action,
      coreSequence: action.coreSequence || [],
      ...(action.value === undefined ? {} : { value: action.value }),
      ...(action.hostRequest === undefined ? {} : { hostRequest: action.hostRequest })
    }, contract.event);
    assert.equal(GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[contract.event]?.dispatchTarget, target);
    assert.equal(GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[contract.event]?.operation, operation);
    assert.equal(Object.keys(GENERATED_RUNTIME_TYPED_PAYLOAD_CONTRACTS[contract.event]?.resultSchemas || {}).length, contract.resultSchemas.length);
  }
  assert.equal(consumers.rolloutPolicy.pilotEvents.length, 2);
  assert.equal(consumers.rolloutPolicy.effectfulPilotEvents.length, 5);
  assert.equal(consumers.rolloutPolicy.coveredEvents.length - 7, 28);
  assert.equal(consumers.rolloutPolicy.defaultMode, "shadow");
});

test("reference validator accepts every valid payload fixture and rejects every invalid fixture", () => {
  for (const fixture of fixtures) {
    if (fixture.valid) {
      assert.ok(validateReaderUITypedPayload(fixture.event, fixture.payload), fixture.id);
    } else {
      assert.throws(
        () => validateReaderUITypedPayload(fixture.event, fixture.payload),
        (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD",
        fixture.id
      );
    }
  }
});

test("reference validator accepts every declared result fixture and fails closed for invalid, unknown and unsafe results", () => {
  for (const fixture of resultFixtures) {
    if (fixture.valid) {
      assert.ok(validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result), fixture.id);
    } else {
      assert.throws(
        () => validateReaderUITypedResult(fixture.event, fixture.effectType, fixture.result),
        (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_RESULT",
        fixture.id
      );
    }
  }
  assert.throws(
    () => validateReaderUITypedResult("route.push", "source.detail", {}),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "UNDECLARED_TYPED_RESULT"
  );
});

test("runtime dispatch detects descriptor drift for internal and composite actions", () => {
  for (const [event, mutate] of [
    ["route.push", (action) => { action.action = "replaceRoute"; }],
    ["sync.run", (action) => { action.coreSequence = ["sync.snapshot"]; }],
    ["reader.tts.start", (action) => { action.hostRequest = "tts.system.stop"; }]
  ]) {
    const drifted = structuredClone(actions);
    mutate(drifted.actions.find((action) => action.event === event));
    const runtime = new ReaderUIRuntime(drifted, initialReaderUIState());
    const validFixture = fixtures.find((fixture) => fixture.event === event && fixture.valid);
    assert.throws(
      () => runtime.dispatch(event, validFixture.payload, `drift:${event}`),
      (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_CONTRACT",
      event
    );
  }
});

test("the 16 canonical UiEvent fixtures carry executable full Core DTO payloads", () => {
  const commandByEvent = new Map(contracts.contracts
    .filter((contract) => (contract.dispatchTarget || "core") === "core")
    .map((contract) => [contract.event, contract.coreCommand]));
  const typedEvents = new Set(commandByEvent.keys());
  const canonical = canonicalUiEventFixtures.filter((fixture) => typedEvents.has(fixture.type));
  assert.equal(canonical.length, 16);
  assert.equal(new Set(canonical.map((fixture) => fixture.type)).size, 16);
  for (const fixture of canonical) {
    const runtime = new ReaderUIRuntime(actions, initialReaderUIState());
    const transition = runtime.dispatch(fixture.type, fixture.payload, `canonical:${fixture.type}`);
    assert.deepEqual(transition.effects.map((effect) => effect.type), [commandByEvent.get(fixture.type)], fixture.type);
    assert.deepEqual(transition.effects[0].jsonPayload, fixture.payload, fixture.type);
  }
});

test("typed boundary rejects unsafe integers and wrong top-level DTO aliases", () => {
  const runtime = new ReaderUIRuntime(actions);
  assert.throws(
    () => runtime.dispatch("rss.refresh", { subscriptionId: "feed", evaluatedAt: 9_007_199_254_740_992 }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD"
  );
  assert.throws(
    () => runtime.dispatch("rss.subscription.add", { url: "https://feed.test/rss.xml" }),
    (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD"
  );

  const validPayload = (id) => structuredClone(fixtures.find((fixture) => fixture.id === id).payload);
  const sourceCommit = validPayload("source-switch-confirm-valid");
  sourceCommit.currentChapterIndex = 4_294_967_296;
  const sourceRollback = validPayload("source-switch-rollback-valid");
  sourceRollback.rollbackToken.oldBook.sortIndex = 2_147_483_648;
  const replaceCreate = validPayload("replace-create-valid");
  replaceCreate.params.order = -2_147_483_649;
  for (const [event, payload] of [
    ["source.switch.confirm", sourceCommit],
    ["source.switch.rollback", sourceRollback],
    ["reader.replace.create", replaceCreate]
  ]) {
    assert.throws(
      () => runtime.dispatch(event, payload),
      (error) => error instanceof ReaderUIRuntimeError && error.code === "INVALID_TYPED_PAYLOAD",
      `${event} must preserve the narrower Core integer type`
    );
  }
});
