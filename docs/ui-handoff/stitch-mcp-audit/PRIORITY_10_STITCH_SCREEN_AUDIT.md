# Priority 10 Stitch Screen Audit

## 1. 总体结论

PRIORITY_10_STITCH_SCREEN_AUDIT_READY

10/10 目标 screen 全部找到。6 个 DIRECT_USE_READY，4 个 DIRECT_USE_WITH_MINOR_GAPS。P0=0。

## 2. 输入来源

| 项目 | 值 |
|------|-----|
| Stitch project ID | `14245818599411324705` |
| list_screens 总数 | 40 |
| 目标 screen 找到数 | 10/10 |
| HTML/CSS 可导出 | 是（Google Content Download URL） |
| 保存路径 | `docs/ui-handoff/stitch-mcp-audit/priority-10/raw-html/` |

## 3. 10 screens 审计表

| # | Screen 名称 | Screen ID | 存在 | 等级 | P0 | P1 | 备注 |
|---|-----------|-----------|------|------|----|----|------|
| 1 | App Shell - Main Tabs - Final | `7c1991e9d89c45d2b8382d6aa4f9c852` | ✅ | B | 0 | 1 | 需确认底栏四 tab 布局 |
| 2 | 发现 - 首页 (高信息密度版) | `f112a9b3fa6840bc8fb42a6ece336304` | ✅ | A | 0 | 0 | 2926px 高，内容流完整 |
| 3 | 书源管理 - 高信息密度版 | `c2af5344a2a0443091ac626c0435016a` | ✅ | A | 0 | 0 | 含启用/禁用/测试 |
| 4 | 我的 - 首页 (紧凑优化版) | `541f954e4d084e2aab6913bd6298c2b5` | ✅ | A | 0 | 0 | 2552px，含 WebDAV/Backup/Sync 入口 |
| 5 | 搜索 - 首页 (含本地/在线切换) | `b5d5d7ea95b04de5aed11c03d302eaa7` | ✅ | A | 0 | 0 | 2794px，搜索历史+推荐 |
| 6 | 搜索 - 结果列表 (高密度版) | `6586c27de9c246828a7f2a20cfd6f671` | ✅ | A | 0 | 0 | 2400px，字段完整 |
| 7 | 书籍详情 - 高信息密度版 | `6c85378cdddc43be82c481b58ccbe6c6` | ✅ | A | 0 | 0 | 1768px，含 TOC preview+缓存状态 |
| 8 | 阅读页 - 搜索快捷 Overlay (布局优化版) | `5a6b89622f5f4348840ebd947bbad0b5` | ✅ | B | 0 | 1 | 需确认 overlay 不全屏 |
| 9 | 阅读页 - 内容替换快捷 Overlay (含全局入口) | `bcf508493a0741c39750c1abd001fa34` | ✅ | B | 0 | 1 | 标题"含全局入口"需确认仅当前书籍规则 |
| 10 | 全局 Error - 人文优化版 | `904263aa021b4a8391db8b87b2569bb1` | ✅ | B | 0 | 1 | 需确认无 stack trace 泄露 |

## 4. App Shell 审计

- **Screen**: `7c1991e9d89c45d2b8382d6aa4f9c852` "App Shell - Main Tabs - Final"
- **类型**: MOBILE, 780×1768px
- **等级**: B — DIRECT_USE_WITH_MINOR_GAPS
- **说明**: 需人工确认底栏四 tab 为 书架/发现/书源/我的，确认无 搜索/设置/RSS 作为一级 tab

## 5. 四主模块审计

| 模块 | Screen | 等级 | 关键验证点 |
|------|--------|------|-----------|
| 发现 | `f112a9b3fa6840bc8fb42a6ece336304` | A | 2926px 高信息密度，含 RSS 内容流 |
| 书源 | `c2af5344a2a0443091ac626c0435016a` | A | 启用/禁用/测试/添加入口 |
| 我的 | `541f954e4d084e2aab6913bd6298c2b5` | A | WebDAV/Backup/Sync/关于 入口清晰 |

## 6. 搜索 / 详情审计

| 模块 | Screen | 等级 | 字段覆盖 |
|------|--------|------|---------|
| 搜索首页 | `b5d5d7ea95b04de5aed11c03d302eaa7` | A | 输入框+历史+推荐，2794px |
| 搜索结果 | `6586c27de9c246828a7f2a20cfd6f671` | A | 书名/作者/来源/章/简介 |
| 书籍详情 | `6c85378cdddc43be82c481b58ccbe6c6` | A | 封面/进度/cache/chip/TOC preview |

## 7. 阅读快捷 overlay 审计

| Screen | 等级 | 注意事项 |
|--------|------|---------|
| 搜索快捷 Overlay | B | 需确认 overlay zone 定位（不全屏，不遮底栏/快捷按钮） |
| 内容替换 Overlay | B | 标题"含全局入口" — 需确认仅显示当前书籍规则，不是全局规则库 |

## 8. 全局状态页审计

| Screen | 等级 | 注意事项 |
|--------|------|---------|
| 全局 Error | B | 人文优化，需确认无 stack trace / token / secret 泄露 |

## 9. P0 列表

无。

## 10. P1 列表

| # | Screen | 说明 |
|---|--------|------|
| P1-1 | App Shell | 需人工确认底栏四 tab = 书架/发现/书源/我的 |
| P1-2 | 搜索 Overlay | 需确认 overlay 不全屏、zone 定位正确 |
| P1-3 | 内容替换 Overlay | 需确认仅当前书籍规则、含 pattern/scope/replacement |
| P1-4 | 全局 Error | 需确认无敏感信息泄露 |

## 11. 是否允许进入 Stitch-to-Compose Native Rebuild

**允许全部 10 个 screen 进入 Stitch-to-Compose Native Rebuild。**

6 个 DIRECT_USE_READY (A) + 4 个 DIRECT_USE_WITH_MINOR_GAPS (B)。4 个 P1 均为确认性检查，不阻塞启动。

## 12. 下一步建议

建议进入 Slice 76A：Stitch App Shell + Four Main Tabs Native Rebuild。
优先顺序：App Shell → 四主模块 → 搜索/详情 → 阅读 overlay → 全局状态。
