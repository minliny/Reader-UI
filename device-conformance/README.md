# R18 Device Conformance Kit

本目录是 HostRequest 1.2.0 / HostResult 1.0.0 的确定性执行计划，不是设备执行结果。fixture schema/shape 校验只能证明 wire contract，不能把 `deviceVerified` 改为 `true`。

## 固定计数

- Host：3（ios / android / harmonyos）
- 每端 type：58，三端计划项：174
- 初始 deviceVerified：0/174
- destructive：每端 10，三端 30
- externalSideEffect：每端 48，三端 144

| 最低 proof tier | 每端 | 三端 |
| --- | ---: | ---: |
| manual | 18 | 54 |
| physical | 21 | 63 |
| simulator | 15 | 45 |
| unit | 4 | 12 |

| capability | 每端 | 三端 |
| --- | ---: | ---: |
| background | 4 | 12 |
| brightness | 2 | 6 |
| clipboard | 4 | 12 |
| cookie | 3 | 9 |
| credential | 3 | 9 |
| device | 3 | 9 |
| file | 4 | 12 |
| font | 2 | 6 |
| haptics | 3 | 9 |
| http | 2 | 6 |
| network | 1 | 3 |
| notification | 2 | 6 |
| permission | 2 | 6 |
| persistence | 2 | 6 |
| screen | 2 | 6 |
| share | 3 | 9 |
| storage | 1 | 3 |
| timer | 2 | 6 |
| tts | 7 | 21 |
| webdav | 3 | 9 |
| webview | 3 | 9 |

## 证据门槛

只有严格 evidence schema、58-type exact order、三端 174 条逐项记录、可信 R13 sourceSha/manifestSha、非占位 deviceId、达到最低 proof tier、canonical observed result，以及可重算 SHA-256 的实际 artifact 全部通过时，验证器才返回 `deviceVerified=true`。缺项、重复、乱序、summary-only、失败结果、自报发布身份或不存在的 artifact 均 fail closed。

R13 追溯不在计划中嵌入伪 tag/伪 release identity：运行时必须从 staged release metadata 或已验证 consumer lock 取得 sourceSha，并对实际 `UI_RELEASE_MANIFEST.json` 原始字节重算 manifestSha。

## 物理阻塞边界

本地生成阶段未调用设备、模拟器或网络，因此物理/人工最低门槛仍为每端 39 项、三端 117 项；本文件不声明任何设备当前可用，也不产生设备通过证明。这些项目只能由对应 host 在可归属的真实目标上执行并保存 artifact 后关闭。

最低为 unit/simulator 的项目同样默认未验证；代码单测或 fixture 校验不会自动生成 evidence。
