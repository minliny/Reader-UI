import fs from "node:fs";
import path from "node:path";

function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8"));
}

export function sortPaths(values) {
  return [...values].sort(compareUtf8);
}

export function assertSafeRelativePath(relativePath) {
  if (typeof relativePath !== "string" || relativePath.length === 0) {
    throw new Error("manifest path must be a non-empty string");
  }
  if (relativePath.includes("\0") || relativePath.includes("\\")) {
    throw new Error(`unsafe manifest path: ${JSON.stringify(relativePath)}`);
  }
  if (path.posix.isAbsolute(relativePath) || path.win32.isAbsolute(relativePath)) {
    throw new Error(`absolute manifest path is forbidden: ${relativePath}`);
  }

  const segments = relativePath.split("/");
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`non-canonical manifest path is forbidden: ${relativePath}`);
  }
  if (path.posix.normalize(relativePath) !== relativePath) {
    throw new Error(`non-canonical manifest path is forbidden: ${relativePath}`);
  }
  return relativePath;
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

export function resolveSafeRegularFile(root, relativePath) {
  assertSafeRelativePath(relativePath);
  const absoluteRoot = fs.realpathSync(root);
  let candidate = absoluteRoot;

  for (const segment of relativePath.split("/")) {
    candidate = path.join(candidate, segment);
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) {
      throw new Error(`symlink is forbidden in release manifest inputs: ${relativePath}`);
    }
  }

  const stat = fs.statSync(candidate);
  if (!stat.isFile()) throw new Error(`release manifest input is not a regular file: ${relativePath}`);
  const realCandidate = fs.realpathSync(candidate);
  if (!isWithinRoot(absoluteRoot, realCandidate)) {
    throw new Error(`release manifest input escapes repository root: ${relativePath}`);
  }
  return realCandidate;
}

function resolveSafeDirectory(root, relativePath) {
  assertSafeRelativePath(relativePath);
  const absoluteRoot = fs.realpathSync(root);
  let candidate = absoluteRoot;

  for (const segment of relativePath.split("/")) {
    candidate = path.join(candidate, segment);
    const stat = fs.lstatSync(candidate);
    if (stat.isSymbolicLink()) {
      throw new Error(`symlink is forbidden in release manifest inputs: ${relativePath}`);
    }
  }

  if (!fs.statSync(candidate).isDirectory()) {
    throw new Error(`release manifest input is not a directory: ${relativePath}`);
  }
  return candidate;
}

function listFiles(root, relativeDirectory, { recursive, include }) {
  const absoluteDirectory = resolveSafeDirectory(root, relativeDirectory);
  const files = [];

  function visit(absoluteParent, relativeParent) {
    const entries = fs.readdirSync(absoluteParent, { withFileTypes: true })
      .sort((left, right) => compareUtf8(left.name, right.name));
    for (const entry of entries) {
      const relativeEntry = `${relativeParent}/${entry.name}`;
      if (entry.isSymbolicLink()) {
        throw new Error(`symlink is forbidden in release manifest inputs: ${relativeEntry}`);
      }
      if (entry.isDirectory()) {
        if (recursive) visit(path.join(absoluteParent, entry.name), relativeEntry);
        continue;
      }
      if (entry.isFile() && include(relativeEntry)) files.push(relativeEntry);
    }
  }

  visit(absoluteDirectory, relativeDirectory);
  return sortPaths(files);
}

function existingOptionalFiles(root, relativePaths) {
  const files = [];
  for (const relativePath of relativePaths) {
    const candidate = path.join(root, ...relativePath.split("/"));
    if (!fs.existsSync(candidate)) continue;
    resolveSafeRegularFile(root, relativePath);
    files.push(relativePath);
  }
  return sortPaths(files);
}

function existingOptionalDirectoryFiles(root, relativeDirectory) {
  const candidate = path.join(root, ...relativeDirectory.split("/"));
  if (!fs.existsSync(candidate)) return [];
  return listFiles(root, relativeDirectory, { recursive: true, include: () => true });
}

