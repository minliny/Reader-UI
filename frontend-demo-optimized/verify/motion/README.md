# Motion Evidence

此目录存放 `MOTION_SELECTOR_MATRIX.md`、`MOTION_CONTRACT.md` 和 `MOTION_EFFECTS.md` 对应的动效证据。

## Source verification

运行：

```bash
node tools/motion/generate-demo-motion-registry.mjs --check
node --test frontend-demo-optimized/verify/motion/*.test.mjs
node frontend-demo-optimized/verify/motion/verify-motion-coverage.mjs
READER_PLAYWRIGHT_MODULE=/path/to/playwright node tools/motion/capture-browser-motion-evidence.mjs
```

脚本会检查当前 `frontend-demo` 的 route 覆盖、Motion selector 覆盖、`motion-controller.js` 加载顺序和 runtime 接入点，并输出：

- `frontend-demo-optimized/verify/motion/motion-coverage-report.json`

同时会检查：

- `frontend-demo-optimized/verify/motion/evidence/manifest.json`
- `frontend-demo-optimized/verify/motion/evidence/*`

当前 `evidence/manifest.json` 含 9 张历史代表截图和 7 段可重录的 Playwright WebM，连续覆盖首启、Tab 切换、下拉展开/收起、封面进入、快速打断、viewport 往返和 reduced-motion。每段 WebM 登记 byteLength 与 SHA-256。它仍不是全量录屏闭环，不能替代后续真实设备、折叠屏、无障碍、性能和每个 selector 的媒体证据。

`motion-contract-registry.js` 由 canonical MotionSpec / MotionPolicy / route shell fixtures 生成；`motion-scenario-harness.js` 对十个核心家族执行 normal、rapid-repeat、opposite、interrupt、reduced 五类确定性 trace，并覆盖四种 interrupt policy。该 trace 门禁证明状态收束与 no-match 行为，不等于 WebM 或原生设备画面证据。

命名规则：

- `selector-matrix/<motion-id>__<route>__<selector-slug>.png`
- `selector-matrix/<motion-id>__<route>__<selector-slug>.jpg`
- `selector-matrix/<motion-id>__<route>__<selector-slug>.webm`
- `evidence/<motion-id>__<route>__<state>.jpg`
- `reader/<motion-id>__<route>__<state>.webm`
- `viewport/<motion-id>__<viewport-class>__<route>.webm`

证据要求：

- 每份证据必须能反查到 Motion ID。
- reduced-motion 证据在文件名追加 `__reduced-motion`。
- 同一 Motion ID 多个入口可先录代表入口，但 `MOTION_SELECTOR_MATRIX.md` 的 `Evidence` 列需要写明具体文件。
