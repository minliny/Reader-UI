# Motion Evidence

此目录存放 `MOTION_SELECTOR_MATRIX.md`、`MOTION_CONTRACT.md` 和 `MOTION_EFFECTS.md` 对应的动效证据。

## Source verification

运行：

```bash
node frontend-demo/verify/motion/verify-motion-coverage.mjs
```

脚本会检查当前 `frontend-demo` 的 route 覆盖、Motion selector 覆盖、`motion-controller.js` 加载顺序和 runtime 接入点，并输出：

- `frontend-demo/verify/motion/motion-coverage-report.json`

同时会检查：

- `frontend-demo/verify/motion/evidence/manifest.json`
- `frontend-demo/verify/motion/evidence/*`

当前 `evidence/manifest.json` 是 P0 Motion ID 的第一批代表性浏览器截图证据，覆盖首启、Tab 切换、下拉展开、封面进入、自动翻页胶囊、控制层运行空间、orientation 和 interrupt。它不是全量录屏闭环，不能替代后续真实设备、折叠屏、reduced-motion 和每个 selector 的媒体证据。

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
