# Generated Kotlin Contracts

本目录保存 Reader UI Contract 的 Kotlin 生成产物。

生成命令：

```bash
# from repository root
node tools/codegen/generate.mjs
```

当前产物（VERSION.json 1.3.0）：13 个 .kt 文件

- Route.kt / UiEvent.kt / UiState.kt / ViewState.kt / Motion.kt / Token.kt
- CoreCommand.kt / CoreEvent.kt / HostRequest.kt / ProgressLocation.kt / Content.kt / SyncConflict.kt
- StateRule.kt

规则：

- Do not hand-edit generated Kotlin outputs. 所有修改必须通过 schema + codegen。
- 生成文件全部带 AUTO-GENERATED 标识。
- 平台仓库（Reader for Android）应通过 Gradle / composite build 引用本目录，不应手写复制。
- generated drift check：运行 codegen 后 git diff 必须为空。
