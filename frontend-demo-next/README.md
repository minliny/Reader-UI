# Reader Frontend Demo Next

## 身份与授权边界

`frontend-demo-next/` 是基于 `frontend-demo-optimized/` 创建的 replacement candidate，用于承载已确认的新一轮阅读控制层、主题字体工作区和 viewport/chrome 规划。

它当前不是 canonical demo，也不是 Host 已完成同步的证明。

目录权威关系如下：

```text
frontend-demo-optimized/  只读设计与运行基线
frontend-demo-next/       当前 replacement candidate
frontend-demo/            canonical 消费路径；仅在用户明确授权后由 candidate 替换
各平台 Host              尚未同步；必须在 candidate 获得授权后独立实施和验收
```

强制边界：

1. `frontend-demo-optimized/` 只读，不在 candidate 开发过程中回写、修补或刷新其证据。
2. 所有本轮 UI 改动只进入 `frontend-demo-next/`。
3. 未获得用户明确授权前，不把 `frontend-demo-next/` 复制、移动或重命名为 `frontend-demo/`，也不修改消费者指向来绕过授权。
4. candidate 通过门禁只表示可以申请替换，不等于已经替换 canonical。
5. iOS、Android、HarmonyOS Host 当前均未因本目录创建而自动同步；Web DOM/CSS 不是 native 实现证据。
6. 授权替换 canonical 与随后同步 Host 是两个独立动作，分别保留变更、测试和设备证据。

## 运行入口

入口文件：`frontend-demo-next/index.html`

浏览器路径：`/frontend-demo-next/`

共享框架：`frontend-demo-next/shared-shell-kit/kit.js`

从 `Reader-UI` 仓库根目录启动本地服务：

```bash
python3 -m http.server 5177
```

然后访问：

```text
http://127.0.0.1:5177/frontend-demo-next/
```

常用审计入口：

```text
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=reader
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=reader-appearance
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=reader-full-appearance
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=reader-full-theme
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=reader-full-font
http://127.0.0.1:5177/frontend-demo-next/?captureRoute=immersive-reading&readerOcclusion=dynamic-island
```

`?captureMode=all` 可输出全路由捕获板；它用于审计和截图，不代表普通应用导航行为。

## 基线继承范围

candidate 继承 optimized 的五类 Shell 和既有路由能力：

- `MainTabShell`：书架、发现、RSS、设置及统一主导航。
- `LibraryShell`：搜索、详情、目录、筛选、分组、本地导入、底表和弹窗。
- `ReaderShell`：沉浸阅读、正文分页、控制层、快捷操作、模块 Dock 和 Session 状态。
- `SettingsShell`：设置返回顶栏、设置分组、选项、Toast、Dialog 和 State Host。
- `FlowShell`：阅读中换源窗口和候选来源流程。

基线继承不改变所有权：`frontend-demo-optimized/` 继续只读，candidate 通过新增或覆盖文件独立演进。

## 本轮已确认目标

以下内容是 candidate 的验收目标，不应仅凭页面上出现了相似控件就标记完成。

### 1. 阅读控制层

目标结构：

```text
ReaderControlContainer
├── Grabber
├── ReplaceableContentHost
│   ├── ControlHome
│   ├── DirectoryModule
│   ├── TtsModule
│   ├── AppearanceModule
│   └── SettingsModule
└── PersistentModuleDock
```

确认规则：

- 亮度栏只属于 `ControlHome`。
- 点击目录、朗读、界面、设置后，Dock 以外的内容整体替换，并使用亮度栏释放后的完整宽度。
- Dock 在 Compact 模块态保持位置和尺寸稳定；模块之间直接切换，不经过 ControlHome，不播放全幅 loading 卡。
- 再次点击当前 Dock 项回到 ControlHome。
- 返回顺序固定为 `Workspace/Expanded → Compact module → ControlHome → immersive reading`，不得遍历历史模块。
- 展开状态明确区分 `Compact → Expanded → Workspace`；Expanded 保留约 30%–40% 正文预览，Workspace 才承载字体导入和复杂主题编辑。
- 展开时阅读顶栏按进度退出，最终只保留控制工作区标题栏；正文不因控制层开合反复分页。
- Session 胶囊独立于 ReplaceableContentHost，Compact 跟随控制层顶部，Expanded 保持独立锚点，Workspace 可进入标题栏状态槽。

### 2. 主题、背景与字体

完整界面工作区目标包括：

- 明确的默认日间主题和默认夜间主题槽位；临时切换不自动覆盖默认值。
- 主题库与自定义主题的命名、复制、编辑、删除、导入、导出和默认设置。
- 纯色、图片、渐变和纸张纹理背景。
- 图片定位、裁剪、平铺/填充/适应、明暗、模糊、纹理强度、正文遮罩和文字颜色。
- 实时正文预览及正文/背景对比度检查。
- 字体库区分内置字体与已导入字体，支持 `.ttf`、`.otf`、`.ttc`。
- 字体导入的加载中、格式错误、损坏、中文字形缺失、名称冲突、成功、删除及回退状态。
- 当前书籍/全局默认作用域、即时试用、恢复系统字体。
- 字号、行距、段距、字距、页面边距、段首缩进、排版预设和恢复默认。

