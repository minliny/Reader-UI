import { test } from "node:test";
import assert from "node:assert/strict";
import {
  extractMotionIdsFromController,
  extractMotionIdsFromCss
} from "./motion-id-extractor.mjs";

test("controller extractor reads published identities but ignores state, token and wildcard fields", () => {
  const source = `
    (function (window) {
      window.ReaderMotionController = {
        DEFAULT_DURATIONS: {
          "reader.control.show": 240,
          "reader.*": 0
        },
        CONTRACT: {
          aliases: { "reader.quick.legacy": "reader.quick.promote" },
          motionIds: [{
            id: "reader.panel.expand",
            stateMachine: {
              from: ["control.quick.module"],
              to: ["control.full.module"],
              finalState: "control.full.module.singleTargetVisible"
            }
          }],
          rules: [{
            prefix: "reader.panel.*",
            tokens: ["reader.motion.duration.panel"]
          }]
        }
      };
    })(window);
  `;

  assert.deepEqual(
    [...extractMotionIdsFromController(source)].sort(),
    [
      "reader.control.show",
      "reader.panel.expand",
      "reader.quick.legacy",
      "reader.quick.promote"
    ]
  );
});

test("CSS extractor accepts only exact data-motion id selectors", () => {
  const source = `
    [data-motion-reader-id="reader.panel.expand"] { opacity: 1; }
    [data-motion-reader-id^="reader.panel."] { opacity: 1; }
    [data-motion-reader-id="reader.*"] { opacity: 1; }
    .sample { transition: var(--reader.motion.duration.panel); }
  `;

  assert.deepEqual([...extractMotionIdsFromCss(source)], ["reader.panel.expand"]);
});
