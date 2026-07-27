# HostRequest / HostResult 1.2 Contract

## 1. 权威文件

- 请求类型与 DTO：[`host-request.schema.json`](./host-request.schema.json)
- 成功结果 DTO：[`host-result.schema.json`](./host-result.schema.json)
- 唯一有效样例：[`host-request.fixtures.json`](./fixtures/host-request.fixtures.json) 与 [`host-result.fixtures.json`](./fixtures/host-result.fixtures.json)

Reader UI 2.5 的 Host surface 是 58 个唯一 `type`。`type` 判别 `payload` / `result`，每个分支都关闭未知字段。新增 type 或新增可选字段属于 MINOR；删除、改名、改变必填字段或字段类型属于 MAJOR。

HostResult 只描述成功返回。能力不可用、用户取消以外的平台失败、校验失败、CAS conflict 与物理操作失败必须走 HostFailure；不得用虚构的成功布尔值掩盖失败。

## 2. 字段来源与裁决

本契约于 2026-07-11 对照以下生产实现提取：

- iOS：`iOS/CoreBridge/Host*Capability.swift`
- Android：`app/src/main/kotlin/com/reader/host/*Handler.kt` 与 `ReaderUi25HostCapabilityHandlers.kt`
- HarmonyOS：`HarmonyReaderUiHostPlatform.ets`、`host/types/HostRequest.ets`、`host/types/HostResult.ets` 及对应 adapter
- Reader UI：`ARCHITECTURE.md`、`CORE_HOST_BOUNDARY.md` 与 executable runtime 实际发出的 effect

裁决顺序是：Reader UI canonical 名称与 executable runtime 负载优先；三端均能承载的字段进入 wire；单一平台历史 alias 不进入 schema。Host 必须在 adapter 边界把 canonical DTO 转为平台 API 参数。

W4 appearance 的四个关键结果固定为：

- `persistence.get`：`{found:false}` 或 `{found:true,value,revision}`
- `persistence.put`：`{stored:true,revision}`
- `font.registerFile`：`{registered:true,path,familyName,fontNames}`，字体身份以 Host 返回值为准
- `font.unregisterFile`：`{logicalUnregistered:true,physicallyUnregistered,restartRequired}`；不能物理卸载时必须 `restartRequired:true`

## 3. 当前 Host 适配缺口

以下是 schema 收紧时发现的历史 handler 漂移，不是 canonical wire 的兼容字段，也不代表设备能力已经验收：

| 平台 | 历史字段 / 结果 | canonical 字段 / 结果 |
| --- | --- | --- |
| iOS | credential `service/account` | `key` / `value` |
| Android | credential `identifier` 与 WebDAV 复合 DTO | `key` / `value` |
| iOS / Android | permission `type` / `kind` | `scope` |
| iOS / Android | storage `kind` | `scope` |
| iOS | `file.write.data` | `content` 或 `contentBase64` |
| iOS | `webview.evaluate.document/javaScript` | `url/script` |
| Android | `device.vibrate.durationMillis` | `durationMs` |
| Android / iOS | TTS stop/pause/resume 历史布尔字段 | `tts.system.*` 使用 `acknowledged` |
| Android | notification `message/purpose` | `id/title/body` |

这些差异需要 Host adapter 后续适配并由各 Host 仓测试证明；本次 Reader UI 契约变更不越界修改 Host，也不把 contract fixture 当作模拟器、真机或发布证据。

## 4. 验收门禁

`host-request-result-contract.test.mjs` 强制：

- request/result 各 58 个 fixture，type 集合与顺序完全一致且无重复；
- 每个 fixture 通过 Draft 2020-12 Ajv；
- 每个 payload/result 拒绝未知字段；
- 非空 payload 拒绝标量类型漂移；
- W4 persistence/font result 不变量 fail closed；
- 已知平台 alias 不能进入 canonical wire。
