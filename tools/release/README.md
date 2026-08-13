# Reader UI release-to-host automation

This directory implements a fail-closed handoff from a tagged Reader UI release
to draft consumer-lock bump pull requests in the iOS, Android, and HarmonyOS
repositories. It never auto-merges a pull request.

## Trust chain

1. `.github/workflows/ui-runtime.yml` accepts only a `v<contracts/VERSION.json>`
   tag after the contract/runtime gates and the checked release manifest pass.
2. `prepare-ui-release.mjs` materializes an exact artifact inventory containing
   the manifest, immutable release metadata, target authority, and every
   manifest-declared source byte. Extra files and symlinks are rejected.
3. `dispatch-ui-release.mjs` verifies the downloaded artifact again and sends
   the same source SHA, tag, version, manifest/ABI hash, runtime hash, artifact
   identity, and target-authority hash to all three configured repositories.
4. Each Host checks out the exact source SHA, verifies the cross-repository
   artifact record, updates only `READER_UI_CONSUMER.json`, runs its available
   consumer/build gates, and creates or reuses one deterministic draft PR.

Any missing token, target, tag/version mismatch, source/manifest/runtime/ABI
drift, unexpected artifact file, lock-scope expansion, or non-draft/conflicting
PR state fails the workflow.

## Dry-run plan

After `prepare-ui-release.mjs` has produced a release stage, the dispatch command
can emit the exact deterministic request plan without a token or network call:

```sh
READER_HOST_SYNC_REPOSITORIES='minliny/Reader-for-Android,minliny/Reader-for-HarmonyOS,minliny/Reader-for-iOS' \
GITHUB_REPOSITORY='minliny/Reader-UI' \
GITHUB_REF='refs/tags/vX.Y.Z' \
GITHUB_SHA='<tag-commit-sha>' \
GITHUB_RUN_ID='<workflow-run-id>' \
READER_UI_ARTIFACT_NAME='reader-ui-vX.Y.Z' \
node tools/release/dispatch-ui-release.mjs \
  --dry-run \
  --artifact-root release-stage \
  --artifact-id '<artifact-id>' \
  --artifact-digest '<64-char-sha256>' \
  --inventory-sha256 '<64-char-sha256>'
```

Standard output is one machine-readable JSON plan. Diagnostics go to standard
error. The plan and live dispatcher share the same builder, so tested dry-run
requests cannot drift from live requests.

## GitHub configuration required for a live run

- Reader UI environment `reader-ui-release`:
  - secret `READER_HOST_SYNC_TOKEN`, authorized to create repository dispatches
    in the exact three Host repositories;
  - variable `READER_HOST_SYNC_REPOSITORIES`, exactly matching
    `tools/release/release-host-targets.json` (no missing or additional
    repository).
- Each Host repository:
  - secret `READER_UI_REPO_TOKEN`, with Reader UI Contents read and Actions
    artifact read access;
  - Actions permissions allowing the job-scoped `GITHUB_TOKEN` to push the
    deterministic bump branch and create a draft pull request.

Local tests use fake fetch/CLI implementations and never call GitHub. A real
tag, artifact transfer, repository dispatch, branch push, and draft PR remain
external release proof and require the configuration above.

HarmonyOS automation intentionally proves only the static consumer boundary on
the available hosted runner. DevEco/HAP and physical-device proof remain a
separate dedicated-runner/device gate.
