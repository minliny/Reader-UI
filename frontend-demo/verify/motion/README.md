# Motion Evidence

此目录存放 `MOTION_SELECTOR_MATRIX.md`、`MOTION_CONTRACT.md` 和 `MOTION_EFFECTS.md` 对应的动效证据。

## Source verification

运行：

```bash
node frontend-demo/verify/motion/verify-motion-coverage.mjs
```

脚本会检查当前 `frontend-demo` 的 route 覆盖、Motion selector 覆盖、`motion-controller.js` 加载顺序和 runtime 接入点，并输出：

- `frontend-demo/verify/motion/motion-coverage-report.json`

命名规则：

- `selector-matrix/<motion-id>__<route>__<selector-slug>.png`
- `selector-matrix/<motion-id>__<route>__<selector-slug>.webm`
- `reader/<motion-id>__<route>__<state>.webm`
- `viewport/<motion-id>__<viewport-class>__<route>.webm`

证据要求：

- 每份证据必须能反查到 Motion ID。
- reduced-motion 证据在文件名追加 `__reduced-motion`。
- 同一 Motion ID 多个入口可先录代表入口，但 `MOTION_SELECTOR_MATRIX.md` 的 `Evidence` 列需要写明具体文件。
