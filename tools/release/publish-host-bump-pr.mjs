#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  assertVerifiedHostRelease,
  HOST_CONSUMER_LOCK_PATH,
} from "./host-consumer-release-lib.mjs";

const requiredFlags = new Set([
  "--base",
  "--github-token-env",
  "--host-root",
  "--host-repository",
  "--lock",
  "--verified-release",
]);

function parseArguments(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!requiredFlags.has(flag)) throw new Error(`unknown argument: ${flag ?? "<missing>"}`);
    if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
      throw new Error(`${flag} requires a value`);
    }
    if (values.has(flag)) throw new Error(`duplicate argument: ${flag}`);
    values.set(flag, value);
  }
  for (const flag of requiredFlags) {
    if (!values.has(flag)) throw new Error(`${flag} is required`);
  }
  return values;
}

function canonicalArgument(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value || /[\r\n\0]/.test(value)) {
    throw new Error(`${label} must be a non-empty canonical string`);
  }
  return value;
}

function run(command, args, { cwd, env = process.env, acceptedStatuses = [0] } = {}) {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  if (result.error) throw new Error(`${command} failed to start: ${result.error.message}`);
  if (!acceptedStatuses.includes(result.status)) {
    const detail = `${result.stderr || result.stdout}`.replace(/[\r\n]+/g, " ").trim().slice(0, 800);
    throw new Error(`${command} ${args[0] ?? ""} failed with status ${result.status}${detail ? `: ${detail}` : ""}`);
  }
  return result;
}

function exactChangedPath(output, expectedPath, label) {
  const paths = output.split(/\r?\n/).filter(Boolean);
  if (paths.length !== 1 || paths[0] !== expectedPath) {
    throw new Error(`${label} must contain only ${expectedPath}; found ${paths.join(",") || "<none>"}`);
  }
}