// Groups deliberately overlap. A file has one raw-byte digest in `files`, while
// each group provides a scoped aggregate for consumers that only implement one
// ABI surface. New schema, fixture, generated, or top-level ui-spec JSON files
// are picked up automatically instead of relying on a manually maintained list.
export const manifestFileGroups = Object.freeze([
  {
    name: "design-runtime",
    files(root) {
      const runtimeExtensions = new Set([".css", ".html", ".js", ".jpg", ".jpeg", ".png", ".svg", ".webp"]);
      const includeRuntimeFile = (relativePath) => runtimeExtensions.has(path.extname(relativePath).toLowerCase());
      return sortPaths([
        "frontend-demo-optimized/asset-library/icons.js",
        "frontend-demo-optimized/fixture.js",
        "frontend-demo-optimized/index.html",
        "frontend-demo-optimized/motion-controller.js",
        "frontend-demo-optimized/motion-tokens.css",
        "frontend-demo-optimized/render-runtime.js",
        "frontend-demo-optimized/render.js",
        "frontend-demo-optimized/route-contract.js",
        "frontend-demo-optimized/shared-shell-kit/kit.css",
        "frontend-demo-optimized/shared-shell-kit/kit.js",
        "frontend-demo-optimized/styles.css",
        "frontend-demo-optimized/tokens.css",
        ...listFiles(root, "frontend-demo-optimized/asset-library/icons", {
          recursive: true,
          include: includeRuntimeFile,
        }),
        ...listFiles(root, "frontend-demo-optimized/covers", {
          recursive: true,
          include: includeRuntimeFile,
        }),
        ...listFiles(root, "frontend-demo-optimized/renderers", {
          recursive: true,
          include: includeRuntimeFile,
        }),
        ...listFiles(root, "frontend-demo-optimized/styles", {
          recursive: true,
          include: includeRuntimeFile,
        }),
      ]);
    },
  },
  {
    name: "device-conformance",
    files(root) {
      return sortPaths([
        "contracts/device-conformance-evidence.schema.json",
        "contracts/device-conformance-plan.schema.json",
        "contracts/fixtures/host-request.fixtures.json",
        "contracts/fixtures/host-result.fixtures.json",
        "contracts/host-request.schema.json",
        "contracts/host-result.schema.json",
        ...listFiles(root, "device-conformance", {
          recursive: true,
          include: (relativePath) => relativePath.endsWith(".json"),
        }),
      ]);
    },
  },
  {
    name: "fixtures",
    files(root) {
      return listFiles(root, "contracts/fixtures", {
        recursive: true,
        include: (relativePath) => relativePath.endsWith(".json"),
      });
    },
  },
  {
    name: "generated",
    files(root) {
      return listFiles(root, "generated", { recursive: true, include: () => true });
    },
  },
  {
    name: "package-entrypoints",
    files(root) {
      return sortPaths([
        "Package.swift",
        "build.gradle.kts",
        "gradlew",
        "gradlew.bat",
        "packages/arkts/reader-ui-runtime/src/main/module.json5",
        "packages/kotlin/reader-ui-runtime/build.gradle.kts",
        "reader-ui-contract/build.gradle.kts",
        "settings.gradle.kts",
        ...listFiles(root, "gradle/wrapper", { recursive: true, include: () => true }),
        ...listFiles(root, "packages/arkts/reader-ui-runtime", {
          recursive: false,
          include: (relativePath) => [".ets", ".json5", ".ts"].includes(path.extname(relativePath)),
        }),
        ...existingOptionalFiles(root, ["gradle.properties"]),
      ]);
    },
  },
  {
    name: "primitive-abi",
    files() {
      return [
        "contracts/core-command.schema.json",
        "contracts/core-event.schema.json",
        "contracts/host-request.schema.json",
        "contracts/motion.schema.json",
        "contracts/ui-event.schema.json",
        "contracts/view-state.schema.json",
      ];
    },
  },
  {
    name: "runtime-actions",
    files() {
      return ["ui-spec/runtime-actions.json"];
    },
  },
  {
    name: "runtime-packages",
    files(root) {
      return sortPaths([
        ...listFiles(root, "packages/reference", {
          recursive: true,
          include: (relativePath) => relativePath.endsWith(".mjs"),
        }),
        ...listFiles(root, "packages/swift/ReaderUIRuntime/Sources", {
          recursive: true,
          include: (relativePath) => relativePath.endsWith(".swift"),
        }),
        ...listFiles(root, "packages/kotlin/reader-ui-runtime/src/main/kotlin", {
          recursive: true,
          include: (relativePath) => relativePath.endsWith(".kt"),
        }),
        ...listFiles(root, "packages/arkts/reader-ui-runtime/src/main/ets", {
          recursive: true,
          include: (relativePath) => relativePath.endsWith(".ets"),
        }),
      ]);
    },
  },
  {
    name: "schemas",
    files(root) {
      return sortPaths([
        ...listFiles(root, "contracts", {
          recursive: false,
          include: (relativePath) => relativePath.endsWith(".schema.json"),
        }),
        ...listFiles(root, "ui-spec", {
          recursive: false,
          include: (relativePath) => relativePath.endsWith(".schema.json"),
        }),
      ]);
    },
  },
  {
    name: "screen-graph",
    files(root) {
      return sortPaths([
        "contracts/fixtures/route.fixtures.json",
        "contracts/fixtures/view-state.fixtures.json",
        "contracts/route.schema.json",
        "contracts/view-state.schema.json",
        ...existingOptionalFiles(root, ["ui-spec/screen-graph.json"]),
        ...existingOptionalDirectoryFiles(root, "ui-spec/screens"),
      ]);
    },
  },
  {
    name: "ui-spec",
    files(root) {
      return listFiles(root, "ui-spec", {
        recursive: false,
        include: (relativePath) => relativePath.endsWith(".json") && !relativePath.endsWith(".schema.json"),
      });
    },
  },
  {
    name: "version",
    files() {
      return ["contracts/VERSION.json"];
    },
  },
]);

export function collectManifestGroups(root) {
  const names = manifestFileGroups.map((group) => group.name);
  if (new Set(names).size !== names.length) throw new Error("release manifest group names must be unique");
  if (sortPaths(names).some((name, index) => name !== names[index])) {
    throw new Error("release manifest groups must be declared in UTF-8 byte order");
  }

  return manifestFileGroups.map((group) => {
    const files = sortPaths(group.files(root));
    if (files.length === 0) throw new Error(`release manifest group is empty: ${group.name}`);
    if (new Set(files).size !== files.length) throw new Error(`duplicate path in release manifest group: ${group.name}`);
    for (const relativePath of files) resolveSafeRegularFile(root, relativePath);
    return { name: group.name, files };
  });
}
