# Reader 2 AppearanceSpec 更新流程

状态：已落地并由 Web / Swift / Kotlin / ArkTS 消费  
Figma 来源：`Reader 2/Full/AppearanceContent`（`1023:18303`）  
可执行真源：`contracts/fixtures/appearance.fixtures.json`
冻结批次：`contracts/fixtures/design-delta.fixtures.json` 中的 `reader2-full-appearancecontent-20260717`

现场复核：2026-07-17 只读检查 Figma 文件 `klhs2jMM4MncaJFqZMfqEK` 的 `15 · Reader 2` / `1023:18303`，当前 8 个主题、9 个字体、4 个选择项及其默认值、4 个步进器及其数值与 `appearance.fixtures.json` 逐项一致；没有发现需要新增 Design Delta 的漂移。

## 边界

- Figma 负责视觉与交互意图；它不是直接覆盖源码的生成入口。
- `appearance.fixtures.json` 是主题、字体、选择项、步进器顺序与默认值的唯一可执行配置源。
- `design-delta.fixtures.json` 只负责记录本批冻结 revision、影响集、兼容/回滚、四端证据与发布事务；它是机器可校验的变更清单，不复制 Appearance 配置，也不直接改写平台源码。
- `tools/codegen/generate.mjs` 同时生成：
  - `frontend-demo-optimized/appearance-spec.js`
  - `generated/swift/Appearance.swift`
  - `generated/kotlin/Appearance.kt`
  - `generated/arkts/Appearance.ets`
- 三端只保留平台字体解析、颜色对象转换、原生控件和状态持久化适配，不复制配置数组。
- reducer/持久化保存稳定的 `theme.id`、`font.id` 和 `select.option.value`；label 只用于展示。历史 label 状态允许兼容读取一次，下一次写入必须迁移为稳定 value。
- 无法直接依赖 ReaderUIContract 的兼容模型（例如 iOS `ReaderAppSupport`）必须用等值门禁锁住默认值；生成合同变化后测试会明确提示需要更新平台 adapter，而不是静默漂移。

## 修改分级

| Figma delta | 修改入口 | Host 工作 |
| --- | --- | --- |
| 标签、顺序、默认值、范围、步长、swatch | 只改 Appearance fixture | 升级 consumer + 验证 |
| 现有控件布局或响应式行为 | fixture + Reader-UI renderer/CSS | 各端调整原生 layout adapter |
| 新选择项、状态或动效 | schema + fixture + ViewState/Motion contract | 三端 reducer/renderer/motion 接入 |
| 新平台能力 | HostRequest/Core contract | 三端 Host Adapter + 真机证据 |

## 固定执行顺序

```text
Figma node/revision 冻结
→ 记录并校验结构化 Design Delta
→ 更新 appearance schema/fixture
→ codegen
→ Reader-UI DOM/contract/drift 门禁
→ 发布 immutable Reader-UI artifact
→ 三端更新 consumer lock
→ Native 构建与视觉/交互验证
→ 真机证据
```

任何平台在 consumer lock 未升级时都可以做本地开发，但不得把本地 sibling package 编译成功当作正式 release consumption。

当前 AppearanceContent 批次已经通过 `contracts/design-delta.schema.json` 固化：working revision、未知 route / ComponentType / MotionId / UiEvent、跨仓路径穿越，以及不满足 feature flag + milestone 的 D3/D4 变更都会被测试拒绝。Design Delta 负责确定“改什么、影响谁、怎么验证”，具体配置仍只在 Appearance fixture 中维护。

完整应用启动、设计变更分级与跨端回流策略见
[FULL_APP_DEVELOPMENT_AND_FIGMA_UPDATE_POLICY_2026-07-17.md](./FULL_APP_DEVELOPMENT_AND_FIGMA_UPDATE_POLICY_2026-07-17.md)。
