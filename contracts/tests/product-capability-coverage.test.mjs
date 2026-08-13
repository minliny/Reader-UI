import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));

const matrix = readJson("contracts/fixtures/product-capability.fixtures.json");
const routeSchema = readJson("contracts/route.schema.json");
const uiEventSchema = readJson("contracts/ui-event.schema.json");

const routeIds = new Set(routeSchema.properties.id.enum);
const eventIds = new Set(uiEventSchema.properties.type.enum);

const requiredCapabilityIds = [
  "foundation.startup-runtime",
  "foundation.onboarding-permissions",
  "foundation.navigation-shells",
  "library.bookshelf-personal-data",
  "library.local-import-formats",
  "library.download-cache-storage",
  "remote.source-management",
  "remote.source-auth-challenge",
  "remote.search-discover-detail",
  "remote.source-switch",
  "remote.content-tools",
  "remote.cover-management",
  "remote.chapter-reviews",
  "reader.text",
  "reader.pdf",
  "reader.manga",
  "reader.appearance-controls",
  "rss.subscription-reading",
  "tts.system",
  "tts.http",
  "sync.webdav-backup-restore",
  "settings.application-platform",
  "quality.accessibility-responsive",
  "quality.motion-interaction"
];

test("product capability denominator is unique and complete", () => {
  assert.equal(matrix.schemaVersion, 1);
  const ids = matrix.capabilities.map((capability) => capability.id);
  assert.equal(new Set(ids).size, ids.length, "capability ids must be unique");
  for (const id of requiredCapabilityIds) {
    assert.ok(ids.includes(id), `missing required product capability ${id}`);
  }
});

test("every Reader-UI route and event reference is canonical", () => {
  for (const capability of matrix.capabilities) {
    for (const routeId of capability.readerUI.routes) {
      assert.ok(routeIds.has(routeId), `${capability.id} references unknown RouteId ${routeId}`);
    }
    for (const eventId of capability.readerUI.events) {
      assert.ok(eventIds.has(eventId), `${capability.id} references unknown UiEvent ${eventId}`);
    }
  }
});

test("required deliveries declare acceptance and do not overclaim verification", () => {
  for (const capability of matrix.capabilities) {
    for (const layerName of ["figma", "readerUI"]) {
      const layer = capability[layerName];
      assert.ok(layer.acceptance.trim(), `${capability.id}.${layerName} needs an acceptance rule`);
      if (layer.required) {
        assert.notEqual(layer.status, "not-required", `${capability.id}.${layerName} is required`);
      }
      if (layer.status === "verified") {
        assert.ok(layer.evidence.length > 0, `${capability.id}.${layerName} verified requires evidence`);
      }
    }
    for (const layerName of ["coreHost", "nativeHost"]) {
      const layer = capability[layerName];
      assert.ok(layer.acceptance.trim(), `${capability.id}.${layerName} needs an acceptance rule`);
      if (layer.status === "verified") {
        assert.ok(layer.evidence.length > 0, `${capability.id}.${layerName} verified requires evidence`);
      }
    }
  }
});

test("product-expansion capabilities are registered locally without claiming runtime completion", () => {
  for (const capability of matrix.capabilities.filter((item) => item.scope === "product-expansion")) {
    assert.ok(capability.readerUI.routes.length > 0, `${capability.id} needs at least one registered route`);
    assert.ok(capability.readerUI.events.length > 0, `${capability.id} needs at least one registered event`);
    assert.ok(
      ["registered", "candidate", "partial"].includes(capability.readerUI.status),
      `${capability.id} must remain registered/candidate/partial until runtime and browser evidence close`
    );
  }
});

test("no single layer can silently mark an unverified product-expansion capability complete", () => {
  for (const capability of matrix.capabilities.filter((item) => item.scope === "product-expansion")) {
    const statuses = [
      capability.figma.status,
      capability.readerUI.status,
      capability.coreHost.status,
      capability.nativeHost.status
    ];
    assert.ok(statuses.some((status) => status !== "verified"), `${capability.id} needs full-chain evidence before completion`);
  }
});
