// Reader Auto Layout F0 — proof that we can drive the logged-in Figma app
// to convert a fixed-canvas Shell into a real Auto Layout component.
//
// Scope: ONLY Shell/MainTabShell (component id 277:6). Converts root from
// layoutMode NONE to VERTICAL Auto Layout and gives children responsive sizing:
//   statusBar     — fixed 48h, stretch width
//   appTopBar     — fixed 58h, stretch width
//   contentRegion — layoutGrow 1 (fills remaining height), stretch width
//   mainNav       — fixed 68h, stretch width
//   stateHost     — absolute overlay (position out of flow)
//
// Idempotent: safe to run repeatedly. Reports a summary via figma.closePlugin.
function* walk(node: BaseNode): Generator<BaseNode> {
  yield node;
  if ('children' in node) {
    for (const c of node.children as readonly BaseNode[]) yield* walk(c);
  }
}

function findComponent(name: string): ComponentNode | undefined {
  for (const page of figma.root.children) {
    for (const n of walk(page)) {
      if (n.type === 'COMPONENT' && n.name === name) return n;
    }
  }
  return undefined;
}

function main() {
  const shell = findComponent('Shell/MainTabShell');
  if (!shell) {
    figma.closePlugin('F0: Shell/MainTabShell not found');
    return;
  }
  const before = (shell as FrameNode).layoutMode ?? 'NONE';

  (shell as FrameNode).layoutMode = 'VERTICAL';
  (shell as FrameNode).primaryAxisSizingMode = 'FIXED';
  (shell as FrameNode).counterAxisSizingMode = 'FIXED';
  (shell as FrameNode).itemSpacing = 0;
  (shell as FrameNode).paddingLeft = 0;
  (shell as FrameNode).paddingRight = 0;
  (shell as FrameNode).paddingTop = 0;
  (shell as FrameNode).paddingBottom = 0;

  const byName = new Map<string, SceneNode>();
  for (const c of shell.children as readonly SceneNode[]) byName.set(c.name, c);

  const stretch: string[] = ['statusBar', 'appTopBar', 'contentRegion', 'mainNav'];
  for (const name of stretch) {
    const c = byName.get(name);
    if (!c || !('layoutAlign' in c)) continue;
    c.layoutAlign = 'STRETCH';
  }
  const content = byName.get('contentRegion');
  if (content && 'layoutGrow' in content) content.layoutGrow = 1;

  const stateHost = byName.get('stateHost');
  if (stateHost && 'layoutPositioning' in stateHost) stateHost.layoutPositioning = 'ABSOLUTE';

  const after = (shell as FrameNode).layoutMode;
  figma.closePlugin(`F0: MainTabShell layoutMode ${before} -> ${after}`);
}

main();