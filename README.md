# Reader-UI

本仓保存 JSON 契约快照、漫画共享 DTO/样本、字体与设计工具；没有可运行应用或独立构建产物。实际产品
UI 在 `Reader-for-HarmonyOS`，业务协议在 `Reader-Core-Native`。

三份契约当前声明 Core command 78、Host request 58、UI event 300；数量由 `tools/validate.py` 校验。Core 的严格
drift 门禁会把直接 UI 命令、显式映射和 Core/Host 内部编排分别分类，任何新增且未分类的方法都会
阻断开发门禁。该快照仍不能单独证明产品实现或发布就绪。不要在本仓新增状态文档；统一结论见
[`../README.md`](../README.md) 与 [`../AUDIT_2026-08-12.md`](../AUDIT_2026-08-12.md)。

本地校验：在隔离 Python 环境安装 `tools/requirements.txt` 后执行 `python tools/validate.py`。
GitHub 的 `UI CI / ui-source-gate` 使用同一校验工具检查 JSON Schema、枚举数量、颜色范围和插件入口语法，
并运行字体完整性、主题生成副本和源码卫生检查；全部检查只使用本仓源码与资产。

`figma-auto-layout` 插件保留 `code.ts` 源码；修改后先执行 `npm ci --ignore-scripts` 和
`npm run build:plugins`，再用 `npm run check:plugins` 校验 `code.js` 与固定 TypeScript 5.9.3
编译器生成结果一致。插件清单仍使用 JavaScript 入口；这项检查不代表 Figma 运行验收。

漫画的数据形状见 `contracts/manga.ts`。Core 清单中的 `pageId` 是逻辑图片身份，
`resourceRef` 是不含签名 URL/Cookie 的资源引用；临时请求只进入会话。
位置由清单版本、逻辑页和原图归一化坐标组成，显示切片数量不改变页序。
`ReaderShell.contentKind` 必须来自 Core 类型事实，不能从自由文本题材字段推断。
本仓 DTO 与 HarmonyOS 的 `MangaContract.ts` 同步，产品阶段及未完成项仍只记根待办。
