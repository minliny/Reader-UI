#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assertValid } from "../../contracts/tests/mini-validator.mjs";
import {
  buildScreenGraphArtifacts,
  checkScreenGraphArtifactBytes,
  REPO_ROOT,
  SCREEN_GRAPH_PATH,
  SCREEN_GRAPH_SCHEMA_PATH,
  validateScreenGraphSemantics,
} from "./screen-graph-lib.mjs";

const artifacts = buildScreenGraphArtifacts();
checkScreenGraphArtifactBytes(artifacts);

const schema = JSON.parse(readFileSync(join(REPO_ROOT, SCREEN_GRAPH_SCHEMA_PATH), "utf8"));
const graph = JSON.parse(readFileSync(join(REPO_ROOT, SCREEN_GRAPH_PATH), "utf8"));
assertValid(schema, graph, "canonical screen graph");
validateScreenGraphSemantics(graph);

console.log(
  `[screen-graph] PASS routes=${artifacts.coverage.graphRoutes} direct=${artifacts.coverage.directRoutes} alias=${artifacts.coverage.aliasRoutes} explicit-gap=${artifacts.coverage.explicitGapRoutes} variants=${artifacts.coverage.variants} components=${artifacts.coverage.componentInstances} component-types=${artifacts.coverage.referencedComponentTypes}+${artifacts.coverage.explicitGapComponentTypes}gap bindings=${artifacts.coverage.typedActionBindings} state-evidence=${artifacts.coverage.stateEventEvidence} action-gaps=${artifacts.coverage.explicitActionGaps}`,
);
