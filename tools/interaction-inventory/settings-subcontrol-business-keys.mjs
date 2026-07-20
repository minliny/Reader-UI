// A0 (schema 1.3.0): Settings subcontrol business semantic key mapping.
// -----------------------------------------------------------------------------
// 职责：为 50 个 settings subcontrol declarations（46 rows × expand）提供
//       不依赖 selector hash / ordinal 的业务语义 slug。
//
// 背景：
//   nonInteractiveContainers audit 记录的 label 是渲染后的可见文本（含
//   value 和"更改"后缀），不是稳定的业务标识。A0 要求 50 个设置子控件
//   改用业务语义 key，不再使用 `h-{selectorSha256前8位}` 这种纯 hash slug。
//
// 映射规则：
//   - key: `${routeId}::${label}` 精确匹配（label 是 nonInteractiveContainers
//     entry 的 label 字段原值）。
//   - value: 业务语义 slug，符合 entityKey atom 模式 `[a-z0-9]+(?:-[a-z0-9]+)*`。
//   - 同一 route 上同类型 subcontrol 的 slug 必须唯一。
//
// 维护：
//   - 这是 A0 阶段的临时映射，覆盖 IC0 audit (2026-07-19) 的 46 行。
//   - A1/A2 阶段应该让 renderer 直接在 DOM 上输出 `data-settings-option-key`
//     或类似业务语义属性，audit 时记录到 nonInteractiveContainers，从而
//     淘汰本映射表。
//   - 修改 renderer 的 row.title 或新增/删除 row 时，本表必须同步更新；
//     drift test 会验证映射表覆盖所有 46 行。
// -----------------------------------------------------------------------------

/**
 * Map from `${routeId}::${label}` to business semantic slug.
 * Slug must match `[a-z0-9]+(?:-[a-z0-9]+)*` (entityKey atom pattern).
 */
export const SETTINGS_SUBCONTROL_BUSINESS_KEYS = Object.freeze({
  // ---- settings-general (8 rows) ----
  "settings-general::App主题 跟随系统": "app-theme",
  "settings-general::语言 简体中文": "language",
  "settings-general::启动时打开 书架": "startup-screen",
  "settings-general::自动检查更新": "auto-check-update",
  "settings-general::点击当前底栏回顶部": "tap-bottom-scroll-top",
  "settings-general::减少动态效果": "reduce-motion",
  "settings-general::崩溃日志": "crash-log",
  "settings-general::动画效果 标准": "animation-effect",

  // ---- bookshelf-search-settings (8 rows) ----
  "bookshelf-search-settings::默认展示 封面": "default-view",
  "bookshelf-search-settings::封面列数 - 3列 +": "cover-columns",
  "bookshelf-search-settings::默认分组 全部": "default-group",
  "bookshelf-search-settings::显示更新标记": "show-update-badge",
  "bookshelf-search-settings::书架排序 最近更新 更改": "bookshelf-sort",
  "bookshelf-search-settings::展示范围 全部 更改": "display-scope",
  "bookshelf-search-settings::本地书标识显示本地书来源标识": "local-book-badge",
  "bookshelf-search-settings::网络书缓存状态显示缓存/未缓存标识": "network-cache-status",
  "bookshelf-search-settings::默认搜索源全部已启用书源 更改": "default-search-source",
  "bookshelf-search-settings::默认视图封面网格 更改": "default-view-mode",
  "bookshelf-search-settings::默认排序最近更新 更改": "default-sort",
  "bookshelf-search-settings::缓存策略Wi-Fi 下自动缓存 更改": "cache-strategy",
  "bookshelf-search-settings::搜索历史保留 20 条 更改": "search-history-keep",
  "bookshelf-search-settings::更新失败提醒书架书籍更新失败时显示角标": "update-fail-notify",

  // ---- progress-sync (4 rows) ----
  "progress-sync::同步频率 实时": "sync-frequency",
  "progress-sync::冲突时询问": "conflict-ask",
  "progress-sync::自动同步阅读进度": "auto-sync-progress",
  "progress-sync::仅 Wi-Fi 同步": "wifi-only-sync",

  // ---- source-debug (2 rows) ----
  "source-debug::调测模块 正文": "debug-module",
  "source-debug::选择书源 笔趣阁": "debug-source-select",

  // ---- source-management (8 rows; 4 sources × 2 occurrences each) ----
  // 重复 label 通过 routeId::label 精确匹配，两个 occurrence 共享同一业务
  // slug；controlKey 仍按 (entityKey, route, state) 唯一，instanceKey 待
  // A1/A2 阶段从 data-source-id 等属性派生。
  "source-management::笔趣阁biquge.example · 玄幻书源": "source-biquge",
  "source-management::本地导入源本地文件 · 自定义": "source-local-import",
  "source-management::起点中文网qidian.com · 起点导入": "source-qidian",
  "source-management::测试书源test.example · 测试书源": "source-test",

  // ---- webdav-config (4 rows) ----
  "webdav-config::自动同步 每小时": "webdav-auto-sync",
  "webdav-config::SSL 证书校验": "webdav-ssl-verify",
  "webdav-config::连接超时 - 15 秒 +": "webdav-timeout",
  "webdav-config::仅 Wi-Fi 同步": "webdav-wifi-only",

  // ---- backup-settings (12 rows) ----
  "backup-settings::App 设置": "backup-app-settings",
  "backup-settings::保留时长 30 天": "backup-retain-duration",
  "backup-settings::搜索历史": "backup-search-history",
  "backup-settings::阅读进度": "backup-reading-progress",
  "backup-settings::书源配置": "backup-source-config",
  "backup-settings::书架与分组": "backup-bookshelf-groups",
  "backup-settings::启用自动备份": "backup-auto-enable",
  "backup-settings::备份时间 02:00": "backup-time",
  "backup-settings::自动清理过期备份": "backup-auto-cleanup",
  "backup-settings::备份频率 每天": "backup-frequency",
  "backup-settings::保留备份数 - 10 个 +": "backup-retain-count",
  "backup-settings::仅 Wi-Fi 备份": "backup-wifi-only",
});

/**
 * Look up the business semantic slug for a subcontrol row.
 * Returns null when no mapping is registered; the caller MUST treat null as
 * a drift failure (the mapping table is out of sync with the audit).
 */
export function lookupSubcontrolBusinessKey(routeId, label) {
  const key = `${routeId}::${label}`;
  const slug = SETTINGS_SUBCONTROL_BUSINESS_KEYS[key];
  if (typeof slug !== "string" || slug.length === 0) return null;
  return slug;
}
