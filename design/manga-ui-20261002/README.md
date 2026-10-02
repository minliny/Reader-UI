# 漫画 UI 设计实施基准 · 2026-10-02

用户在查看独立漫画 demo 后明确要求：**“保留并记录此设计稿，生成独立 worktree，落实这些改动”**。本目录据此保存精确设计输入，作为本轮独立漫画 worktree 的实施基准。它是设计归档，不是第二份活动进度账；生产状态仍由工作区权威待办及 Host 实施证据承接。

本轮授权涵盖此稿的漫画页面、漫画对共用页面的适配及此前指定的浮栏视觉改动。历史方案、QA 和模板说明里的“仅设计／待评审”按原字节保留，它们描述此前阶段；本轮用户的实施授权优先。归档不等于已经更新云端 Figma、应用产物、VM、真机或完成用户对实际应用的验收。

## 精确保留的内容

- `prototype/src/Prototype.tsx` 与 `prototype/src/prototype.css`：用户查看的可点击稿原始实现。
- `records/DESIGN_PLAN.md`：逐页信息、三类目录条目、阅读六态、宽屏和深色方案。
- `records/QA.md`、`QA_RESULT.json`、`qa-scripts/`：原本地检查记录与脚本。
- `screenshots/`：原 22 张截图；`records/qa-debug/qa-detail.png` 是早期侦察画面，保留作原始证据，不替代最终截图。
- `prototype/`：复现需要的 React/Vite 代码、移动设备运行时、依赖 lock、运行时 hash lock、测试、构建脚本及实际引用字体／图标／设备资产。
- `INPUT_MANIFEST.json`：每份输入的来源相对路径、角色、字节数和 SHA-256。`ARCHIVE_SHA256.json` 另覆盖归档说明、实施映射及复现工具。

排除 `node_modules`、`dist`、`.git`、旧书架／详情参考照片、小说封面、未被本稿引用的 Reader 资产与私有签名材料。Noto 字体许可保存在 `licenses/Noto-OFL.txt`；原 UI 仓仍保留同源字体。

## 阅读入口

先看 `screenshots/01-detail.png` 与 `records/DESIGN_PLAN.md`；再依顺序看目录 `02`、漫画阅读／各面板 `03`–`08`、动态换源 `09`–`10`、书源 `11`、搜索 `12`、书架 `13`、卷末 `14`、宽屏 `15`–`16`／`22`、深色 `17`–`20`、窄网页 `21`。文件名对应实际存档，部分后续检查截图补充前一版画面。

生产映射及保留边界见 `IMPLEMENTATION_MAP.md`。虚构的“山海纪行”、作者、来源、章节、延迟与百分比是布局样例；生产必须消费真实内容、Core 类型及位置事实，不移植 demo 的 timer、样本数组或百分比算法。

## 复现

归档不依赖原 demo 的 `node_modules` 软链。具备满足所锁定依赖要求的 Node.js 和 npm 后，在 `prototype/` 执行：

```sh
npm ci
npm run check:runtime
npm run build
npm run dev -- --host 127.0.0.1 --port 4197
```

端口被原 demo 占用时使用另一未占用端口；不要终止原预览。本稿可以切换详情、完整目录、换源、书源、搜索、书架及阅读，且提供暖纸／深墨与横屏／平板布局对照。所有数据写入仅是内存样例。

`tools/verify-archive.py` 不需第三方依赖，会核对归档和源输入 hash，并拒绝缺失、改变或禁入的文件。要重跑原 Python QA，安装 Python Playwright 及 Chromium，再执行 `tools/replay-qa.py`；该工具仅替换原脚本中的本机浏览器路径、预览 URL 与输出目录，不修改原 QA、截图或原始稿。例如：

```sh
python3 tools/verify-archive.py
python3 tools/replay-qa.py --url http://127.0.0.1:4197/ --output /private/tmp/reader-manga-ui-qa-replay
```

原运行时测试使用归档内的 Playwright 配置。预览、检查及 build 生成文件均被本目录 `.gitignore` 排除，不能覆盖不可变基准。