function parseJson(output, label) {
  try {
    return JSON.parse(output);
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

try {
  const values = parseArguments(process.argv.slice(2));
  const hostRoot = path.resolve(values.get("--host-root"));
  const lockPath = path.resolve(values.get("--lock"));
  const lockRelativePath = path.relative(hostRoot, lockPath).split(path.sep).join("/");
  if (lockRelativePath !== HOST_CONSUMER_LOCK_PATH) {
    throw new Error(`--lock must resolve to ${HOST_CONSUMER_LOCK_PATH} at the host repository root`);
  }
  const verified = assertVerifiedHostRelease(
    JSON.parse(fs.readFileSync(path.resolve(values.get("--verified-release")), "utf8")),
  );
  const hostRepository = canonicalArgument(values.get("--host-repository"), "--host-repository");
  if (verified.hostRepository !== hostRepository) {
    throw new Error(`verified host repository ${verified.hostRepository} does not match ${hostRepository}`);
  }
  const base = canonicalArgument(values.get("--base"), "--base");
  if (!/^[A-Za-z0-9][A-Za-z0-9._\/-]*$/.test(base) || base.includes("..") || base.endsWith("/")) {
    throw new Error("--base is not a safe Git branch name");
  }
  const tokenEnvironment = canonicalArgument(values.get("--github-token-env"), "--github-token-env");
  if (!/^[A-Z_][A-Z0-9_]*$/.test(tokenEnvironment)) {
    throw new Error("--github-token-env must name a canonical environment variable");
  }
  const token = process.env[tokenEnvironment];
  if (typeof token !== "string" || token.length === 0) {
    throw new Error(`${tokenEnvironment} is required to push the bump branch and create the draft PR`);
  }
  const ghEnvironment = { ...process.env, GH_TOKEN: token };

  run("gh", ["auth", "setup-git"], { cwd: hostRoot, env: ghEnvironment });
  run("git", ["rev-parse", "--is-inside-work-tree"], { cwd: hostRoot });
  const status = run("git", ["status", "--porcelain=v1", "--untracked-files=all"], { cwd: hostRoot }).stdout;
  const lockDiff = run("git", ["diff", "--name-only", "--", HOST_CONSUMER_LOCK_PATH], { cwd: hostRoot }).stdout;
  if (lockDiff.trim().length === 0) {
    if (status.trim().length !== 0) {
      throw new Error("host repository has changes even though the consumer lock is already current");
    }
    const currentLock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    if (currentLock.releaseIdentity?.releaseId !== verified.releaseId) {
      throw new Error("host consumer lock has no diff but does not record the verified releaseId");
    }
    console.log(`[reader-ui-bump-pr] PASS already-current releaseId=${verified.releaseId}`);
    process.exit(0);
  }
  exactChangedPath(lockDiff, HOST_CONSUMER_LOCK_PATH, "working tree lock diff");
  const statusPaths = status.split(/\r?\n/).filter(Boolean).map((line) => line.slice(3));
  if (statusPaths.length !== 1 || statusPaths[0] !== HOST_CONSUMER_LOCK_PATH) {
    throw new Error(
      `host repository must contain only ${HOST_CONSUMER_LOCK_PATH} before PR publication; found ${statusPaths.join(",") || "<none>"}`,
    );
  }
  run("git", ["diff", "--check", "--", HOST_CONSUMER_LOCK_PATH], { cwd: hostRoot });

  const remoteCheck = run(
    "git",
    ["ls-remote", "--exit-code", "--heads", "origin", `refs/heads/${verified.branch}`],
    { cwd: hostRoot, env: ghEnvironment, acceptedStatuses: [0, 2] },
  );
  if (remoteCheck.status === 0) {
    const remoteRef = `refs/remotes/origin/${verified.branch}`;
    run("git", ["fetch", "--no-tags", "origin", `refs/heads/${verified.branch}:${remoteRef}`], {
      cwd: hostRoot,
      env: ghEnvironment,
    });
    const parents = run("git", ["rev-list", "--parents", "-n", "1", remoteRef], { cwd: hostRoot }).stdout.trim().split(/\s+/);
    if (parents.length !== 2) throw new Error("existing deterministic bump branch must contain a single-parent commit");
    exactChangedPath(
      run("git", ["diff-tree", "--no-commit-id", "--name-only", "-r", parents[1], remoteRef], { cwd: hostRoot }).stdout,
      HOST_CONSUMER_LOCK_PATH,
      "existing deterministic bump commit",
    );
    const remoteLock = run("git", ["show", `${remoteRef}:${HOST_CONSUMER_LOCK_PATH}`], { cwd: hostRoot }).stdout;
    if (remoteLock !== fs.readFileSync(lockPath, "utf8")) {
      throw new Error("existing deterministic bump branch has a conflicting consumer lock");
    }
    const pulls = parseJson(
      run(
        "gh",
        [
          "pr", "list",
          "--repo", hostRepository,
          "--base", base,
          "--head", verified.branch,
          "--state", "all",
          "--json", "baseRefName,headRefName,isDraft,number,state,url",
        ],
        { cwd: hostRoot, env: ghEnvironment },
      ).stdout,
      "gh pr list",
    );
    if (!Array.isArray(pulls) || pulls.length !== 1) {
      throw new Error("existing deterministic bump branch must have exactly one PR; refusing duplicate or implicit recreation");
    }
    const pull = pulls[0];
    if (pull.state !== "OPEN" || pull.isDraft !== true || pull.baseRefName !== base || pull.headRefName !== verified.branch) {
      throw new Error("existing releaseId PR is not the expected open draft PR; manual resolution is required");
    }
    console.log(`[reader-ui-bump-pr] PASS existing-draft releaseId=${verified.releaseId} url=${pull.url}`);
    process.exit(0);
  }

  run("git", ["switch", "-c", verified.branch], { cwd: hostRoot });
  run("git", ["add", "--", HOST_CONSUMER_LOCK_PATH], { cwd: hostRoot });
  exactChangedPath(
    run("git", ["diff", "--cached", "--name-only"], { cwd: hostRoot }).stdout,
    HOST_CONSUMER_LOCK_PATH,
    "staged bump",
  );
  run(
    "git",
    [
      "-c", "user.name=reader-ui-release-bot",
      "-c", "user.email=reader-ui-release-bot@users.noreply.github.com",
      "commit", "-m", `chore: bump Reader UI to ${verified.tag}`,
    ],
    { cwd: hostRoot },
  );
  run("git", ["push", "--set-upstream", "origin", verified.branch], { cwd: hostRoot, env: ghEnvironment });

  const title = `chore: bump Reader UI to ${verified.tag}`;
  const body = [
    "Automated Reader UI consumer lock bump.",
    "",
    `- Release: \`${verified.releaseId}\``,
    `- Source SHA: \`${verified.sourceSha}\``,
    `- Manifest SHA-256: \`${verified.manifestSha256}\``,
    `- Target config SHA-256: \`${verified.targetConfigSha256}\``,
    `- Artifact ID: \`${verified.artifact.id}\``,
    `- Proof boundary: ${verified.proofBoundary}`,
    "",
    "This PR is intentionally draft and is never auto-merged.",
  ].join("\n");
  const url = run(
    "gh",
    [
      "pr", "create",
      "--repo", hostRepository,
      "--base", base,
      "--head", verified.branch,
      "--draft",
      "--title", title,
      "--body", body,
    ],
    { cwd: hostRoot, env: ghEnvironment },
  ).stdout.trim();
  const pull = parseJson(
    run(
      "gh",
      [
        "pr", "view", verified.branch,
        "--repo", hostRepository,
        "--json", "baseRefName,headRefName,isDraft,number,state,url",
      ],
      { cwd: hostRoot, env: ghEnvironment },
    ).stdout,
    "gh pr view",
  );
  if (pull.state !== "OPEN" || pull.isDraft !== true || pull.baseRefName !== base || pull.headRefName !== verified.branch) {
    throw new Error("created Reader UI bump PR is not an open draft with the expected base/head");
  }
  console.log(`[reader-ui-bump-pr] PASS created releaseId=${verified.releaseId} url=${pull.url || url}`);
} catch (error) {
  console.error(`[reader-ui-bump-pr] FAIL ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
