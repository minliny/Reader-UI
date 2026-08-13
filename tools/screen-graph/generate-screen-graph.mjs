#!/usr/bin/env node
import {
  buildScreenGraphArtifacts,
  writeScreenGraphArtifacts,
} from "./screen-graph-lib.mjs";

const artifacts = buildScreenGraphArtifacts();
const paths = writeScreenGraphArtifacts(artifacts);
console.log(
  `[screen-graph] generated ${artifacts.graph.routes.length} routes / ${artifacts.nativeRegistry.stats.variants} variants / ${artifacts.nativeRegistry.stats.components} recursive components (${artifacts.coverage.directRoutes} direct, ${artifacts.coverage.aliasRoutes} alias, ${artifacts.coverage.explicitGapRoutes} explicit gap)`,
);
for (const path of paths) console.log(`[screen-graph] wrote ${path}`);
