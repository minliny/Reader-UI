# 发现 / RSS / 设置深层链路闭合报告

日期：2026-06-25

## 结论

当前 demo 以 `frontend-demo-draft/route-contract.js` 作为 route 与深层链路契约源。发现、RSS、设置均已纳入当前主导航，深层页面不再停留在“后续待闭合”的文档口径中，而是由 manifest、handoff HTML 和 demo route 三侧共同校验。

## 闭合范围

| 模块 | Demo route | Manifest target | Handoff normalized HTML |
| --- | ---: | ---: | ---: |
| 发现 | 1 | 2 | 1 |
| RSS | 1 | 2 | 5 |
| 设置 | 8 | 16 | 15 |

## 契约来源

- `frontend-demo-draft/route-contract.js`：定义 `routes` 与 `deepRouteClosure`。
- `validate-frontend-inputs.js`：读取 `deepRouteClosure`，校验 demo route、manifest target 和 handoff 页面是否齐全。
- `manifest.json`：继续作为 preview / state-matrix 目标清单。

## 验收口径

完整验证必须满足：

```text
deepRouteClosureContract.passed = true
frontendDemoSplitContract.passed = true
navigationContract.passed = true
projectStructureContract.duplicateEntryCount = 0
```

这意味着发现 / RSS / 设置的深层页面缺失、demo route 缺失、handoff 页面缺失，都会直接导致验证失败。
