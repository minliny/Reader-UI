# Generated Contract Outputs

本目录保存 Reader UI Contract 的生成产物。当前已由 tools/codegen/generate.mjs 从 contracts/*.schema.json + fixtures/*.fixtures.json 生成三端类型文件。

当前产物（VERSION.json 1.2.0）：

```text
generated/
  swift/    13 个 .swift 文件
  kotlin/   13 个 .kt 文件
  arkts/    13 个 .ets 文件
```

每个端 13 个文件对应 13 个 schema：route / ui-event / ui-state / view-state / motion / token / core-command / core-event / host-request / progress-location / content / sync-conflict / state-rule。

生成方式：

```bash
cd tools/codegen
node generate.mjs
```

要求：

- 输入只来自 contracts/ 下的 schema 和 fixtures。
- 输出不得手写覆盖平台仓库内的业务代码。
- 生成产物必须可重复，不能依赖本机绝对路径。
- schema breaking change 必须让三端生成或测试失败。
- generated drift check：运行 codegen 后必须无 diff，否则说明 generated 与 schema 不一致。

平台仓库接入方式：

- 优先通过本地路径、SwiftPM Package 或等价包管理引用 generated 产物。
- 独立 Reader-UI-Contract 仓库只有在 schema/codegen 已被三端实际消费并稳定后再考虑。
- 不允许平台仓库手写复制 generated 类型后绕过 drift check。