### 3. Viewport、Chrome 与胶囊

UI 目标输入为 `ReaderViewportEnvironment`，至少包括窗口尺寸、方向、布局方向、safe/gesture insets、`occlusionRects[]`、`hingeRects[]`、系统栏 requested/effective 状态、缩放和折叠姿态。

UI 目标输出为 `ReaderChromeLayout`，至少包括正文 bounds、四角信息槽、沉浸/控制层胶囊 Rect、tap-zone Rect 和碰撞降级结果。

确认规则：

- 状态栏使用 `requested → Host result → effective viewport → layout commit` 事务，支持显示、隐藏、pending 和失败。
- 刘海、打孔、灵动岛、圆角、手势区和折叠铰链使用 Rect 解算，不以固定四边 inset 或“页码左移”代替。
- 状态栏显示时不重复系统时间；隐藏时可由阅读信息槽显示时间。
- 沉浸胶囊位于底部居中、页脚信息上方和手势安全区之上，不与页码共享一行。
- 胶囊触控高度至少 44px，其触控 Rect 和翻页热区都必须扣除遮挡与冲突区域。
- 控制层开合、旋转、折叠和 Reduced Motion 均需重新解算并验证胶囊锚点。

## 当前 Candidate 状态

更新时间：2026-07-11。

| 区域 | 当前状态 | 说明 |
|---|---|---|
| optimized 基线复制 | PASS | candidate 已基于 optimized 独立建立，后续不得回写 optimized。 |
| JavaScript 语法 | PASS | 当前顶层 JS/MJS 全部通过 `node --check`，关键浏览器路径已实跑。 |
| ControlHome 亮度归属 | PASS | 浏览器实跑：ControlHome 亮度栏为 1，目录/界面等模块页为 0；模块获得释放后的完整宽度。 |
| Persistent Dock | PARTIAL | 模块直接切换、重击回 Home、模块历史 replace 已闭合；renderer 仍会重建 Dock DOM，尚非原生持久节点。 |
| Compact/Expanded/Workspace | PARTIAL | 三个稳定态已落地；Expanded 实测保留约 38% 正文，Workspace 顶到 18px。逐帧连续跟手仍需深化。 |
| 顶栏交接与完整页胶囊 | PARTIAL | Workspace 最终态会把旧顶栏推出并隐藏；Session 胶囊在沉浸、Compact、Expanded、Workspace 均有锚点。逐帧共享进度仍需深化。 |
| 主题与字体 | PASS (Demo) | 默认日夜槽、系统模式、自定义主题管理、背景入口、字体导入/校验/删除/回退和 localStorage 模拟已具备；不代表 Host 沙盒能力。 |
| 自定义背景运行安全 | PASS (Code) | 仅接受 PNG/JPEG/WebP base64，完整 style 属性统一转义；仍需补真实大图/损坏图证据。 |
| Viewport/Chrome | PARTIAL | 已输出 requested/effective/failed、occlusionRects 与独立锚点并实跑失败回退；共享 schema、真实 Host rect/hinge 仍待授权。 |
| Candidate 专属验证 | PASS (Candidate) | verify 已只读写 next；JS、P0 `120/120`、contract/motion `235/235`、共享 contract/codegen `268/268` 与关键浏览器路径均通过。canonical 路径门禁需在授权替换后重跑。 |
| Host 同步 | NOT STARTED | 当前没有以本 candidate 为输入完成三端 Host 实现或设备证据。 |
| Canonical 替换 | AWAITING AUTHORIZATION | 只有用户明确授权后才可替换 `frontend-demo/`。 |

## Candidate Gate

申请替换 canonical 前必须全部满足：

### G0：所有权与工作树

- [ ] `frontend-demo-optimized/` 相对进入本轮前保持只读，无 candidate 反向写入。
- [ ] candidate 的代码、文档、证据和验证脚本全部位于 `frontend-demo-next/`。
- [ ] 无未解释的跨目录改动或旧证据覆盖。

### G1：控制层与返回状态机

- [ ] ControlHome、四模块和快捷面板共享固定外壳与可替换内容宿主。
- [ ] 亮度仅在 ControlHome；模块使用完整内容宽度。
- [ ] Dock 切换不积累历史模块；系统返回和 UI 返回符合确认顺序。
- [ ] Compact、Expanded、Workspace 三态均可点击、拖动、打断和逆向恢复。
- [ ] Expanded/Workspace 顶栏交接、正文预览和胶囊锚点通过验证。

### G2：主题与字体工作区

