# Reader-UI

本仓保存 JSON 契约快照、漫画共享 DTO/样本、字体与设计工具；没有可运行应用或独立构建产物。实际产品
UI 在 `Reader-for-HarmonyOS`，业务协议在 `Reader-Core`。

三份契约当前声明 Core command 78、Host request 58、UI event 300；数量由 `tools/validate.py` 校验。Core 的严格
drift 门禁会把直接 UI 命令、显式映射和 Core/Host 内部编排分别分类，任何新增且未分类的方法都会
阻断开发门禁。该快照仍不能单独证明产品实现或发布就绪。不要在本仓新增状态文档；统一结论见
[`../README.md`](../README.md) 与 [`../AUDIT_2026-08-12.md`](../AUDIT_2026-08-12.md)。

本地入口默认只列 `NOT_RUN`。执行前逐项说明具体风险及必要性，选择需要的检查：

```text
python scripts/check-assets.py --checks schemas --rationale '<所选 Schema 的具体必要性>'
python scripts/check-assets.py --checks fonts --rationale '<所选字体/许可的具体必要性>'
python tools/validate.py --checks contracts --rationale '<所选枚举及数量的具体必要性>'
python tools/validate.py --checks colors --rationale '<主题颜色范围的具体必要性>'
python tools/validate.py --checks plugin-entries --rationale '<插件清单入口的具体必要性>'
```

Schema 有效性与合同枚举检查分开，避免同轮重复；原 `validate_contract` 的 Schema 检查源码保留，可显式附加 `--schema-check`。仅所选 Schema 检查需 jsonschema，字体检查需 fontTools；完整资产组合 `--checks all` 还需用户明确要求、`--full-suite-requested` 和逐项依据。

GitHub `UI CI / ui-source-gate` 仅 `workflow_dispatch`，按具名 `checks` 选择单项并要求 `rationale`；push/PR 不自动运行。`full` 还需 `full_suite_requested=true`，未选检查为 `NOT_RUN`；已选缺工具或失败仍失败。工作流配置修改不等于已修改远端分支保护，也不代表 CI 已运行。

`figma-auto-layout` 插件保留 `code.ts` 源码。对应源/生成器变更时才显式安装锁定依赖、运行 `npm run build:plugins`，再按必要性调用 `npm run check:plugins`。主题、插件语法、workflow lint 和当前源码秘密扫描分别选择；上游 analyzer 仍固定 actionlint 1.7.7 / gitleaks 8.24.2。检查不代表 Figma 或 HarmonyOS 运行验收。

漫画的数据形状见 `contracts/manga.ts`。Core 清单中的 `pageId` 是逻辑图片身份，
`resourceRef` 是不含签名 URL/Cookie 的资源引用；临时请求只进入会话。
位置由清单版本、逻辑页和原图归一化坐标组成，显示切片数量不改变页序。
`ReaderShell.contentKind` 必须来自 Core 类型事实，不能从自由文本题材字段推断。
本仓 DTO 与 HarmonyOS 的 `MangaContract.ts` 同步，产品阶段及未完成项仍只记根待办。
