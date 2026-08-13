# Reader Viewport and Chrome Policy

状态：已确认跨端设计规划；不代表当前合同和 Host 已完成实现
更新时间：2026-07-11

## 1. 目标

统一 UI demo、iOS、Android 和 HarmonyOS 的：

- 状态栏显示/隐藏事务。
- 刘海、打孔、灵动岛、圆角、手势区和折叠铰链避让。
- 阅读信息槽位。
- TTS/自动翻页胶囊锚点。

UI 负责布局语义和解算算法；Host 只提供真实窗口与物理遮挡事实。

## 2. Host 输入

```text
ReaderViewportEnvironment
├── windowSize
├── orientation
├── layoutDirection
├── safeInsets { top, bottom, start, end }
├── gestureInsets
├── occlusionRects[]
├── hingeRects[]
├── systemBars
│   ├── statusBarRequested
│   ├── statusBarEffective
│   ├── navigationBarEffective
│   └── transientSystemOverlay
├── displayScale
├── fontScale
└── posture
```

`occlusionRects[]` 是必需的一等输入。四个 safe-area 标量不能表达中央灵动岛、侧边打孔和折叠铰链。

## 3. UI 输出

```text
ReaderChromeLayout
├── contentBounds
├── textBounds
├── topLeadingInfoRect
├── topTrailingInfoRect
├── bottomLeadingInfoRect
├── bottomTrailingInfoRect
├── immersiveCapsuleRect
├── tapZoneRects
└── collisionFallback
```

Host 不得自行硬编码“页码左移 100”之类的补偿，只执行统一 Resolver 的结果。

## 4. 状态栏事务

状态模式：

- `systemVisible`
- `immersiveHidden`
- `hidePending`
- `hideFailed`

切换过程：

```text
用户修改
→ reducer 写 requestedMode
→ Host 请求系统栏变化
→ Host 返回 effectiveMode + 新 viewport
→ UI 重新解算
→ 一次性提交布局
```

隐藏系统状态栏不代表忽略物理安全区。背景可延伸到边缘，正文、信息和交互仍避开物理遮挡。

## 5. 阅读信息

### 状态栏显示

- 顶部左：书名 · 当前章节。
- 顶部右：空，不重复系统时间。
- 底部左：全书进度。
- 底部右：当前页 / 总页数。

### 状态栏隐藏

- 顶部左：书名 · 当前章节。
- 顶部右：可选时间，由阅读信息设置控制。
- 底部左：全书进度。
- 底部右：当前页 / 总页数。

纵向滚动模式不显示伪页码，底部右改为章节进度或阅读位置。

候选 Rect 与物理遮挡相交时，先垂直迁移，再进入降级布局；最低优先级时间可隐藏，正文安全和章节识别优先。

## 6. Session 胶囊

胶囊不与右下页码共享一行。

### 沉浸锚点

- 内容区域底部居中。
- 位于页脚信息行上方 8-12px。
- 位于手势安全区之上。

候选降级：底部居中 → 底部偏结束侧 → 顶部安全区下方偏结束侧 → 紧凑状态点。

## 7. 胶囊生命周期

```text
hidden → entering → running ↔ paused → switching → exiting → hidden
```

- 启动：优先从触发按钮几何位置迁移；缺少源 Rect 时使用淡入、Y 6px、scale 0.96。
- 暂停/继续：容器不动，只更新图标和状态，约 120ms。
- 倒计时：只更新数字，不重播整颗胶囊。
- TTS/自动翻页切换：保留容器，内部身份交叉变化，不执行退出再进入。
- 停止：内部收束后退出，动画结束才释放点击区域。
- 进入后台：不播放退出；自动翻页暂停，TTS 服从 Host 后台能力。
- 旋转/折叠：冻结装饰更新、重算锚点、落位后恢复。
- Reduced Motion：位置变化只保留短交叉淡变。

## 8. 点击区域

- 胶囊可视高度可为 24-32，但触控高度至少 44。
- 扩展触控 Rect 也必须避开系统手势和物理遮挡。
- 胶囊区域从翻页热区中扣除。
- 四角纯信息不接管点击。

## 9. 验收场景

每个 Host 必须覆盖：

- 状态栏显示、隐藏、失败。
- 无刘海、中央刘海、左侧打孔、灵动岛、横屏遮挡。
- 底部手势区和折叠铰链。
- 无 Session、TTS、自动翻页、暂停、切换、停止。
- 字体放大和 Reduced Motion。
- 旋转、折叠与窗口尺寸变化。
