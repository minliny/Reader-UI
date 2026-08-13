# Generated ArkTS Contracts

本目录保存 Reader UI Contract 的 ArkTS 生成产物。

生成命令：

```bash
# from repository root
node tools/codegen/generate.mjs
```

当前产物（VERSION.json 3.1.1）：16 个 .ets 文件

- Route.ets / UiEvent.ets / UiState.ets / ViewState.ets / Motion.ets / Token.ets / Appearance.ets
- CoreCommand.ets / CoreEvent.ets / HostRequest.ets / ProgressLocation.ets / Content.ets / SyncConflict.ets
- StateRule.ets / MotionPolicy.ets
- ScreenGraph.ets

规则：

- Do not hand-edit generated ArkTS outputs. 所有修改必须通过 schema + codegen。
- 生成文件全部带 AUTO-GENERATED 标识。
- 平台仓库（Reader for HarmonyOS）应通过 hvigor / har 引用本目录，不应手写复制。
- generated drift check：运行 codegen 后 git diff 必须为空。
