# Reader UI Contract Codegen

本目录用于放置 Reader UI Contract 的 codegen 工具。

规划目标：

```text
contracts/*.schema.json
  -> tools/codegen
  -> generated/swift
  -> generated/kotlin
  -> generated/arkts
```

当前阶段只建立目录边界。后续新增生成器时必须满足：

- 输入只来自 `../contracts/` 下的 schema 和 fixtures。
- 输出不得手写覆盖平台仓库内的业务代码。
- 生成产物必须可重复，不能依赖本机绝对路径。
- schema breaking change 必须让三端生成或测试失败。
