# Generated Swift Contracts

本目录保存 Reader UI Contract 的 Swift 生成产物。

生成命令：

```bash
# from repository root
node tools/codegen/generate.mjs
```

当前产物（VERSION.json 2.2.0）：14 个 .swift 文件

- Route.swift / UiEvent.swift / UiState.swift / ViewState.swift / Motion.swift / Token.swift
- CoreCommand.swift / CoreEvent.swift / HostRequest.swift / ProgressLocation.swift / Content.swift / SyncConflict.swift
- StateRule.swift / MotionPolicy.swift

规则：

- Do not hand-edit generated Swift outputs. 所有修改必须通过 schema + codegen。
- 生成文件全部带 AUTO-GENERATED 标识。
- 平台仓库（Reader for iOS）应通过 SwiftPM Package 引用本目录，不应手写复制。
- generated drift check：运行 codegen 后 git diff 必须为空。