- [ ] `reader-full-appearance` 内存在可发现的主题、字体、布局和翻页工作区入口。
- [ ] 默认日/夜主题修改、跟随系统和临时主题切换语义分离。
- [ ] 自定义背景不会破坏 DOM/style 属性，并有图片大小与格式边界。
- [ ] 字体导入、失败、重复、删除、回退和当前书籍/全局作用域可验证。
- [ ] 主题与字体状态具备明确的 demo 持久化策略和恢复路径。

### G3：Viewport/Chrome 合同

- [ ] `ReaderViewportEnvironment` 与 `ReaderChromeLayout` 进入 schema、fixtures 和生成产物。
- [ ] 状态栏 requested/effective/pending/failed 事务可演示。
- [ ] 无遮挡、刘海、左右打孔、灵动岛、横屏、手势区和折叠铰链矩阵通过。
- [ ] 阅读信息、胶囊和 tap zones 使用同一 Resolver，具备确定性 collision fallback。

### G4：可重复验证

- [ ] candidate 内验证脚本不再读取或写入 `frontend-demo-optimized/`。
- [ ] contract、motion、route、selector 和 drift 检查实际扫描 `frontend-demo-next/`。
- [ ] 重新生成 candidate 自己的截图、动效 manifest、adaptive 和 text-stress 证据。
- [ ] 报告生成时间、source path 和当前代码提交一致，不复用 optimized 的历史 PASS。
- [ ] 浏览器关键路径和至少一个 reduced-motion/viewport 矩阵完成实跑。

### G5：替换申请

- [ ] 给出 `frontend-demo-optimized/ → frontend-demo-next/` 的可审阅差异和剩余限制。
- [ ] 明确列出 canonical 消费者、合同路径、文档链接及替换后需要更新的引用。
- [ ] 获得用户对“用 candidate 替换 canonical `frontend-demo/`”的明确授权。

### G6：授权后的独立工作

- [ ] 在获得授权后执行受控替换，并重新运行 canonical 路径全部门禁。
- [ ] 分平台生成 Host 变更清单；iOS、Android、HarmonyOS 分别实现、测试和提交。
- [ ] Host 设备证据、consumer lock 和 release validation 独立闭合，不用 Web PASS 代替。

## 验证命令

所有 demo 专属命令必须从 `frontend-demo-next/` 读取。以下命令从 `Reader-UI` 仓库根目录运行。

### 当前安全检查

```bash
node --check frontend-demo-next/fixture.js
node --check frontend-demo-next/route-contract.js
node --check frontend-demo-next/motion-controller.js
node --check frontend-demo-next/render.js
node --check frontend-demo-next/render-runtime.js
```

先检查 candidate 可执行验证脚本是否仍硬编码旧目录；继承的历史审计 Markdown/JSON 允许保留 canonical 证据说明，但 `.mjs` 输出必须清零：

```bash
rg -n 'frontend-demo-optimized|frontend-demo/' frontend-demo-next/verify --glob '*.mjs'
```

### 路径修复后的 Candidate 门禁

下面两个命令只有在脚本内部 source/output 均已改为 `frontend-demo-next/` 后，才构成 candidate 证据：

```bash
node frontend-demo-next/verify/contract/verify-demo-contract-consistency.mjs
node frontend-demo-next/verify/motion/verify-motion-coverage.mjs
```

共享合同与生成代码门禁：

```bash
node tools/codegen/generate.mjs
npm test --prefix contracts/tests
node tools/codegen/check-drift.mjs
```

运行结果必须按层报告：candidate demo、合同/codegen、各平台 Host、设备证据和 release gate 不能合并成一个 `PASS`。

## 文件组织规则

- `render.js` 只作为同步 bootstrap，主 renderer 保持在 `render-runtime.js`。
- `route-contract.js` 是 candidate route 清单来源。
- `styles.css` 只作为 CSS 入口；候选变更优先集中在可审阅的 next 样式层，避免回写 optimized。
- Shell 继续通过 `ReaderShellKit.render*Shell(...)` 输出。
- UI 图标继续通过 `asset-library/icons.js` 的 `ReaderAssetIcons.renderIcon(...)` 获取，不新增一次性 SVG。
- 平台使用 SwiftUI、Compose、ArkUI 原生实现；不得把 Web CSS 或 DOM 复制当作 Host 同步完成。
- Motion 迁移复用 Motion ID、state fields、state machine、token 和证据要求，而不是照抄 CSS 动画。

## 授权后的替换流程

只有用户明确授权后，才执行以下流程：

```text
冻结 frontend-demo-next candidate
→ 归档 candidate 门禁与证据
→ 受控替换 canonical frontend-demo/
→ 更新所有 canonical 消费者和验证路径
→ 重跑 canonical contract/motion/codegen/drift
→ 输出独立 Host 变更包
→ iOS / Android / HarmonyOS 分别实现和验收
```

任何 candidate 阶段的局部完成，都不得提前表述为“canonical 已替换”或“Host 已同步”。
