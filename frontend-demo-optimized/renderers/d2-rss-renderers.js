// =============================================================================
// D2-B RSS 产品化 renderer 函数模块
// -----------------------------------------------------------------------------
// 用途：将 Reader-UI Demo 中 RSS 的所有骨架页面产品化为完整交互页面。
//       覆盖 D0 审计中 RSS 50 个路由的骨架页面，提供产品级交互体验。
//
// 产品化范围（10 个 renderer）：
//   1. rssHomeScreenV2            - RSS 首页：文章流 + 分类侧栏 + 刷新 + 已读未读标记
//   2. rssArticleDetailScreenV2   - 文章详情：正文 + 图片 + 元信息 + 收藏/分享
//   3. rssOriginalWebViewScreen   - 原文 WebView：嵌入式 WebView 容器 + 系统浏览器确认
//   4. rssSubscriptionCrudScreen  - 订阅源 CRUD：新增/编辑/删除订阅源
//   5. rssGroupManagementScreen   - 分组管理：订阅源分组 + 收藏分组
//   6. rssLoginCookieScreen       - 登录/Cookie：需要登录的源的管理
//   7. rssImportExportScreen      - 导入导出：OPML 导入导出
//   8. rssRuleSubscriptionScreen  - 规则订阅：基于规则的自动订阅
//   9. rssReadingHistoryScreen    - 阅读记录：已读/未读管理
//  10. rssBatchManagementScreen   - 批量管理：批量操作订阅源
//
// 设计要点：
//   - 不编辑 render-runtime.js，只创建新模块文件
//   - 自包含：自带 esc / icon / shellKit / filterDisclosure 等辅助函数
//   - 通过 window.ReaderD2RssRenderers 暴露，附带 INTEGRATION_MAP
//   - 函数签名统一为 (data, appState, route)，支持一个 renderer 处理多个路由
//   - 用中文注释
//
// 集成方式（详见文件末尾 INTEGRATION_MAP）：
//   在 render-runtime.js 的 renderRoute 函数 switch 之前加入 D2 分发钩子：
//     if (window.ReaderD2RssRenderers && window.ReaderD2RssRenderers.INTEGRATION_MAP) {
//       const d2FnName = window.ReaderD2RssRenderers.INTEGRATION_MAP[route];
//       if (d2FnName && typeof window.ReaderD2RssRenderers[d2FnName] === "function") {
//         return window.ReaderD2RssRenderers[d2FnName](data, appState, route);
//       }
//     }
// =============================================================================

(function attachD2RssRenderers(window) {
  "use strict";

  // ===========================================================================
  // 一、基础工具（与 render-runtime.js 同名同行为，保持模块自包含）
  // ===========================================================================

  // HTML 转义，防止 XSS
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // 获取共享 shell 套件
  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d2-rss-renderers.js");
    }
    return window.ReaderShellKit;
  }

  // 渲染图标，优先使用 ShellKit，回退到 AssetIcons
  function icon(name, className) {
    if (window.ReaderShellKit && window.ReaderShellKit.icon) {
      return window.ReaderShellKit.icon(name, className || "fd-icon");
    }
    if (window.ReaderAssetIcons && window.ReaderAssetIcons.renderIcon) {
      return window.ReaderAssetIcons.renderIcon(name, className || "fd-icon");
    }
    return `<span class="${esc(className || "fd-icon")}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  // 将 attrs 对象序列化为 HTML 属性字符串
  function attrHtml(attrs) {
    return Object.entries(attrs || {})
      .filter(([, value]) => value !== false && value != null)
      .map(([key, value]) => (value === true ? ` ${key}` : ` ${key}="${esc(value)}"`))
      .join("");
  }

  // 手机外壳 class 集合（与 render-runtime.js phoneShellClasses 一致）
  function phoneShellClasses(extra) {
    return {
      frameClass: `fd-phone ${extra || ""}`.trim(),
      statusBarClass: "fd-status-bar",
      systemIconsClass: "fd-system-icons",
      signalClass: "fd-signal",
      wifiClass: "fd-wifi",
      batteryClass: "fd-battery",
      topBarClass: "fd-top-bar",
      topActionsClass: "fd-top-actions",
      iconButtonClass: "fd-icon-button",
      iconClass: "fd-icon",
      contentClass: "fd-phone-content",
      navClass: "fd-main-nav",
      navItemClass: "fd-main-nav-item",
      navIconShellClass: "fd-main-nav-icon-shell",
      navIconClass: "fd-nav-icon",
      stateHostClass: "fd-state-host"
    };
  }

  // 主 Tab 反馈消息（来自 appState.mainTabFeedback）
  function mainTabFeedbackHtml(appState) {
    const message = appState?.mainTabFeedback || "";
    return message ? `<p class="fd-nav-feedback" data-main-tab-feedback>${esc(message)}</p>` : "";
  }

  // 设置开关控件
  function settingsSwitch(enabled) {
    return `<span class="fd-settings-switch${enabled ? " is-on" : ""}" aria-hidden="true"><i></i></span>`;
  }

  // 筛选器折叠面板（与 render-runtime.js filterDisclosure 一致）
  function filterDisclosure(config) {
    const open = Boolean(config.open);
    const summary = config.summary || "全部";
    const toggleAttr = config.toggleAttr || "data-filter-toggle";
    const groups = (config.groups || []).map((group) => `
        <article>
          <strong>${esc(group.title)}</strong>
          <div>
            ${(group.options || []).map((option) => `
              <button class="${option.active ? "is-active" : ""}" type="button"${option.route ? ` data-route="${esc(option.route)}"` : ""}${attrHtml(option.attrs)}>
                ${option.icon ? icon(option.icon, "fd-small-icon") : ""}
                <span>${esc(option.label)}</span>
              </button>`).join("")}
          </div>
        </article>`).join("");
    return `
      <section class="fd-filter-control ${config.className || ""}${config.applyRoute ? " has-apply" : ""}${open ? " is-open" : ""}" aria-label="${esc(config.ariaLabel || config.label || "筛选")}">
        <button class="fd-filter-trigger" type="button" ${toggleAttr} aria-expanded="${open ? "true" : "false"}">
          ${icon("filter", "fd-small-icon")}
          <span>${esc(config.label || "筛选")}</span>
          <em>${esc(summary)}</em>
          ${icon("chevron", "fd-small-icon fd-filter-chevron")}
        </button>
        ${config.applyRoute ? `<button class="fd-filter-apply" type="button" data-route="${esc(config.applyRoute)}" data-filter-close>${icon("check", "fd-small-icon")}${esc(config.applyLabel || "应用")}</button>` : ""}
        ${open ? `<section class="fd-filter-menu">${groups}</section>` : ""}
      </section>`;
  }

  // ===========================================================================
  // 二、RSS 产品化数据集（比骨架页更丰富的演示数据）
  // ===========================================================================

  // 订阅源数据（含 URL、描述、同步间隔等产品化字段）
  function d2RssSourcesData() {
    return [
      {
        name: "GitHub Releases", group: "开源项目", unread: 6, latest: "10:18",
        status: "正常", tone: "good", enabled: true, categories: 3,
        articleStyle: "列表", rule: "默认 RSS", login: false, singleUrl: false,
        url: "https://github.com/minliny/Reader-UI/releases.atom",
        description: "Reader UI 项目版本发布订阅",
        sortOrder: 1, pinned: true, syncInterval: "30 分钟", lastSync: "今天 10:18"
      },
      {
        name: "阅读器版本讨论", group: "社区", unread: 12, latest: "09:42",
        status: "有更新", tone: "good", enabled: true, categories: 4,
        articleStyle: "图文", rule: "自定义列表", login: false, singleUrl: false,
        url: "https://example.com/reader-discussions/rss",
        description: "阅读器版本特性与路线图讨论",
        sortOrder: 2, pinned: false, syncInterval: "1 小时", lastSync: "今天 09:42"
      },
      {
        name: "书源维护公告", group: "维护", unread: 2, latest: "昨天",
        status: "需登录", tone: "warn", enabled: true, categories: 2,
        articleStyle: "紧凑", rule: "正文规则", login: true, singleUrl: false,
        url: "https://example.com/book-source-notice/rss",
        description: "书源维护与规则更新公告（需登录）",
        sortOrder: 3, pinned: false, syncInterval: "2 小时", lastSync: "昨天 22:10"
      },
      {
        name: "本地系统通知", group: "系统", unread: 0, latest: "周二",
        status: "暂停", tone: "muted", enabled: false, categories: 1,
        articleStyle: "列表", rule: "单 URL", login: false, singleUrl: true,
        url: "local://system-notice",
        description: "本地系统通知订阅（已暂停）",
        sortOrder: 4, pinned: false, syncInterval: "手动", lastSync: "周二 08:00"
      },
      {
        name: "技术博客精选", group: "技术", unread: 8, latest: "11:30",
        status: "正常", tone: "good", enabled: true, categories: 2,
        articleStyle: "图文", rule: "默认 RSS", login: false, singleUrl: false,
        url: "https://example.com/tech-blog/rss",
        description: "技术文章精选订阅",
        sortOrder: 5, pinned: false, syncInterval: "1 小时", lastSync: "今天 11:30"
      }
    ];
  }

  // 文章数据（含正文段落、图片、作者等产品化字段）
  function d2RssArticlesData() {
    return [
      {
        title: "Reader UI 前端输入件更新说明", source: "GitHub Releases", time: "10:18",
        group: "开源项目", unread: true, starred: true, author: "minliny",
        link: "github.com/minliny/Reader-UI/releases/v2.6.0",
        desc: "新增发现页状态路由、阅读控制层响应式约束，并补充 RSS 页面结构规划。",
        readProgress: 0, categories: ["Releases"],
        body: [
          "本次更新围绕前端输入件的发现页状态路由、阅读控制层响应式约束和 RSS 页面结构做了系统性补全。",
          "发现页新增 loading / empty / error / offline 四种状态路由，保证在弱网和异常场景下仍有可恢复的交互路径。",
          "阅读控制层根据viewport 几何和键盘高度自适应收起，避免遮挡正文；同时修正了夜间模式下控件对比度不足的问题。",
          "RSS 页面结构以订阅源为一级对象，保留未读、全部、收藏和刷新工作流，并为后续导入导出、规则订阅预留入口。"
        ],
        images: [
          { alt: "发现页状态路由示意", caption: "发现页四种状态路由" },
          { alt: "RSS 页面结构规划", caption: "RSS 订阅源为一级对象" }
        ]
      },
      {
        title: "订阅源规则解析失败排查", source: "书源维护公告", time: "09:52",
        group: "维护", unread: true, starred: false, author: "维护组",
        link: "example.com/book-source-notice/troubleshoot",
        desc: "部分订阅源返回 HTML 而不是 XML，已建议检查 Cookie、登录态和正文提取规则。",
        readProgress: 0, categories: ["公告"],
        body: [
          "近期收到反馈，部分订阅源在刷新时返回 HTML 页面而非预期的 XML / JSON，导致规则解析失败。",
          "常见原因包括：登录态过期被重定向到登录页、源地址变更、CDN 拦截非浏览器 UA。",
          "建议排查步骤：先在源登录页重新授权 Cookie，再进入规则调试验证列表和正文规则，最后检查请求头 UA 是否被拦截。"
        ],
        images: []
      },
      {
        title: "Legado 订阅源配置经验整理", source: "阅读器版本讨论", time: "昨天",
        group: "社区", unread: true, starred: false, author: "社区用户",
        link: "example.com/reader-discussions/legado-rss",
        desc: "社区整理了单 URL 源、分类入口、文章样式和 WebView 正文处理的常见配置方式。",
        readProgress: 0, categories: ["讨论"],
        body: [
          "社区整理了 Legado 订阅源的几种常见配置方式，覆盖单 URL 源、多分类入口和 WebView 正文处理。",
          "单 URL 源适合只提供一条 RSS 地址的订阅，配置最简单；多分类入口通过 分类 URL 字段定义 Releases::/releases.atom && Issues::/issues.atom 形式。",
          "文章样式推荐：技术文章用图文，公告用紧凑，版本发布用列表。WebView 正文处理建议加白名单过滤广告资源。"
        ],
        images: [
          { alt: "订阅源配置示例", caption: "多分类 URL 配置示例" }
        ]
      },
      {
        title: "本地导入完成解析", source: "本地系统通知", time: "周二",
        group: "系统", unread: false, starred: false, author: "系统",
        link: "local://import-result",
        desc: "本地 OPML 导入完成，4 个订阅源已启用，1 个订阅源需要补全图标。",
        readProgress: 100, categories: ["系统"],
        body: [
          "本地 OPML 文件导入完成，共解析到 5 个订阅源。",
          "其中 4 个已自动启用并加入默认分组，1 个需要补全图标后手动启用。",
          "导入的订阅源已保留原有分组关系，可在分组管理页查看和调整。"
        ],
        images: []
      },
      {
        title: "阅读器路线图讨论摘要", source: "阅读器版本讨论", time: "周一",
        group: "社区", unread: false, starred: true, author: "社区用户",
        link: "example.com/reader-discussions/roadmap",
        desc: "围绕 RSS 收藏、源分组、正文阅读和同步备份的交互关系做了讨论。",
        readProgress: 60, categories: ["讨论"],
        body: [
          "社区围绕阅读器的 RSS 收藏、源分组、正文阅读和同步备份的交互关系做了一次集中讨论。",
          "核心结论：收藏应独立于订阅源，支持跨源收藏和分组管理；正文阅读优先用解析规则，WebView 作为兜底。",
          "同步备份采用 OPML 作为订阅源交换格式，规则订阅作为增量同步补充。"
        ],
        images: []
      },
      {
        title: "前端性能优化实践：减少首屏渲染时间", source: "技术博客精选", time: "11:30",
        group: "技术", unread: true, starred: false, author: "技术作者",
        link: "example.com/tech-blog/perf",
        desc: "通过代码分割、懒加载和关键 CSS 内联，将首屏渲染时间从 2.4s 降低到 0.8s。",
        readProgress: 0, categories: ["前端"],
        body: [
          "首屏渲染时间是用户体验的关键指标。本文通过三个手段将首屏时间从 2.4s 降低到 0.8s。",
          "第一，路由级代码分割，按 Tab 拆分 bundle，初始只加载书架模块。",
          "第二，图片懒加载配合 IntersectionObserver，首屏不渲染屏外图片。",
          "第三，关键 CSS 内联到 HTML head，避免阻塞渲染的外链请求。"
        ],
        images: [
          { alt: "首屏渲染时间对比", caption: "优化前后首屏时间对比" },
          { alt: "代码分割示意图", caption: "路由级代码分割" }
        ]
      }
    ];
  }

  // 分类数据（侧栏导航用）
  function d2RssCategoriesData() {
    return [
      { label: "全部", route: "rss-all", title: "全部条目", count: 18, icon: "list" },
      { label: "Releases", route: "rss-source-category-releases", title: "Releases", count: 8, icon: "tag" },
      { label: "Issues", route: "rss-source-category-issues", title: "Issues", count: 6, icon: "bug" },
      { label: "Discussions", route: "rss-source-category-discussions", title: "Discussions", count: 4, icon: "chat" },
      { label: "Novel", route: "rss-source-category-novel", title: "Novel", count: 6, icon: "book" },
      { label: "Tech", route: "rss-source-category-tech", title: "Tech", count: 5, icon: "code" },
      { label: "Booklist", route: "rss-source-category-booklist", title: "Booklist", count: 3, icon: "bookmark" }
    ];
  }

  // 订阅源分组数据
  function d2RssGroupsData() {
    return [
      { name: "开源项目", sourceCount: 1, pinned: true, color: "good", description: "开源项目版本发布订阅" },
      { name: "社区", sourceCount: 1, pinned: true, color: "good", description: "社区讨论与经验整理" },
      { name: "维护", sourceCount: 1, pinned: false, color: "warn", description: "维护公告（需登录）" },
      { name: "系统", sourceCount: 1, pinned: false, color: "muted", description: "本地系统通知" },
      { name: "技术", sourceCount: 1, pinned: false, color: "good", description: "技术博客精选" }
    ];
  }

  // 收藏分组数据
  function d2RssFavoriteGroupsData() {
    return [
      { name: "默认分组", count: 2, pinned: true, description: "默认收藏分组" },
      { name: "开源项目", count: 1, pinned: true, description: "开源项目相关收藏" },
      { name: "社区", count: 1, pinned: false, description: "社区讨论收藏" }
    ];
  }

  // 阅读记录数据
  function d2RssRecordsData() {
    return [
      { title: "Reader UI 前端输入件更新说明", time: "今天 10:26", source: "GitHub Releases", readProgress: 100, duration: "3 分钟", unread: false },
      { title: "订阅源规则解析失败排查", time: "今天 09:58", source: "书源维护公告", readProgress: 80, duration: "2 分钟", unread: false },
      { title: "Legado 订阅源配置经验整理", time: "昨天 22:10", source: "阅读器版本讨论", readProgress: 45, duration: "5 分钟", unread: true },
      { title: "前端性能优化实践", time: "昨天 14:30", source: "技术博客精选", readProgress: 30, duration: "1 分钟", unread: true },
      { title: "阅读器路线图讨论摘要", time: "周一 20:15", source: "阅读器版本讨论", readProgress: 60, duration: "4 分钟", unread: false }
    ];
  }

  // 规则订阅数据
  function d2RssRuleSubsData() {
    return [
      {
        name: "社区 RSS 源订阅", type: "RSS 源",
        url: "https://example.com/rss-source.json",
        update: "自动更新", lastSync: "10:18", autoUpdate: true,
        conflictStrategy: "保留本地名称、分组、启用状态",
        itemCount: 12, description: "社区维护的 RSS 源合集，Wi-Fi 下自动更新"
      },
      {
        name: "默认书源订阅", type: "书源",
        url: "https://example.com/book-source.json",
        update: "手动", lastSync: "昨天", autoUpdate: false,
        conflictStrategy: "保留本地名称、分组、启用状态",
        itemCount: 8, description: "默认书源订阅，手动触发更新"
      },
      {
        name: "替换规则同步", type: "替换规则",
        url: "https://example.com/replace-rule.json",
        update: "自动更新", lastSync: "今天 08:00", autoUpdate: true,
        conflictStrategy: "覆盖本地规则",
        itemCount: 5, description: "替换规则远程同步，覆盖本地"
      }
    ];
  }

  // 导入条目数据（OPML 导入预览）
  function d2RssImportEntriesData() {
    return [
      { name: "社区 RSS 源合集", meta: "新增 · 12 个源", checked: true, tone: "good", type: "folder", opmlPath: "/community/feeds.opml" },
      { name: "GitHub Releases", meta: "已有 · 保留本地名称", checked: false, tone: "muted", type: "feed", opmlPath: "/community/github.opml" },
      { name: "书源维护公告", meta: "更新 · 规则版本更高", checked: true, tone: "warn", type: "feed", opmlPath: "/community/notice.opml" },
      { name: "技术博客精选", meta: "新增 · 5 个源", checked: true, tone: "good", type: "folder", opmlPath: "/community/tech.opml" }
    ];
  }

  // OPML 导出条目数据
  function d2RssExportEntriesData() {
    return d2RssSourcesData().map((source) => ({
      name: source.name,
      meta: `${source.group} · ${source.rule} · ${source.enabled ? "启用" : "暂停"}`,
      checked: source.enabled,
      tone: source.enabled ? "good" : "muted",
      url: source.url
    }));
  }

  // ===========================================================================
  // 三、辅助组件
  // ===========================================================================

  // RSS 状态徽章
  function d2RssBadge(label, tone) {
    if (!label) return "";
    return `<em class="fd-rss-badge is-${esc(tone || "muted")}" title="${esc(label)}" aria-label="${esc(label)}"><i aria-hidden="true"></i></em>`;
  }

  // 底部固定操作行
  function d2RssBottomActions(actions) {
    return `
      <div class="fd-fixed-action-row fd-rss-reader-bottom-actions">
        ${actions.map((action) => {
          const routeAttr = action.route ? ` data-route="${esc(action.route)}"` : "";
          const dataAttr = action.dataAttr ? ` ${action.dataAttr}` : "";
          const toneClass = action.tone ? ` is-${esc(action.tone)}` : "";
          return `<button type="button" class="fd-rss-action${toneClass}"${routeAttr}${dataAttr}>${action.icon ? icon(action.icon, "fd-small-icon") : ""}${esc(action.label)}</button>`;
        }).join("")}
      </div>`;
  }

  // Library Shell 包装（RSS 子页面统一外壳）
  function d2RssLibraryShell(data, title, contentHtml, bottomActionHtml, appState, trailingHtml) {
    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone fd-d2-rss"), {
      data,
      title,
      ariaLabel: title,
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml,
      contentHtml,
      bottomActionHtml,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  // Main Tab Shell 包装（RSS 主页外壳）
  function d2RssMainTabShell(data, appState, config) {
    return shellKit().renderMainTabShell(Object.assign(phoneShellClasses("fd-main-tab-phone fd-rss-phone fd-d2-rss"), {
      data,
      title: "RSS",
      activeType: "rss",
      actions: [],
      topBarHtml: config.topBarHtml,
      ariaLabel: "RSS",
      contentHtml: config.contentHtml,
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  // 模式导航条（源列表 / 全部 / 收藏 / 规则订阅）
  function d2RssModeNav(currentRoute) {
    return `
      <nav class="fd-rss-mode-row" aria-label="RSS 状态入口">
        ${[
          ["源列表", "rss"],
          ["全部", "rss-all"],
          ["收藏", "rss-starred"],
          ["规则订阅", "rss-rule-subscription"]
        ].map(([label, target]) => `<button class="${currentRoute === target ? "is-active" : ""}" type="button" data-route="${esc(target)}">${esc(label)}</button>`).join("")}
      </nav>`;
  }

  // 分类侧栏（左侧分类导航）
  function d2RssCategorySidebar(activeRoute) {
    const categories = d2RssCategoriesData();
    return `
      <aside class="fd-rss-category-sidebar fd-d2-rss-sidebar" aria-label="RSS 分类导航">
        <header>
          <h2>分类</h2>
          <button type="button" data-route="rss-subscription-management" aria-label="管理订阅源">${icon("source-stack", "fd-small-icon")}</button>
        </header>
        <ul>
          ${categories.map((cat) => `
            <li class="${activeRoute === cat.route ? "is-active" : ""}">
              <button type="button" data-route="${esc(cat.route)}">
                ${icon(cat.icon || "list", "fd-small-icon")}
                <span>${esc(cat.label)}</span>
                <em>${esc(cat.count)}</em>
              </button>
            </li>`).join("")}
        </ul>
      </aside>`;
  }

  // 搜索入口
  function d2RssSearchEntry() {
    return `
      <button class="fd-search-entry fd-rss-search" type="button" data-route="rss-search">
        ${icon("search", "fd-small-icon")}<span>搜索订阅源、文章标题或分组</span>
      </button>`;
  }

  // 文章行（含已读未读标记、收藏标记）
  function d2RssArticleRow(article, options) {
    const opts = options || {};
    const showReadMark = opts.showReadMark !== false;
    return `
      <article class="fd-rss-article-row${article.unread ? " is-unread" : ""} fd-d2-rss-article-row" role="button" tabindex="0" data-route="rss-detail" data-article-title="${esc(article.title)}">
        <i class="fd-rss-read-dot"${showReadMark ? "" : " aria-hidden=\"true\""}></i>
        <span>
          <strong>${esc(article.title)}</strong>
          <small>${esc(article.source)} · ${esc(article.time)} · ${esc(article.group)}${article.author ? ` · ${esc(article.author)}` : ""}</small>
          <p>${esc(article.desc)}</p>
          ${article.readProgress > 0 && article.readProgress < 100 ? `<span class="fd-d2-rss-progress" aria-label="阅读进度 ${esc(article.readProgress)}%"><i style="width:${esc(article.readProgress)}%"></i></span>` : ""}
        </span>
        <span class="fd-rss-article-actions">
          ${article.starred ? icon("bookmark", "fd-small-icon") : ""}
          <button type="button" data-action="toggle-read" data-article-title="${esc(article.title)}" aria-label="${article.unread ? "标记为已读" : "标记为未读"}">${icon(article.unread ? "check" : "circle", "fd-small-icon")}</button>
        </span>
      </article>`;
  }

  // 文章列表区块
  function d2RssArticleSection(title, articles, actionRoute, actionLabel, actionIcon) {
    return `
      <section class="fd-rss-article-section fd-d2-rss-section">
        <header>
          <h2>${esc(title)}</h2>
          <span class="fd-d2-rss-section-meta">${esc(articles.length)} 条</span>
          <button type="button" data-route="${esc(actionRoute || "rss-subscription-management")}">${icon(actionIcon || "source-stack", "fd-small-icon")}${esc(actionLabel || "管理源")}</button>
        </header>
        <section class="fd-rss-article-list" aria-label="${esc(title)}">
          ${articles.length ? articles.map((item) => d2RssArticleRow(item)).join("") : `<p class="fd-d2-rss-empty">暂无条目</p>`}
        </section>
      </section>`;
  }

  // 顶部栏（含刷新按钮和管理入口）
  function d2RssTopBar(sources) {
    const enabledCount = (sources || []).filter((item) => item.enabled).length;
    const totalUnread = (sources || []).reduce((sum, item) => sum + (item.unread || 0), 0);
    return `
      <section class="rsk-app-top-bar fd-top-bar fd-rss-top-bar fd-d2-rss-top-bar" data-slot="appTopBar" aria-label="RSS 顶部栏">
        <h1>RSS</h1>
        <div class="fd-rss-top-actions">
          <button class="fd-rss-refresh-pill" type="button" data-route="rss-refreshing" aria-label="刷新当前订阅">
            <i></i>
            <span class="fd-rss-refresh-text">
              <span class="fd-rss-refresh-enabled">${esc(enabledCount)} 个启用源</span>
              <span class="fd-rss-refresh-update">· ${esc(totalUnread)} 条未读 · 10:18 更新</span>
            </span>
            ${icon("refresh", "fd-small-icon")}
          </button>
          <button class="fd-rss-manage-pill" type="button" data-route="rss-subscription-management" aria-label="进入订阅管理">
            ${icon("list", "fd-small-icon")}
            <span>管理</span>
          </button>
        </div>
      </section>`;
  }

  // 表单字段区块（用于 CRUD 表单）
  function d2RssFieldRow(group, label, value, options) {
    const opts = options || {};
    const type = opts.type || "text";
    if (type === "select") {
      const optionsHtml = (opts.options || []).map((opt) => `<option${opt === value ? " selected" : ""}>${esc(opt)}</option>`).join("");
      return `
        <article class="fd-d2-rss-field" data-field-group="${esc(group)}" data-field-label="${esc(label)}">
          <small>${esc(group)}</small>
          <strong>${esc(label)}</strong>
          <select aria-label="${esc(label)}">${optionsHtml}</select>
        </article>`;
    }
    if (type === "switch") {
      return `
        <article class="fd-d2-rss-field" data-field-group="${esc(group)}" data-field-label="${esc(label)}">
          <small>${esc(group)}</small>
          <strong>${esc(label)}</strong>
          ${settingsSwitch(opts.enabled !== false)}
        </article>`;
    }
    if (type === "textarea") {
      return `
        <article class="fd-d2-rss-field" data-field-group="${esc(group)}" data-field-label="${esc(label)}">
          <small>${esc(group)}</small>
          <strong>${esc(label)}</strong>
          <textarea aria-label="${esc(label)}" placeholder="${esc(opts.placeholder || "")}">${esc(value || "")}</textarea>
        </article>`;
    }
    return `
      <article class="fd-d2-rss-field" data-field-group="${esc(group)}" data-field-label="${esc(label)}">
        <small>${esc(group)}</small>
        <strong>${esc(label)}</strong>
        <input type="text" value="${esc(value || "")}" aria-label="${esc(label)}" placeholder="${esc(opts.placeholder || "")}">
      </article>`;
  }

  // 表单分组标签页
  function d2RssFormTabs(tabs, activeIndex) {
    return `
      <section class="fd-rss-edit-tabs fd-d2-rss-form-tabs" aria-label="表单分组">
        ${tabs.map((tab, index) => `<button class="${index === activeIndex ? "is-active" : ""}" type="button" data-tab="${esc(tab)}">${esc(tab)}</button>`).join("")}
      </section>`;
  }

  // 调试面板（用于规则调试、导入详情等）
  function d2RssDebugPanel(headerIcon, headerTitle, headerMeta, steps) {
    return `
      <section class="fd-rss-debug-panel fd-d2-rss-debug-panel">
        <header>
          <span>${icon(headerIcon || "bug", "fd-small-icon")}</span>
          <div><strong>${esc(headerTitle)}</strong><small>${esc(headerMeta)}</small></div>
        </header>
        ${(steps || []).map((step) => `
          <article class="${step.warn ? "is-warn" : ""}">
            <strong>${esc(step.title)}</strong>
            <p>${esc(step.detail)}</p>
          </article>`).join("")}
      </section>`;
  }

  // 确认对话框内容卡
  function d2RssConfirmCard(config) {
    return `
      <section class="fd-rss-confirm-card fd-d2-rss-confirm-card">
        <span>${icon(config.icon || "warning", "fd-medium-icon")}</span>
        <h2>${esc(config.heading)}</h2>
        <p>${esc(config.copy)}</p>
        ${config.detail ? `<small>${esc(config.detail)}</small>` : ""}
        ${config.extraHtml || ""}
      </section>`;
  }

  // ===========================================================================
  // 四、10 个产品化 renderer
  // ===========================================================================

  // ---------------------------------------------------------------------------
  // 1. rssHomeScreenV2 —— RSS 首页
  //    文章流 + 分类侧栏 + 刷新 + 已读未读标记
  //    覆盖路由：rss / rss-all / rss-refreshing / rss-source-feed /
  //             rss-source-category-* / rss-starred / rss-search /
  //             rss-empty / rss-error
  // ---------------------------------------------------------------------------
  function rssHomeScreenV2(data, appState, route) {
    const currentRoute = route || "rss";
    const sources = d2RssSourcesData();
    const allArticles = d2RssArticlesData();
    const refreshing = currentRoute === "rss-refreshing";
    const isError = currentRoute === "rss-error";
    const isEmpty = currentRoute === "rss-empty";
    const isSearch = currentRoute === "rss-search";
    const isStarred = currentRoute === "rss-starred";
    const isSourceFeed = currentRoute === "rss-source-feed" || currentRoute.startsWith("rss-source-category-");

    // 根据路由过滤文章
    let filteredArticles = allArticles;
    let pageTitle = "RSS";
    if (isStarred) {
      filteredArticles = allArticles.filter((item) => item.starred);
      pageTitle = "RSS 收藏";
    } else if (currentRoute === "rss-all") {
      pageTitle = "全部条目";
    } else if (isSourceFeed) {
      filteredArticles = allArticles.filter((item) => item.source === "GitHub Releases");
      pageTitle = "GitHub Releases";
    } else if (refreshing) {
      pageTitle = "刷新订阅";
    }

    // 搜索模式：渲染搜索面板 + 结果
    if (isSearch) {
      return d2RssLibraryShell(data, "RSS 搜索", `
        <section class="fd-rss-search-panel fd-d2-rss-search-panel">
          <label>${icon("search", "fd-small-icon")}<input type="search" placeholder="搜索订阅源、文章标题或分组" value="RSS"></label>
          <nav aria-label="RSS 搜索范围">
            ${["全部", "订阅源", "文章", "分组"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-search-scope="${esc(item)}">${esc(item)}</button>`).join("")}
          </nav>
          <section class="fd-d2-rss-search-filters">
            ${filterDisclosure({
              className: "fd-d2-rss-search-filter",
              label: "时间",
              ariaLabel: "搜索时间筛选",
              summary: "全部时间",
              toggleAttr: "data-rss-search-time-toggle",
              open: false,
              groups: [{
                title: "发布时间",
                options: [
                  { label: "全部时间", active: true, attrs: { "data-rss-search-time": "all" } },
                  { label: "今天", attrs: { "data-rss-search-time": "today" } },
                  { label: "本周", attrs: { "data-rss-search-time": "week" } },
                  { label: "本月", attrs: { "data-rss-search-time": "month" } }
                ]
              }]
            })}
            ${filterDisclosure({
              className: "fd-d2-rss-search-filter",
              label: "来源",
              ariaLabel: "搜索来源筛选",
              summary: "全部来源",
              toggleAttr: "data-rss-search-source-toggle",
              open: false,
              groups: [{
                title: "订阅源",
                options: sources.map((src) => ({
                  label: src.name,
                  attrs: { "data-rss-search-source": src.name }
                }))
              }]
            })}
          </section>
        </section>
        ${d2RssArticleSection("搜索结果（" + filteredArticles.length + " 条）", filteredArticles, "rss-subscription-management", "管理源", "source-stack")}`, "", appState);
    }

    // 空状态 / 错误状态
    if (isEmpty || isError) {
      return d2RssLibraryShell(data, isError ? "RSS 错误" : "RSS 空状态", `
        <section class="fd-search-state fd-rss-state-card fd-d2-rss-state-card ${isError ? "is-error" : "is-empty"}">
          <span>${icon(isError ? "warning" : "rss", "fd-medium-icon")}</span>
          <h2>${isError ? "订阅刷新失败" : "暂无未读订阅"}</h2>
          <p>${isError ? "2 个订阅源刷新失败，已保留最近缓存条目。可以稍后重试、查看错误源，或进入订阅源管理修复登录态和规则。" : "当前订阅源没有新的未读条目。你可以查看全部、管理订阅源或手动刷新。"}</p>
          ${isError ? `<section class="fd-rss-error-list fd-d2-rss-error-list">
            <article><strong>书源维护公告</strong><small>登录态失效 · 需要重新登录</small>${d2RssBadge("需登录", "warn")}</article>
            <article><strong>本地系统通知</strong><small>源已暂停 · 不参与自动刷新</small>${d2RssBadge("暂停", "muted")}</article>
          </section>` : ""}
          <div class="fd-action-row">
            <button type="button" data-route="${isError ? "rss-refreshing" : "rss-all"}">${isError ? "重试刷新" : "查看全部"}</button>
            <button type="button" data-route="rss-subscription-management">订阅管理</button>
          </div>
        </section>`, "", appState);
    }

    // 构建首页内容
    const unreadCount = allArticles.filter((item) => item.unread).length;
    const contentHtml = `
      ${d2RssSearchEntry()}
      ${d2RssModeNav(currentRoute)}
      ${refreshing ? `<section class="fd-rss-refresh-line fd-d2-rss-refresh-line"><i></i><span>正在刷新启用订阅源和分类入口（${sources.filter((s) => s.enabled).length} 个源）</span></section>` : ""}
      <section class="fd-d2-rss-home-layout">
        ${d2RssCategorySidebar(currentRoute)}
        <div class="fd-d2-rss-home-main">
          ${isStarred ? `
            <section class="fd-d2-rss-favorite-bar">
              ${filterDisclosure({
                className: "fd-rss-filter-control fd-rss-favorite-filter-control",
                label: "收藏分组",
                ariaLabel: "RSS 收藏分组",
                summary: appState?.rssFavoriteFilter || "默认分组",
                toggleAttr: "data-rss-favorite-filter-toggle",
                open: Boolean(appState?.rssFavoriteFilterOpen),
                groups: [{
                  title: "收藏分组",
                  options: d2RssFavoriteGroupsData().map((group) => ({
                    label: `${group.name}（${group.count}）`,
                    active: (appState?.rssFavoriteFilter || "默认分组") === group.name,
                    attrs: { "data-rss-favorite-filter": group.name }
                  }))
                }]
              })}
              <button type="button" data-route="rss-favorite-groups">${icon("edit", "fd-small-icon")}管理分组</button>
            </section>` : ""}
          ${d2RssArticleSection(
            refreshing ? "刷新中" : (isStarred ? "收藏条目" : (isSourceFeed ? pageTitle : "最近未读")),
            refreshing ? [] : (isStarred ? filteredArticles : filteredArticles.slice(0, isSourceFeed ? undefined : 4)),
            isSourceFeed ? "rss-source-actions" : "rss-all",
            isSourceFeed ? "源操作" : "查看全部",
            isSourceFeed ? "more" : "list"
          )}
          ${!isSourceFeed && !isStarred ? `
            <section class="fd-d2-rss-source-overview">
              <header>
                <h2>订阅源概览</h2>
                <button type="button" data-route="rss-subscription-management">${icon("list", "fd-small-icon")}管理全部</button>
              </header>
              <section class="fd-d2-rss-source-grid">
                ${sources.filter((s) => s.enabled).slice(0, 3).map((source) => `
                  <article class="fd-d2-rss-source-card${source.unread ? " has-unread" : ""}" role="button" tabindex="0" data-route="rss-source-feed">
                    <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
                    <strong>${esc(source.name)}</strong>
                    <small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 未读` : "无未读"}</small>
                    ${d2RssBadge(source.status, source.tone)}
                  </article>`).join("")}
              </section>
            </section>` : ""}
          <section class="fd-rss-bottom-loading fd-d2-rss-bottom-loading"><i></i><span>继续下滑加载下一页</span></section>
        </div>
      </section>`;

    // rss 主路由用 MainTabShell，其余用 LibraryShell
    if (currentRoute === "rss" || currentRoute === "rss-refreshing") {
      return d2RssMainTabShell(data, appState, {
        topBarHtml: d2RssTopBar(sources),
        contentHtml
      });
    }
    return d2RssLibraryShell(data, pageTitle, contentHtml, "", appState);
  }

  // ---------------------------------------------------------------------------
  // 2. rssArticleDetailScreenV2 —— 文章详情
  //    正文 + 图片 + 元信息 + 收藏/分享
  //    覆盖路由：rss-detail
  // ---------------------------------------------------------------------------
  function rssArticleDetailScreenV2(data, appState, route) {
    const article = d2RssArticlesData()[0];
    const bodyParagraphs = (article.body || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const imagesHtml = (article.images || []).map((img) => `
      <figure class="fd-d2-rss-article-image">
        <div class="fd-d2-rss-image-placeholder" aria-label="${esc(img.alt)}">${icon("image", "fd-medium-icon")}</div>
        <figcaption>${esc(img.caption || img.alt)}</figcaption>
      </figure>`).join("");

    return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-rss-reader-phone fd-d2-rss"), {
      data,
      title: "RSS 阅读",
      ariaLabel: "RSS 阅读",
      topBarClass: "fd-back-bar",
      bottomActionHostClass: "fd-bottom-action-host",
      trailingHtml: `
        <span class="fd-rss-reader-top-actions fd-d2-rss-reader-actions">
          <button type="button" data-route="rss-starred" aria-label="收藏">${icon("bookmark", "fd-small-icon")}</button>
          <button type="button" data-action="share-article" aria-label="分享">${icon("share", "fd-small-icon")}</button>
          <button type="button" data-route="rss-original" aria-label="打开原文">${icon("link", "fd-small-icon")}</button>
        </span>`,
      contentHtml: `
        <article class="fd-rss-reader-page fd-d2-rss-article-page">
          <header class="fd-rss-reader-source fd-d2-rss-article-source">
            <span>${icon("rss", "fd-small-icon")}</span>
            <div>
              <strong>${esc(article.source)}</strong>
              <small>${esc(article.time)} · ${esc(article.group)}${article.author ? ` · 作者：${esc(article.author)}` : ""} · 已解析正文</small>
            </div>
            <button type="button" data-route="rss-source-feed">查看源</button>
          </header>
          <section class="fd-rss-reader-title fd-d2-rss-article-title">
            <h1>${esc(article.title)}</h1>
            <p>${esc(article.desc)}</p>
            <div class="fd-d2-rss-article-meta">
              ${article.categories.map((cat) => `<span class="fd-d2-rss-tag">${esc(cat)}</span>`).join("")}
              <span class="fd-d2-rss-meta-item">${icon("link", "fd-small-icon")}${esc(article.link)}</span>
            </div>
          </section>
          <nav class="fd-rss-reader-inline-actions fd-d2-rss-article-inline-actions" aria-label="RSS 阅读操作">
            <button type="button" data-action="mark-read" data-article-title="${esc(article.title)}">${icon("check", "fd-small-icon")}${article.unread ? "标记已读" : "已读"}</button>
            <button type="button" data-route="rss-favorite-add">${icon("bookmark", "fd-small-icon")}${article.starred ? "已收藏" : "收藏"}</button>
            <button type="button" data-action="share-article">${icon("share", "fd-small-icon")}分享</button>
            <button type="button" data-route="rss-subscription-management">${icon("source-stack", "fd-small-icon")}源设置</button>
          </nav>
          <section class="fd-rss-reader-body fd-d2-rss-article-body">
            ${bodyParagraphs}
            ${imagesHtml}
          </section>
          <footer class="fd-rss-original-card fd-d2-rss-original-card">
            <span>${icon("link", "fd-small-icon")}</span>
            <div>
              <strong>原文链接</strong>
              <small>${esc(article.link)}</small>
            </div>
            <button type="button" data-route="rss-original">打开</button>
          </footer>
        </article>`,
      bottomActionHtml: d2RssBottomActions([
        { label: "返回列表", route: "rss", icon: "back" },
        { label: "上一篇", dataAttr: 'data-action="prev-article"', icon: "chevron-left" },
        { label: "打开原文", route: "rss-original", icon: "link", tone: "primary" }
      ]),
      stateHostHtml: mainTabFeedbackHtml(appState)
    }));
  }

  // ---------------------------------------------------------------------------
  // 3. rssOriginalWebViewScreen —— 原文 WebView + 系统浏览器确认
  //    覆盖路由：rss-original / rss-original-browser
  // ---------------------------------------------------------------------------
  function rssOriginalWebViewScreen(data, appState, route) {
    const article = d2RssArticlesData()[0];

    // 系统浏览器确认对话框
    if (route === "rss-original-browser") {
      return d2RssLibraryShell(data, "系统浏览器", `
        ${d2RssConfirmCard({
          icon: "globe",
          heading: "已准备打开原文链接",
          copy: "即将调用系统浏览器打开原文，同时保留当前 RSS 阅读上下文，可随时返回。",
          detail: "原文链接：" + article.link,
          extraHtml: `
            <section class="fd-d2-rss-browser-options">
              <article><small>打开方式</small><strong>系统默认浏览器</strong></article>
              <article><small>保留上下文</small><strong>是 · 返回后回到 RSS 正文</strong></article>
              <article><small>复制链接</small><button type="button" data-action="copy-link">点击复制</button></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "返回原文页", route: "rss-original", icon: "back" },
          { label: "回到正文", route: "rss-detail", icon: "check" },
          { label: "确认打开", dataAttr: 'data-action="open-system-browser"', icon: "globe", tone: "primary" }
        ]), appState);
    }

    // WebView 容器页
    return d2RssLibraryShell(data, "原文页面", `
      <section class="fd-rss-original-preview fd-d2-rss-webview-container">
        <header class="fd-d2-rss-webview-header">
          <span>${icon("link", "fd-small-icon")}</span>
          <div>
            <strong>${esc(article.link)}</strong>
            <small>来自 ${esc(article.source)} · 已保留 RSS 阅读上下文</small>
          </div>
          <button type="button" data-action="copy-link" aria-label="复制链接">${icon("copy", "fd-small-icon")}</button>
        </header>
        <nav class="fd-d2-rss-webview-toolbar" aria-label="WebView 工具栏">
          <button type="button" data-action="webview-back" aria-label="后退">${icon("chevron-left", "fd-small-icon")}</button>
          <button type="button" data-action="webview-forward" aria-label="前进">${icon("chevron", "fd-small-icon")}</button>
          <button type="button" data-action="webview-refresh" aria-label="刷新">${icon("refresh", "fd-small-icon")}</button>
          <button type="button" data-route="rss-original-browser" aria-label="用浏览器打开">${icon("globe", "fd-small-icon")}</button>
          <button type="button" data-action="webview-share" aria-label="分享">${icon("share", "fd-small-icon")}</button>
        </nav>
        <article class="fd-rss-web-preview fd-d2-rss-webview-body" data-webview-container aria-label="原文 WebView 预览">
          <h2>${esc(article.title)}</h2>
          <p class="fd-d2-rss-webview-meta">${esc(article.source)} · ${esc(article.time)} · ${esc(article.author || "")}</p>
          ${(article.body || []).slice(0, 2).map((p) => `<p>${esc(p)}</p>`).join("")}
          <div class="fd-d2-rss-webview-loading"><i></i><span>WebView 正在加载原文…</span></div>
          <div class="fd-d2-rss-webview-skeleton"><i></i><i></i><i></i></div>
        </article>
        <section class="fd-d2-rss-webview-status">
          <span>${icon("shield", "fd-small-icon")}已启用白名单拦截</span>
          <span>${icon("image", "fd-small-icon")}图片已优化</span>
          <span>${icon("check", "fd-small-icon")}夜间模式跟随系统</span>
        </section>
      </section>`, d2RssBottomActions([
        { label: "返回正文", route: "rss-detail", icon: "back" },
        { label: "复制链接", dataAttr: 'data-action="copy-link"', icon: "copy" },
        { label: "浏览器打开", route: "rss-original-browser", icon: "globe", tone: "primary" }
      ]), appState, `<button type="button" data-route="rss-detail">阅读正文</button>`);
  }

  // ---------------------------------------------------------------------------
  // 4. rssSubscriptionCrudScreen —— 订阅源 CRUD
  //    新增/编辑/删除订阅源
  //    覆盖路由：rss-subscription-management / rss-source-edit / rss-source-add /
  //             rss-source-actions / rss-source-delete-confirm /
  //             rss-source-debug / rss-source-vars / rss-source-pin /
  //             rss-source-disable
  // ---------------------------------------------------------------------------
  function rssSubscriptionCrudScreen(data, appState, route) {
    const sources = d2RssSourcesData();

    // 订阅源列表管理页
    if (route === "rss-subscription-management" || !route) {
      const filters = ["全部", "已启用", "需登录", "无分组", "暂停"];
      const activeFilter = appState?.rssManageFilter || "全部";
      return d2RssLibraryShell(data, "RSS 订阅管理", `
        <section class="fd-rss-manage-actions fd-d2-rss-manage-actions">
          <button type="button" data-route="rss-source-add">${icon("add", "fd-small-icon")}新建</button>
          <button type="button" data-route="rss-source-import">${icon("upload", "fd-small-icon")}导入</button>
          <button type="button" data-route="rss-rule-subscription">${icon("sync", "fd-small-icon")}规则订阅</button>
          <button type="button" data-route="rss-source-groups">${icon("folder", "fd-small-icon")}分组</button>
          <button type="button" data-route="rss-source-batch">${icon("list", "fd-small-icon")}批量</button>
          <button type="button" data-route="rss-source-export">${icon("download", "fd-small-icon")}导出</button>
        </section>
        ${filterDisclosure({
          className: "fd-rss-filter-control fd-rss-manage-filter-control",
          label: "筛选",
          ariaLabel: "RSS 订阅管理筛选",
          summary: activeFilter,
          toggleAttr: "data-rss-manage-filter-toggle",
          open: Boolean(appState?.rssManageFilterOpen),
          groups: [{
            title: "订阅源状态",
            options: filters.map((item) => ({
              label: item,
              active: activeFilter === item,
              attrs: { "data-rss-manage-filter": item }
            }))
          }]
        })}
        <section class="fd-rss-source-list fd-d2-rss-source-list" aria-label="RSS 订阅源列表">
          ${sources.map((source) => `
            <article class="${source.enabled ? "" : "is-disabled"} fd-d2-rss-source-item" role="button" tabindex="0" data-route="rss-source-feed">
              <span>${icon(source.enabled ? "rss" : "offline", "fd-small-icon")}</span>
              <strong>${esc(source.name)}<small>${esc(source.group)} · ${source.unread ? `${esc(source.unread)} 条未读` : "无未读"} · ${esc(source.latest)} · ${esc(source.articleStyle)}</small></strong>
              ${source.pinned ? icon("top", "fd-small-icon") : ""}
              ${d2RssBadge(source.status, source.tone)}
              <button type="button" data-route="rss-source-actions" aria-label="${esc(source.name)}更多操作">${icon("more", "fd-small-icon")}</button>
            </article>`).join("")}
        </section>
        <section class="fd-rss-manage-batch-row fd-d2-rss-manage-batch-row">
          <strong>已选 0 个</strong>
          <button type="button" data-route="rss-source-batch">批量管理</button>
          <button type="button" data-route="rss-source-batch-disable">禁用</button>
          <button type="button" data-route="rss-source-export">导出</button>
        </section>
        <section class="fd-rss-source-settings fd-d2-rss-source-settings">
          <h2>刷新与提醒</h2>
          <article><span>${icon("refresh", "fd-small-icon")}</span><strong>自动刷新<small>Wi-Fi 下每 30 分钟刷新一次</small></strong>${settingsSwitch(true)}</article>
          <article><span>${icon("bell", "fd-small-icon")}</span><strong>未读提醒<small>只提醒重点订阅源</small></strong>${settingsSwitch(true)}</article>
          <article><span>${icon("wifi", "fd-small-icon")}</span><strong>仅 Wi-Fi 刷新<small>移动数据下不自动刷新</small></strong>${settingsSwitch(false)}</article>
        </section>`, "", appState);
    }

    // 单个源操作页（操作九宫格）
    if (route === "rss-source-actions") {
      const source = sources[0];
      return d2RssLibraryShell(data, "源操作", `
        <section class="fd-rss-action-source-card fd-d2-rss-action-source-card">
          <span>${icon("rss", "fd-medium-icon")}</span>
          <div>
            <strong>${esc(source.name)}</strong>
            <small>${esc(source.group)} · ${esc(source.categories)} 个入口 · ${esc(source.rule)} · ${esc(source.syncInterval)}</small>
          </div>
          ${d2RssBadge(source.status, source.tone)}
        </section>
        <section class="fd-d2-rss-source-detail">
          <article><small>源地址</small><strong>${esc(source.url)}</strong></article>
          <article><small>描述</small><strong>${esc(source.description)}</strong></article>
          <article><small>最近同步</small><strong>${esc(source.lastSync)}</strong></article>
        </section>
        <section class="fd-rss-action-grid fd-d2-rss-action-grid">
          ${[
            ["刷新入口", "refresh", "rss-refreshing"],
            ["编辑源", "edit", "rss-source-edit"],
            ["规则调试", "bug", "rss-source-debug"],
            ["阅读记录", "clock", "rss-read-record"],
            ["源变量", "code", "rss-source-vars"],
            ["登录", "shield", "rss-source-login"],
            ["置顶", "top", "rss-source-pin"],
            ["禁用", "offline", "rss-source-disable"],
            ["删除", "trash", "rss-source-delete-confirm"]
          ].map(([label, itemIcon, target]) => `<button type="button" data-route="${esc(target)}" class="${target === "rss-source-delete-confirm" ? "is-danger" : ""}">${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
        </section>`, d2RssBottomActions([
          { label: "返回源", route: "rss-source-feed", icon: "back" },
          { label: "管理全部", route: "rss-subscription-management", icon: "list" }
        ]), appState);
    }

    // 新增 / 编辑表单
    if (route === "rss-source-edit" || route === "rss-source-add") {
      const isNew = route === "rss-source-add";
      const source = isNew ? { name: "", group: "", url: "", rule: "默认 RSS", articleStyle: "列表", enabled: true } : sources[0];
      return d2RssLibraryShell(data, isNew ? "新增订阅源" : "编辑订阅源", `
        ${d2RssFormTabs(["基础", "请求", "列表", "WebView"], 0)}
        <section class="fd-rss-edit-list fd-d2-rss-form-list" aria-label="订阅源编辑字段">
          ${d2RssFieldRow("基础", "源名称", source.name, { placeholder: "输入订阅源名称" })}
          ${d2RssFieldRow("基础", "源地址", source.url, { placeholder: "https://example.com/rss" })}
          ${d2RssFieldRow("基础", "分组", source.group, { type: "select", options: ["开源项目", "社区", "维护", "系统", "技术", "（新建分组）"] })}
          ${d2RssFieldRow("基础", "分类 URL", "Releases::/releases.atom && Issues::/issues.atom", { type: "textarea", placeholder: "分类名称::URL && 分类名称::URL" })}
          ${d2RssFieldRow("基础", "描述", source.description, { type: "textarea", placeholder: "订阅源描述（可选）" })}
          ${d2RssFieldRow("基础", "启用", null, { type: "switch", enabled: source.enabled })}
          ${d2RssFieldRow("基础", "置顶", null, { type: "switch", enabled: source.pinned || false })}
          ${d2RssFieldRow("基础", "文章样式", source.articleStyle, { type: "select", options: ["列表", "图文", "紧凑"] })}
          ${d2RssFieldRow("基础", "解析规则", source.rule, { type: "select", options: ["默认 RSS", "自定义列表", "正文规则", "单 URL"] })}
        </section>
        <section class="fd-d2-rss-form-preview">
          <h3>实时预览</h3>
          <article class="fd-d2-rss-source-item">
            <span>${icon("rss", "fd-small-icon")}</span>
            <strong>${esc(source.name || "新订阅源")}<small>${esc(source.group || "未分组")} · 预览</small></strong>
            ${d2RssBadge("正常", "good")}
          </article>
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-subscription-management", icon: "close" },
          { label: "调试规则", route: "rss-source-debug", icon: "bug" },
          { label: isNew ? "创建" : "保存", route: "rss-subscription-management", icon: "check", tone: "primary" }
        ]), appState, `<button type="button" data-route="rss-source-debug">${icon("bug", "fd-small-icon")}调试</button>`);
    }

    // 删除确认
    if (route === "rss-source-delete-confirm") {
      const source = sources[0];
      return d2RssLibraryShell(data, "删除订阅源", `
        ${d2RssConfirmCard({
          icon: "trash",
          heading: `删除 ${esc(source.name)}？`,
          copy: "删除后该订阅源不会再刷新，已缓存文章和阅读记录可按平台策略保留或一并清理。",
          detail: "此操作不可撤销，建议先导出订阅源备份。",
          extraHtml: `
            <section class="fd-d2-rss-delete-options">
              <article><small>删除范围</small><strong>订阅源 + 缓存文章</strong></article>
              <article><small>保留项</small><strong>阅读记录 · 收藏条目</strong></article>
              <article><small>分组影响</small><strong>${esc(source.group)} 分组减少 1 个源</strong></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-source-actions", icon: "close" },
          { label: "确认删除", route: "rss-subscription-management", icon: "trash", tone: "primary" }
        ]), appState);
    }

    // 规则调试
    if (route === "rss-source-debug") {
      return d2RssLibraryShell(data, "规则调试", `
        ${d2RssDebugPanel("bug", sources[0].name, "列表解析 · 正文解析 · WebView 拦截", [
          { title: "1. 获取分类入口", detail: "Releases / Issues / Discussions 已解析，缓存命中 3 项。" },
          { title: "2. 获取文章列表", detail: "默认 RSS 解析命中 18 条，下一页规则 PAGE 可用。" },
          { title: "3. 正文规则测试", detail: "content:encoded 命中正文，图片资源通过白名单。" },
          { title: "4. 跳转拦截", detail: "外链将保留在原文 WebView，legado/yuedu 协议进入导入流程。", warn: false }
        ])}
        <section class="fd-d2-rss-debug-output">
          <header><h3>调试输出</h3><button type="button" data-action="copy-debug-log">${icon("copy", "fd-small-icon")}复制日志</button></header>
          <pre class="fd-d2-rss-debug-log">[10:18:01] 开始解析 https://github.com/minliny/Reader-UI/releases.atom
[10:18:01] 命中 RSS 2.0 规范，共 18 条条目
[10:18:02] 正文规则 content:encoded 命中 18/18
[10:18:02] 图片白名单通过 12 张，拦截 3 张广告资源
[10:18:03] 调试完成，耗时 2.1s</pre>
        </section>`, d2RssBottomActions([
          { label: "编辑规则", route: "rss-source-edit", icon: "edit" },
          { label: "完成", route: "rss-source-actions", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 源变量
    if (route === "rss-source-vars") {
      const variables = [
        ["请求变量", "{{page}}", "当前分页，从 1 开始递增，用于列表和下一页规则。"],
        ["请求变量", "{{sourceUrl}}", "当前订阅源地址，调试和跳转拦截时可引用。"],
        ["登录变量", "{{cookie}}", "网页登录后写入，刷新订阅源和打开原文时共用。"],
        ["登录变量", "{{token}}", "从登录页脚本提取，过期后进入登录子页面刷新。"],
        ["设备变量", "{{userAgent}}", "Reader UI WebView UA，必要时覆盖为移动端 UA。"]
      ];
      return d2RssLibraryShell(data, "源变量", `
        ${d2RssDebugPanel("code", sources[0].name, "变量作用于请求头、分类 URL、正文规则和 WebView 注入脚本", [])}
        <section class="fd-rss-edit-list fd-d2-rss-vars-list" aria-label="RSS 源变量">
          ${variables.map(([group, name, desc]) => `
            <article class="fd-d2-rss-var-item">
              <small>${esc(group)}</small>
              <strong>${esc(name)}</strong>
              <p>${esc(desc)}</p>
              <button type="button" data-action="copy-var" data-var="${esc(name)}">${icon("copy", "fd-small-icon")}复制</button>
            </article>`).join("")}
        </section>`, d2RssBottomActions([
          { label: "测试变量", route: "rss-source-debug", icon: "bug" },
          { label: "完成", route: "rss-source-actions", icon: "check", tone: "primary" }
        ]), appState, `<button type="button" data-route="rss-source-edit">${icon("edit", "fd-small-icon")}编辑</button>`);
    }

    // 置顶确认
    if (route === "rss-source-pin") {
      const source = sources[0];
      return d2RssLibraryShell(data, "置顶订阅源", `
        ${d2RssConfirmCard({
          icon: "top",
          heading: `置顶 ${esc(source.name)}？`,
          copy: "置顶后该订阅源会显示在源列表和快捷入口最前面，不影响刷新规则和分组。",
          detail: "适合高频阅读的发布源、公告源或需要优先查看的订阅源。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-source-actions", icon: "close" },
          { label: "确认置顶", route: "rss-source-feed", icon: "top", tone: "primary" }
        ]), appState);
    }

    // 禁用确认
    if (route === "rss-source-disable") {
      return d2RssLibraryShell(data, "禁用订阅源", `
        ${d2RssConfirmCard({
          icon: "offline",
          heading: "禁用已选订阅源？",
          copy: "禁用后不会参与自动刷新、未读提醒和 RSS 首页统计，已缓存条目和阅读记录会保留。",
          detail: "可以在订阅管理页重新启用。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-source-actions", icon: "close" },
          { label: "确认禁用", route: "rss-subscription-management", icon: "offline", tone: "primary" }
        ]), appState);
    }

    // 默认：订阅管理列表
    return rssSubscriptionCrudScreen(data, appState, "rss-subscription-management");
  }

  // ---------------------------------------------------------------------------
  // 5. rssGroupManagementScreen —— 分组管理
  //    订阅源分组 + 收藏分组
  //    覆盖路由：rss-source-groups / rss-source-group-edit /
  //             rss-favorite-groups / rss-favorite-group-edit /
  //             rss-favorite-add / rss-favorite-remove / rss-favorite-clear
  // ---------------------------------------------------------------------------
  function rssGroupManagementScreen(data, appState, route) {
    // 订阅源分组列表
    if (route === "rss-source-groups" || !route) {
      const groups = d2RssGroupsData();
      return d2RssLibraryShell(data, "RSS 分组管理", `
        <section class="fd-d2-rss-group-summary">
          <strong>${esc(groups.length)} 个分组</strong>
          <small>分组用于归类订阅源，不影响刷新规则</small>
        </section>
        <section class="fd-rss-record-list fd-rss-management-list fd-d2-rss-group-list" aria-label="RSS 分组列表">
          ${groups.map((group) => `
            <article class="fd-d2-rss-group-item" role="button" tabindex="0" data-route="rss-source-group-edit">
              <span>${icon("folder", "fd-small-icon")}</span>
              <strong>${esc(group.name)}<small>${esc(group.sourceCount)} 个源 · ${esc(group.description)}</small></strong>
              ${group.pinned ? d2RssBadge("置顶", "good") : d2RssBadge("普通", "muted")}
              <button type="button" data-route="rss-source-group-edit" aria-label="编辑分组">${icon("edit", "fd-small-icon")}</button>
            </article>`).join("")}
        </section>
        <section class="fd-rss-rule-sub-actions fd-d2-rss-group-actions">
          <button type="button" data-route="rss-source-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
          <button type="button" data-action="sort-groups">${icon("sort", "fd-small-icon")}排序</button>
          <button type="button" data-action="merge-groups">${icon("merge", "fd-small-icon")}合并</button>
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-subscription-management", icon: "close" },
          { label: "保存", route: "rss-subscription-management", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 订阅源分组编辑 / 新增
    if (route === "rss-source-group-edit") {
      return d2RssLibraryShell(data, "编辑分组", `
        ${d2RssFormTabs(["基础", "排序", "源"], 0)}
        <section class="fd-rss-edit-list fd-d2-rss-form-list" aria-label="RSS 分组编辑字段">
          ${d2RssFieldRow("基础", "分组名称", "开源项目", { placeholder: "输入分组名称" })}
          ${d2RssFieldRow("基础", "分组描述", "开源项目版本发布订阅", { type: "textarea" })}
          ${d2RssFieldRow("基础", "颜色标签", "good", { type: "select", options: ["good（绿）", "warn（黄）", "muted（灰）"] })}
          ${d2RssFieldRow("基础", "置顶显示", null, { type: "switch", enabled: true })}
          ${d2RssFieldRow("基础", "首页显示", null, { type: "switch", enabled: true })}
          ${d2RssFieldRow("基础", "排序权重", "1", { placeholder: "数字越小越靠前" })}
        </section>
        <section class="fd-d2-rss-group-sources">
          <h3>分组内订阅源</h3>
          ${d2RssSourcesData().filter((s) => s.group === "开源项目").map((source) => `
            <article class="fd-d2-rss-source-item">
              <span>${icon("rss", "fd-small-icon")}</span>
              <strong>${esc(source.name)}<small>${esc(source.rule)}</small></strong>
              <button type="button" data-action="remove-from-group" aria-label="移出分组">${icon("close", "fd-small-icon")}</button>
            </article>`).join("")}
          <button type="button" class="fd-d2-rss-add-source" data-action="add-to-group">${icon("add", "fd-small-icon")}添加订阅源到分组</button>
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-source-groups", icon: "close" },
          { label: "保存", route: "rss-source-groups", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 收藏分组列表
    if (route === "rss-favorite-groups") {
      const groups = d2RssFavoriteGroupsData();
      return d2RssLibraryShell(data, "收藏分组", `
        <section class="fd-d2-rss-group-summary">
          <strong>${esc(groups.length)} 个收藏分组</strong>
          <small>收藏分组用于归类跨源收藏的文章</small>
        </section>
        <section class="fd-rss-record-list fd-rss-management-list fd-d2-rss-group-list" aria-label="收藏分组列表">
          ${groups.map((group) => `
            <article class="fd-d2-rss-group-item" role="button" tabindex="0" data-route="rss-favorite-group-edit">
              <span>${icon("bookmark", "fd-small-icon")}</span>
              <strong>${esc(group.name)}<small>${esc(group.count)} 条收藏 · ${esc(group.description)}</small></strong>
              ${group.pinned ? d2RssBadge("显示", "good") : d2RssBadge("隐藏", "muted")}
              <button type="button" data-route="rss-favorite-group-edit" aria-label="编辑分组">${icon("edit", "fd-small-icon")}</button>
            </article>`).join("")}
        </section>
        <section class="fd-rss-rule-sub-actions fd-d2-rss-group-actions">
          <button type="button" data-route="rss-favorite-group-edit">${icon("add", "fd-small-icon")}新增分组</button>
          <button type="button" data-action="sort-favorite-groups">${icon("sort", "fd-small-icon")}排序</button>
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-starred", icon: "close" },
          { label: "保存", route: "rss-starred", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 收藏分组编辑
    if (route === "rss-favorite-group-edit") {
      return d2RssLibraryShell(data, "编辑收藏分组", `
        <section class="fd-rss-edit-list fd-d2-rss-form-list" aria-label="收藏分组编辑字段">
          ${d2RssFieldRow("收藏分组", "分组名称", "默认分组", { placeholder: "输入分组名称" })}
          ${d2RssFieldRow("收藏分组", "首页显示", null, { type: "switch", enabled: true })}
          ${d2RssFieldRow("收藏分组", "排序方式", "最近收藏优先", { type: "select", options: ["最近收藏优先", "按源分组", "手动排序"] })}
          ${d2RssFieldRow("收藏分组", "包含条目", "Reader UI 前端输入件更新说明、阅读器路线图讨论摘要", { type: "textarea" })}
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-favorite-groups", icon: "close" },
          { label: "保存", route: "rss-favorite-groups", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 添加收藏确认
    if (route === "rss-favorite-add") {
      return d2RssLibraryShell(data, "添加收藏", `
        ${d2RssConfirmCard({
          icon: "bookmark",
          heading: "收藏当前 RSS 条目？",
          copy: "收藏后该条目会出现在 RSS 收藏列表，并保留原订阅源、阅读状态和分组信息。",
          extraHtml: `
            <section class="fd-d2-rss-favorite-target">
              <article><small>收藏到</small><strong>默认分组</strong></article>
              <article><small>保留信息</small><strong>订阅源 · 阅读状态 · 分组</strong></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-detail", icon: "close" },
          { label: "确认收藏", route: "rss-starred", icon: "bookmark", tone: "primary" }
        ]), appState);
    }

    // 移除收藏确认
    if (route === "rss-favorite-remove") {
      return d2RssLibraryShell(data, "移除收藏", `
        ${d2RssConfirmCard({
          icon: "trash",
          heading: "从收藏中移除？",
          copy: "只移除收藏关系，不删除原文、订阅源或阅读记录。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-starred", icon: "close" },
          { label: "确认移除", route: "rss-starred", icon: "trash", tone: "primary" }
        ]), appState);
    }

    // 清空收藏分组确认
    if (route === "rss-favorite-clear") {
      return d2RssLibraryShell(data, "清空收藏分组", `
        ${d2RssConfirmCard({
          icon: "trash",
          heading: "清空默认分组收藏？",
          copy: "仅移除当前收藏分组里的条目，文章本身和订阅源不会删除。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-starred", icon: "close" },
          { label: "确认清空", route: "rss-starred", icon: "trash", tone: "primary" }
        ]), appState);
    }

    return rssGroupManagementScreen(data, appState, "rss-source-groups");
  }

  // ---------------------------------------------------------------------------
  // 6. rssLoginCookieScreen —— 登录/Cookie 管理
  //    需要登录的源的管理
  //    覆盖路由：rss-source-login / rss-source-login-web /
  //             rss-source-login-cookie / rss-source-login-clear
  // ---------------------------------------------------------------------------
  function rssLoginCookieScreen(data, appState, route) {
    const source = d2RssSourcesData().find((s) => s.login) || d2RssSourcesData()[2];

    // 登录管理主页
    if (route === "rss-source-login" || !route) {
      return d2RssLibraryShell(data, "源登录管理", `
        ${d2RssDebugPanel("shield", source.name, "网页登录 · Cookie 保存 · 登录态检测", [
          { title: "登录地址", detail: "https://example.com/login?from=rss" },
          { title: "Cookie 状态", detail: "reader_session=•••••• · 2 天后过期 · 已关联当前订阅源" },
          { title: "检测方式", detail: "刷新前请求个人中心，401/403 时提示重新登录。" }
        ])}
        <section class="fd-rss-action-grid fd-rss-action-grid-compact fd-d2-rss-login-actions">
          ${[
            ["网页登录", "globe", "rss-source-login-web"],
            ["提取 Cookie", "copy", "rss-source-login-cookie"],
            ["测试登录态", "refresh", "rss-source-debug"],
            ["清除登录", "trash", "rss-source-login-clear"]
          ].map(([label, itemIcon, target]) => `<button type="button" data-route="${esc(target)}" class="${target === "rss-source-login-clear" ? "is-danger" : ""}">${icon(itemIcon, "fd-small-icon")}<span>${esc(label)}</span></button>`).join("")}
        </section>
        <section class="fd-d2-rss-login-detail">
          <h3>登录态详情</h3>
          <article><small>关联源</small><strong>${esc(source.name)}（${esc(source.group)}）</strong></article>
          <article><small>登录方式</small><strong>网页登录 · Cookie 模式</strong></article>
          <article><small>过期时间</small><strong>2 天后（${esc(source.lastSync)} 授权）</strong></article>
          <article><small>作用范围</small><strong>仅当前订阅源，不覆盖其他源</strong></article>
        </section>`, d2RssBottomActions([
          { label: "返回操作", route: "rss-source-actions", icon: "back" },
          { label: "完成", route: "rss-source-actions", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 网页登录（WebView 容器）
    if (route === "rss-source-login-web") {
      return d2RssLibraryShell(data, "网页登录", `
        <section class="fd-rss-original-preview fd-d2-rss-login-webview">
          <header class="fd-d2-rss-webview-header">
            <span>${icon("shield", "fd-small-icon")}</span>
            <div>
              <strong>example.com/login</strong>
              <small>来自 ${esc(source.name)} · 登录完成后回写 Cookie</small>
            </div>
          </header>
          <nav class="fd-d2-rss-webview-toolbar" aria-label="登录 WebView 工具栏">
            <button type="button" data-action="webview-back" aria-label="后退">${icon("chevron-left", "fd-small-icon")}</button>
            <button type="button" data-action="webview-refresh" aria-label="刷新">${icon("refresh", "fd-small-icon")}</button>
            <button type="button" data-action="webview-share" aria-label="分享">${icon("share", "fd-small-icon")}</button>
          </nav>
          <article class="fd-rss-web-preview fd-d2-rss-webview-body">
            <h2>登录页面预览</h2>
            <p>实际应用中这里打开内置 WebView。登录成功后提取 Cookie、Token 和登录检测结果，返回源登录页。</p>
            <div class="fd-d2-rss-login-form-preview">
              <div class="fd-d2-rss-input-skeleton"><i></i></div>
              <div class="fd-d2-rss-input-skeleton"><i></i></div>
              <div class="fd-d2-rss-button-skeleton"><i></i></div>
            </div>
            <div class="fd-d2-rss-webview-skeleton"><i></i><i></i><i></i></div>
          </article>
          <section class="fd-d2-rss-login-tips">
            <article>${icon("info", "fd-small-icon")}<span>登录成功后 Cookie 将自动保存并关联到当前源</span></article>
            <article>${icon("shield", "fd-small-icon")}<span>Cookie 仅作用于当前订阅源，不影响其他源</span></article>
          </section>
        </section>`, d2RssBottomActions([
          { label: "返回登录", route: "rss-source-login", icon: "back" },
          { label: "登录完成", route: "rss-source-login-cookie", icon: "check", tone: "primary" }
        ]), appState);
    }

    // Cookie 提取
    if (route === "rss-source-login-cookie") {
      return d2RssLibraryShell(data, "Cookie 提取", `
        ${d2RssDebugPanel("copy", source.name, "从 WebView 提取登录凭据", [
          { title: "已提取 Cookie", detail: "reader_session=••••••••••••；expires=2 天后" },
          { title: "已提取 Token", detail: "csrf_token=••••••••••••（用于表单提交）" },
          { title: "作用范围", detail: "只作用于当前 RSS 源，不覆盖其他订阅源。", warn: true }
        ])}
        <section class="fd-d2-rss-cookie-detail">
          <h3>Cookie 详情</h3>
          <article class="fd-d2-rss-cookie-row">
            <small>名称</small>
            <strong>reader_session</strong>
          </article>
          <article class="fd-d2-rss-cookie-row">
            <small>值</small>
            <strong>••••••••••••（已加密存储）</strong>
          </article>
          <article class="fd-d2-rss-cookie-row">
            <small>域</small>
            <strong>example.com</strong>
          </article>
          <article class="fd-d2-rss-cookie-row">
            <small>路径</small>
            <strong>/</strong>
          </article>
          <article class="fd-d2-rss-cookie-row">
            <small>过期</small>
            <strong>2 天后自动失效</strong>
          </article>
        </section>
        <section class="fd-d2-rss-cookie-actions">
          <button type="button" data-action="copy-cookie">${icon("copy", "fd-small-icon")}复制 Cookie</button>
          <button type="button" data-action="test-cookie" data-route="rss-source-debug">${icon("bug", "fd-small-icon")}测试 Cookie</button>
        </section>`, d2RssBottomActions([
          { label: "返回", route: "rss-source-login", icon: "back" },
          { label: "保存凭据", route: "rss-source-actions", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 清除登录确认
    if (route === "rss-source-login-clear") {
      return d2RssLibraryShell(data, "清除登录", `
        ${d2RssConfirmCard({
          icon: "trash",
          heading: "清除当前源登录信息？",
          copy: "清除后该 RSS 源下次刷新会重新进入登录流程，不影响其他订阅源和已缓存文章。",
          detail: "将清除 Cookie、Token 和登录态检测结果。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-source-login", icon: "close" },
          { label: "确认清除", route: "rss-source-actions", icon: "trash", tone: "primary" }
        ]), appState);
    }

    return rssLoginCookieScreen(data, appState, "rss-source-login");
  }

  // ---------------------------------------------------------------------------
  // 7. rssImportExportScreen —— OPML 导入导出
  //    覆盖路由：rss-source-import / rss-source-import-detail /
  //             rss-source-import-result / rss-source-export /
  //             rss-source-export-detail / rss-source-export-result
  // ---------------------------------------------------------------------------
  function rssImportExportScreen(data, appState, route) {
    // OPML 导入
    if (route === "rss-source-import" || !route) {
      const imports = d2RssImportEntriesData();
      return d2RssLibraryShell(data, "导入订阅源（OPML）", `
        <section class="fd-rss-import-panel fd-d2-rss-import-panel">
          <label class="fd-d2-rss-import-url">${icon("link", "fd-small-icon")}<input type="url" placeholder="输入 OPML 订阅地址或本地文件路径" value="https://example.com/rss-source.json"></label>
          <nav aria-label="导入来源">
            ${["URL 导入", "本地 OPML", "剪贴板", "二维码"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-import-source="${esc(item)}">${esc(item)}</button>`).join("")}
          </nav>
          <section class="fd-d2-rss-import-options">
            <h3>冲突处理策略</h3>
            ${[
              ["保留本地名称", true],
              ["保留本地分组", true],
              ["保留启用状态", true],
              ["覆盖规则", false],
              ["不导入 Cookie", true]
            ].map(([label, enabled]) => `
              <article><strong>${esc(label)}</strong>${settingsSwitch(enabled)}</article>`).join("")}
          </section>
        </section>
        <section class="fd-rss-import-list fd-d2-rss-import-list" aria-label="OPML 导入预览">
          <header>
            <h2>导入预览</h2>
            <small>${esc(imports.filter((i) => i.checked).length)} / ${esc(imports.length)} 已选</small>
          </header>
          ${imports.map((item) => `
            <article class="${item.checked ? "is-selected" : ""} fd-d2-rss-import-item" role="button" tabindex="0" data-route="rss-source-import-detail">
              <span>${icon(item.checked ? "check" : (item.type === "folder" ? "folder" : "rss"), "fd-small-icon")}</span>
              <strong>${esc(item.name)}<small>${esc(item.meta)}</small></strong>
              ${d2RssBadge(item.tone === "warn" ? "更新" : item.tone === "good" ? "新增" : "跳过", item.tone)}
              <button type="button" data-route="rss-source-import-detail">${item.checked ? "详情" : "查看"}</button>
            </article>`).join("")}
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-subscription-management", icon: "close" },
          { label: "全选", dataAttr: 'data-action="select-all-import"', icon: "check" },
          { label: "导入 " + imports.filter((i) => i.checked).length + " 个", route: "rss-source-import-result", icon: "upload", tone: "primary" }
        ]), appState);
    }

    // 导入详情
    if (route === "rss-source-import-detail") {
      return d2RssLibraryShell(data, "导入详情", `
        ${d2RssDebugPanel("upload", "书源维护公告", "更新 · 规则版本更高 · 需登录", [
          { title: "变更摘要", detail: "正文规则从 content:encoded 改为 article.content，新增登录检测 URL。" },
          { title: "冲突处理", detail: "保留本地名称和分组，覆盖规则、请求头和分类入口。" },
          { title: "登录态", detail: "不导入 Cookie。更新后需要在源登录页重新授权。", warn: true }
        ])}
        <section class="fd-d2-rss-import-diff">
          <h3>规则差异</h3>
          <article class="fd-d2-rss-diff-row is-removed"><small>旧规则</small><strong>content:encoded</strong></article>
          <article class="fd-d2-rss-diff-row is-added"><small>新规则</small><strong>article.content</strong></article>
          <article class="fd-d2-rss-diff-row is-added"><small>新增</small><strong>登录检测 URL: /user/profile</strong></article>
        </section>`, d2RssBottomActions([
          { label: "返回", route: "rss-source-import", icon: "back" },
          { label: "加入导入", route: "rss-source-import", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 导入结果
    if (route === "rss-source-import-result") {
      return d2RssLibraryShell(data, "导入完成", `
        ${d2RssConfirmCard({
          icon: "check",
          heading: "已导入 2 个订阅源",
          copy: "新增源已加入 RSS 订阅管理，冲突源保留本地名称、分组和启用状态。",
          detail: "需要登录的源不会自动导入 Cookie。",
          extraHtml: `
            <section class="fd-d2-rss-import-result">
              <article><small>新增</small><strong>2 个源</strong></article>
              <article><small>更新</small><strong>1 个源</strong></article>
              <article><small>跳过</small><strong>1 个源（冲突）</strong></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "继续导入", route: "rss-source-import", icon: "upload" },
          { label: "完成", route: "rss-subscription-management", icon: "check", tone: "primary" }
        ]), appState);
    }

    // OPML 导出
    if (route === "rss-source-export") {
      const exports = d2RssExportEntriesData();
      return d2RssLibraryShell(data, "导出订阅源（OPML）", `
        <section class="fd-rss-import-panel fd-d2-rss-export-panel">
          <label class="fd-d2-rss-export-filename">${icon("download", "fd-small-icon")}<input type="text" value="reader-rss-sources-20260626.opml"></label>
          <nav aria-label="导出格式">
            ${["OPML 2.0", "JSON", "TXT 列表"].map((item, index) => `<button class="${index === 0 ? "is-active" : ""}" type="button" data-export-format="${esc(item)}">${esc(item)}</button>`).join("")}
          </nav>
          <section class="fd-d2-rss-export-options">
            <h3>导出选项</h3>
            ${[
              ["包含分组信息", true],
              ["包含启用状态", true],
              ["包含规则配置", true],
              ["包含登录 Cookie", false],
              ["包含阅读记录", false]
            ].map(([label, enabled]) => `
              <article><strong>${esc(label)}</strong>${settingsSwitch(enabled)}</article>`).join("")}
          </section>
        </section>
        <section class="fd-rss-import-list fd-d2-rss-export-list" aria-label="导出预览">
          <header>
            <h2>导出预览</h2>
            <small>${esc(exports.filter((e) => e.checked).length)} / ${esc(exports.length)} 已选</small>
          </header>
          ${exports.map((item) => `
            <article class="${item.checked ? "is-selected" : ""} fd-d2-rss-export-item" role="button" tabindex="0" data-route="rss-source-export-detail">
              <span>${icon(item.checked ? "check" : "rss", "fd-small-icon")}</span>
              <strong>${esc(item.name)}<small>${esc(item.meta)}</small></strong>
              <button type="button" data-route="rss-source-export-detail">预览</button>
            </article>`).join("")}
        </section>`, d2RssBottomActions([
          { label: "返回", route: "rss-source-batch", icon: "back" },
          { label: "全选", dataAttr: 'data-action="select-all-export"', icon: "check" },
          { label: "导出", route: "rss-source-export-result", icon: "download", tone: "primary" }
        ]), appState);
    }

    // 导出预览
    if (route === "rss-source-export-detail") {
      return d2RssLibraryShell(data, "导出预览", `
        ${d2RssDebugPanel("download", "GitHub Releases", "OPML 2.0 格式 · 含分组与规则", [
          { title: "源名称", detail: "GitHub Releases" },
          { title: "源地址", detail: "https://github.com/minliny/Reader-UI/releases.atom" },
          { title: "分组", detail: "开源项目" },
          { title: "规则", detail: "默认 RSS · 列表样式 · 3 个分类入口" }
        ])}
        <section class="fd-d2-rss-export-opml">
          <h3>OPML 片段预览</h3>
          <pre class="fd-d2-rss-opml-preview">&lt;outline title="GitHub Releases"
  type="rss" text="GitHub Releases"
  xmlUrl="https://github.com/minliny/Reader-UI/releases.atom"
  category="开源项目" /&gt;</pre>
        </section>`, d2RssBottomActions([
          { label: "返回", route: "rss-source-export", icon: "back" },
          { label: "导出此源", route: "rss-source-export-result", icon: "download", tone: "primary" }
        ]), appState);
    }

    // 导出结果
    if (route === "rss-source-export-result") {
      return d2RssLibraryShell(data, "导出完成", `
        ${d2RssConfirmCard({
          icon: "check",
          heading: "已生成导出文件",
          copy: "reader-rss-sources-20260626.opml 已生成，包含已选订阅源、分组、启用状态和规则配置。",
          detail: "登录 Cookie 和账号凭据没有写入导出文件。",
          extraHtml: `
            <section class="fd-d2-rss-export-result">
              <article><small>文件名</small><strong>reader-rss-sources-20260626.opml</strong></article>
              <article><small>大小</small><strong>4.2 KB</strong></article>
              <article><small>包含源</small><strong>4 个订阅源 · 5 个分组</strong></article>
              <article><small>保存位置</small><strong>下载目录</strong></article>
            </section>
            <div class="fd-d2-rss-export-share">
              <button type="button" data-action="share-export">${icon("share", "fd-small-icon")}分享文件</button>
              <button type="button" data-action="copy-export-path">${icon("copy", "fd-small-icon")}复制路径</button>
            </div>`
        })}`, d2RssBottomActions([
          { label: "返回导出", route: "rss-source-export", icon: "back" },
          { label: "完成", route: "rss-subscription-management", icon: "check", tone: "primary" }
        ]), appState);
    }

    return rssImportExportScreen(data, appState, "rss-source-import");
  }

  // ---------------------------------------------------------------------------
  // 8. rssRuleSubscriptionScreen —— 规则订阅
  //    基于规则的自动订阅
  //    覆盖路由：rss-rule-subscription / rss-rule-subscription-detail /
  //             rss-rule-subscription-edit / rss-rule-subscription-create /
  //             rss-rule-subscription-test / rss-rule-subscription-apply
  // ---------------------------------------------------------------------------
  function rssRuleSubscriptionScreen(data, appState, route) {
    // 规则订阅列表
    if (route === "rss-rule-subscription" || !route) {
      const rules = d2RssRuleSubsData();
      return d2RssLibraryShell(data, "规则订阅", `
        ${d2RssModeNav("rss-rule-subscription")}
        <section class="fd-d2-rss-rule-summary">
          <strong>${esc(rules.length)} 个规则订阅</strong>
          <small>规则订阅会自动同步远程订阅源列表，按策略合并到本地</small>
        </section>
        <section class="fd-rss-rule-sub-list fd-d2-rss-rule-list" aria-label="规则订阅列表">
          ${rules.map((item) => `
            <article class="fd-d2-rss-rule-item" role="button" tabindex="0" data-route="rss-rule-subscription-detail">
              <span>${icon(item.type === "RSS 源" ? "rss" : item.type === "书源" ? "source-stack" : "replace", "fd-small-icon")}</span>
              <strong>${esc(item.name)}<small>${esc(item.type)} · ${esc(item.url)}</small></strong>
              <div class="fd-d2-rss-rule-meta">
                <em>${esc(item.update)}</em>
                ${item.autoUpdate ? d2RssBadge("自动", "good") : d2RssBadge("手动", "muted")}
              </div>
              <button type="button" data-route="rss-rule-subscription-detail" aria-label="查看详情">${icon("chevron", "fd-small-icon")}</button>
            </article>`).join("")}
        </section>
        <section class="fd-rss-rule-sub-actions fd-d2-rss-rule-actions">
          <button type="button" data-route="rss-rule-subscription-detail">${icon("upload", "fd-small-icon")}打开订阅</button>
          <button type="button" data-route="rss-rule-subscription-create">${icon("add", "fd-small-icon")}新增</button>
          <button type="button" data-action="refresh-all-rules">${icon("refresh", "fd-small-icon")}全部刷新</button>
        </section>`, "", appState);
    }

    // 订阅详情
    if (route === "rss-rule-subscription-detail") {
      const rule = d2RssRuleSubsData()[0];
      return d2RssLibraryShell(data, "订阅详情", `
        ${d2RssDebugPanel("sync", rule.name, `${rule.type} · ${rule.update} · 上次同步 ${rule.lastSync}`, [
          { title: "订阅地址", detail: rule.url },
          { title: "更新策略", detail: `Wi-Fi 下${rule.autoUpdate ? "自动更新" : "手动更新"}；保留本地启用状态、分组和登录态。` },
          { title: "冲突策略", detail: rule.conflictStrategy },
          { title: "最近变更", detail: `新增 2 个源，更新 1 个正文规则，跳过 1 个本地冲突。当前共 ${rule.itemCount} 个项目。` }
        ])}
        <section class="fd-rss-import-list fd-d2-rss-rule-changes" aria-label="订阅变更">
          <header><h2>订阅变更</h2><small>${esc(rule.itemCount)} 项</small></header>
          ${d2RssImportEntriesData().map((item) => `
            <article class="${item.checked ? "is-selected" : ""} fd-d2-rss-change-item">
              <span>${icon(item.checked ? "check" : "rss", "fd-small-icon")}</span>
              <strong>${esc(item.name)}<small>${esc(item.meta)}</small></strong>
              ${d2RssBadge(item.tone === "warn" ? "更新" : item.tone === "good" ? "新增" : "跳过", item.tone)}
            </article>`).join("")}
        </section>`, d2RssBottomActions([
          { label: "编辑", route: "rss-rule-subscription-edit", icon: "edit" },
          { label: "测试", route: "rss-rule-subscription-test", icon: "bug" },
          { label: "应用更新", route: "rss-rule-subscription-apply", icon: "sync", tone: "primary" }
        ]), appState);
    }

    // 编辑 / 新增规则订阅
    if (route === "rss-rule-subscription-edit" || route === "rss-rule-subscription-create") {
      const isNew = route === "rss-rule-subscription-create";
      const rule = isNew ? { name: "", type: "RSS 源", url: "", autoUpdate: true } : d2RssRuleSubsData()[0];
      return d2RssLibraryShell(data, isNew ? "新增规则订阅" : "编辑规则订阅", `
        ${d2RssFormTabs(["基础", "同步", "安全"], 0)}
        <section class="fd-rss-edit-list fd-d2-rss-form-list" aria-label="规则订阅编辑字段">
          ${d2RssFieldRow("基础", "订阅名称", rule.name, { placeholder: "输入订阅名称" })}
          ${d2RssFieldRow("基础", "订阅类型", rule.type, { type: "select", options: ["RSS 源", "书源", "替换规则"] })}
          ${d2RssFieldRow("基础", "订阅地址", rule.url, { placeholder: "https://example.com/rss-source.json" })}
          ${d2RssFieldRow("基础", "描述", "社区维护的 RSS 源合集", { type: "textarea" })}
          ${d2RssFieldRow("同步", "自动更新", null, { type: "switch", enabled: rule.autoUpdate })}
          ${d2RssFieldRow("同步", "更新频率", "Wi-Fi 下每 6 小时", { type: "select", options: ["实时", "每 1 小时", "每 6 小时", "每天", "手动"] })}
          ${d2RssFieldRow("同步", "冲突策略", "保留本地名称、分组、启用状态", { type: "select", options: ["保留本地名称、分组、启用状态", "覆盖本地", "跳过冲突"] })}
          ${d2RssFieldRow("安全", "登录配置", "不覆盖 Cookie 和账号信息", { type: "textarea" })}
          ${d2RssFieldRow("安全", "仅 Wi-Fi 同步", null, { type: "switch", enabled: true })}
        </section>`, d2RssBottomActions([
          { label: "取消", route: "rss-rule-subscription", icon: "close" },
          { label: "测试订阅", route: "rss-rule-subscription-test", icon: "bug" },
          { label: "保存", route: "rss-rule-subscription", icon: "check", tone: "primary" }
        ]), appState);
    }

    // 测试规则订阅
    if (route === "rss-rule-subscription-test") {
      return d2RssLibraryShell(data, "测试规则订阅", `
        ${d2RssDebugPanel("bug", "社区 RSS 源订阅", "请求订阅地址 · 校验结构 · 生成导入预览", [
          { title: "1. 请求订阅地址", detail: "https://example.com/rss-source.json 返回 200，内容类型 application/json。" },
          { title: "2. 解析订阅内容", detail: "12 个 RSS 源、2 个更新项、1 个本地冲突。" },
          { title: "3. 冲突策略", detail: "保留本地名称、分组、启用状态，不覆盖登录凭据。" },
          { title: "4. 导入预览", detail: "已生成导入预览，可进入导入流程应用变更。" }
        ])}
        <section class="fd-d2-rss-test-output">
          <header><h3>测试输出</h3><button type="button" data-action="copy-test-log">${icon("copy", "fd-small-icon")}复制日志</button></header>
          <pre class="fd-d2-rss-debug-log">[10:18:01] GET https://example.com/rss-source.json
[10:18:01] 200 OK · Content-Type: application/json
[10:18:02] 解析到 12 个 RSS 源
[10:18:02] 比对本地：2 个新增、2 个更新、1 个冲突
[10:18:03] 测试完成，可应用更新</pre>
        </section>`, d2RssBottomActions([
          { label: "返回编辑", route: "rss-rule-subscription-edit", icon: "back" },
          { label: "查看结果", route: "rss-rule-subscription-detail", icon: "chevron", tone: "primary" }
        ]), appState);
    }

    // 应用更新确认
    if (route === "rss-rule-subscription-apply") {
      return d2RssLibraryShell(data, "应用订阅更新", `
        ${d2RssConfirmCard({
          icon: "sync",
          heading: "应用社区 RSS 源订阅更新？",
          copy: "将新增 2 个源、更新 1 个规则，并跳过 1 个本地冲突。登录凭据不会被覆盖。",
          detail: "应用后可在导入预览页查看完整变更。",
          extraHtml: `
            <section class="fd-d2-rss-apply-detail">
              <article><small>新增</small><strong>2 个源</strong></article>
              <article><small>更新</small><strong>1 个规则</strong></article>
              <article><small>跳过</small><strong>1 个冲突</strong></article>
              <article><small>保留</small><strong>登录凭据 · 本地名称 · 分组</strong></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-rule-subscription-detail", icon: "close" },
          { label: "进入导入预览", route: "rss-source-import", icon: "upload", tone: "primary" }
        ]), appState);
    }

    return rssRuleSubscriptionScreen(data, appState, "rss-rule-subscription");
  }

  // ---------------------------------------------------------------------------
  // 9. rssReadingHistoryScreen —— 阅读记录
  //    已读/未读管理
  //    覆盖路由：rss-read-record / rss-record-clear
  // ---------------------------------------------------------------------------
  function rssReadingHistoryScreen(data, appState, route) {
    const records = d2RssRecordsData();

    // 清空确认
    if (route === "rss-record-clear") {
      return d2RssLibraryShell(data, "清空阅读记录", `
        ${d2RssConfirmCard({
          icon: "trash",
          heading: "清空 RSS 阅读记录？",
          copy: "只会清除 RSS 阅读历史，不会删除收藏、订阅源、未读状态或正文缓存。",
          detail: "清空后已读文章将不再出现在阅读记录中，但订阅源仍可重新刷新获取。"
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-read-record", icon: "close" },
          { label: "确认清空", route: "rss-read-record", icon: "trash", tone: "primary" }
        ]), appState);
    }

    // 阅读记录列表
    return d2RssLibraryShell(data, "阅读记录", `
      <section class="fd-d2-rss-history-summary">
        <strong>${esc(records.length)} 条记录</strong>
        <small>${esc(records.filter((r) => r.unread).length)} 条未读 · ${esc(records.filter((r) => !r.unread).length)} 条已读</small>
      </section>
      ${filterDisclosure({
        className: "fd-d2-rss-history-filter",
        label: "筛选",
        ariaLabel: "阅读记录筛选",
        summary: appState?.rssHistoryFilter || "全部",
        toggleAttr: "data-rss-history-filter-toggle",
        open: Boolean(appState?.rssHistoryFilterOpen),
        groups: [{
          title: "阅读状态",
          options: [
            { label: "全部", active: (appState?.rssHistoryFilter || "全部") === "全部", attrs: { "data-rss-history-filter": "全部" } },
            { label: "已读", attrs: { "data-rss-history-filter": "已读" } },
            { label: "未读", attrs: { "data-rss-history-filter": "未读" } }
          ]
        }, {
          title: "订阅源",
          options: [
            { label: "GitHub Releases", attrs: { "data-rss-history-source": "GitHub Releases" } },
            { label: "书源维护公告", attrs: { "data-rss-history-source": "书源维护公告" } },
            { label: "阅读器版本讨论", attrs: { "data-rss-history-source": "阅读器版本讨论" } },
            { label: "技术博客精选", attrs: { "data-rss-history-source": "技术博客精选" } }
          ]
        }]
      })}
      <section class="fd-rss-record-list fd-d2-rss-history-list" aria-label="阅读记录列表">
        ${records.map((record) => `
          <article class="fd-d2-rss-history-item${record.unread ? " is-unread" : ""}" role="button" tabindex="0" data-route="rss-detail">
            <span>${icon(record.readProgress === 100 ? "check" : "clock", "fd-small-icon")}</span>
            <strong>${esc(record.title)}<small>${esc(record.time)} · ${esc(record.source)} · ${esc(record.duration)}</small></strong>
            <div class="fd-d2-rss-history-meta">
              ${record.readProgress === 100 ? d2RssBadge("已读", "good") : (record.unread ? d2RssBadge("未读", "warn") : d2RssBadge("阅读中", "muted"))}
              ${record.readProgress > 0 && record.readProgress < 100 ? `<span class="fd-d2-rss-progress" aria-label="阅读进度 ${esc(record.readProgress)}%"><i style="width:${esc(record.readProgress)}%"></i></span>` : ""}
            </div>
            <button type="button" data-action="toggle-read" data-article-title="${esc(record.title)}" aria-label="${record.unread ? "标记已读" : "标记未读"}">${icon(record.unread ? "check" : "circle", "fd-small-icon")}</button>
          </article>`).join("")}
      </section>
      <section class="fd-d2-rss-history-actions">
        <button type="button" data-action="mark-all-read">${icon("check", "fd-small-icon")}全部标记已读</button>
        <button type="button" data-action="clear-read">${icon("trash", "fd-small-icon")}清除已读记录</button>
      </section>`, d2RssBottomActions([
        { label: "返回列表", route: "rss", icon: "back" },
        { label: "清空记录", route: "rss-record-clear", icon: "trash", tone: "primary" }
      ]), appState);
  }

  // ---------------------------------------------------------------------------
  // 10. rssBatchManagementScreen —— 批量管理
  //     批量操作订阅源
  //     覆盖路由：rss-source-batch / rss-source-batch-disable
  // ---------------------------------------------------------------------------
  function rssBatchManagementScreen(data, appState, route) {
    const sources = d2RssSourcesData();

    // 批量禁用确认
    if (route === "rss-source-batch-disable") {
      return d2RssLibraryShell(data, "批量禁用", `
        ${d2RssConfirmCard({
          icon: "offline",
          heading: "禁用已选 2 个订阅源？",
          copy: "禁用后这些订阅源不会参与自动刷新、未读提醒和首页统计，已缓存条目和阅读记录会保留。",
          detail: "可以在订阅管理页重新启用。",
          extraHtml: `
            <section class="fd-d2-rss-batch-confirm">
              <article><small>已选源</small><strong>GitHub Releases · 阅读器版本讨论</strong></article>
              <article><small>影响</small><strong>不再自动刷新 · 不再提醒未读</strong></article>
              <article><small>保留</small><strong>缓存条目 · 阅读记录 · 收藏</strong></article>
            </section>`
        })}`, d2RssBottomActions([
          { label: "取消", route: "rss-source-batch", icon: "close" },
          { label: "确认禁用", route: "rss-subscription-management", icon: "offline", tone: "primary" }
        ]), appState);
    }

    // 批量管理列表
    return d2RssLibraryShell(data, "批量管理", `
      <section class="fd-rss-manage-batch-row fd-rss-batch-summary fd-d2-rss-batch-summary">
        <strong>已选 2 个</strong>
        <small>共 ${esc(sources.length)} 个订阅源</small>
        <button type="button" data-action="select-all">${icon("check", "fd-small-icon")}全选</button>
        <button type="button" data-action="select-none">取消选择</button>
      </section>
      ${filterDisclosure({
        className: "fd-d2-rss-batch-filter",
        label: "筛选",
        ariaLabel: "批量管理筛选",
        summary: appState?.rssBatchFilter || "全部",
        toggleAttr: "data-rss-batch-filter-toggle",
        open: Boolean(appState?.rssBatchFilterOpen),
        groups: [{
          title: "分组",
          options: ["全部", "开源项目", "社区", "维护", "系统", "技术"].map((item) => ({
            label: item,
            active: (appState?.rssBatchFilter || "全部") === item,
            attrs: { "data-rss-batch-filter": item }
          }))
        }, {
          title: "状态",
          options: [
            { label: "启用", attrs: { "data-rss-batch-status": "enabled" } },
            { label: "暂停", attrs: { "data-rss-batch-status": "disabled" } },
            { label: "需登录", attrs: { "data-rss-batch-status": "login" } }
          ]
        }]
      })}
      <section class="fd-rss-source-list fd-rss-batch-list fd-d2-rss-batch-list" aria-label="批量选择订阅源">
        ${sources.map((source, index) => `
          <article class="fd-d2-rss-batch-item${index < 2 ? " is-selected" : ""}${source.enabled ? "" : " is-disabled"}" role="button" tabindex="0" data-action="toggle-batch-select" data-source-name="${esc(source.name)}">
            <span>${icon(index < 2 ? "check" : (source.enabled ? "rss" : "offline"), "fd-small-icon")}</span>
            <strong>${esc(source.name)}<small>${esc(source.group)} · ${esc(source.rule)} · ${esc(source.syncInterval)}</small></strong>
            ${source.pinned ? icon("top", "fd-small-icon") : ""}
            ${d2RssBadge(source.enabled ? "启用" : "暂停", source.enabled ? "good" : "muted")}
          </article>`).join("")}
      </section>
      <section class="fd-d2-rss-batch-toolbar">
        <header><h3>批量操作</h3></header>
        <div class="fd-d2-rss-batch-actions">
          <button type="button" data-route="rss-source-batch-disable">${icon("offline", "fd-small-icon")}禁用</button>
          <button type="button" data-action="batch-enable">${icon("check", "fd-small-icon")}启用</button>
          <button type="button" data-action="batch-refresh">${icon("refresh", "fd-small-icon")}刷新</button>
          <button type="button" data-route="rss-source-export">${icon("download", "fd-small-icon")}导出</button>
          <button type="button" data-action="batch-move-group">${icon("folder", "fd-small-icon")}移动到分组</button>
          <button type="button" data-action="batch-delete" class="is-danger">${icon("trash", "fd-small-icon")}删除</button>
        </div>
      </section>`, d2RssBottomActions([
        { label: "导出", route: "rss-source-export", icon: "download" },
        { label: "禁用", route: "rss-source-batch-disable", icon: "offline" },
        { label: "完成", route: "rss-subscription-management", icon: "check", tone: "primary" }
      ]), appState);
  }

  // ===========================================================================
  // 五、集成映射
  // ===========================================================================
  // INTEGRATION_MAP：路由 → renderer 函数名
  // 集成时在 render-runtime.js 的 renderRoute 函数 switch 之前加入分发钩子：
  //   if (window.ReaderD2RssRenderers && window.ReaderD2RssRenderers.INTEGRATION_MAP) {
  //     const d2FnName = window.ReaderD2RssRenderers.INTEGRATION_MAP[route];
  //     if (d2FnName && typeof window.ReaderD2RssRenderers[d2FnName] === "function") {
  //       return window.ReaderD2RssRenderers[d2FnName](data, appState, route);
  //     }
  //   }
  // ---------------------------------------------------------------------------
  const INTEGRATION_MAP = {
    // 1. RSS 首页（文章流 + 分类侧栏 + 刷新 + 已读未读标记）
    "rss": "rssHomeScreenV2",
    "rss-all": "rssHomeScreenV2",
    "rss-refreshing": "rssHomeScreenV2",
    "rss-source-feed": "rssHomeScreenV2",
    "rss-source-category-releases": "rssHomeScreenV2",
    "rss-source-category-issues": "rssHomeScreenV2",
    "rss-source-category-discussions": "rssHomeScreenV2",
    "rss-source-category-novel": "rssHomeScreenV2",
    "rss-source-category-tech": "rssHomeScreenV2",
    "rss-source-category-booklist": "rssHomeScreenV2",
    "rss-starred": "rssHomeScreenV2",
    "rss-search": "rssHomeScreenV2",
    "rss-empty": "rssHomeScreenV2",
    "rss-error": "rssHomeScreenV2",

    // 2. 文章详情（正文 + 图片 + 元信息 + 收藏/分享）
    "rss-detail": "rssArticleDetailScreenV2",

    // 3. 原文 WebView + 系统浏览器确认
    "rss-original": "rssOriginalWebViewScreen",
    "rss-original-browser": "rssOriginalWebViewScreen",

    // 4. 订阅源 CRUD（新增/编辑/删除）
    "rss-subscription-management": "rssSubscriptionCrudScreen",
    "rss-source-actions": "rssSubscriptionCrudScreen",
    "rss-source-edit": "rssSubscriptionCrudScreen",
    "rss-source-add": "rssSubscriptionCrudScreen",
    "rss-source-delete-confirm": "rssSubscriptionCrudScreen",
    "rss-source-debug": "rssSubscriptionCrudScreen",
    "rss-source-vars": "rssSubscriptionCrudScreen",
    "rss-source-pin": "rssSubscriptionCrudScreen",
    "rss-source-disable": "rssSubscriptionCrudScreen",

    // 5. 分组管理（订阅源分组 + 收藏分组）
    "rss-source-groups": "rssGroupManagementScreen",
    "rss-source-group-edit": "rssGroupManagementScreen",
    "rss-favorite-groups": "rssGroupManagementScreen",
    "rss-favorite-group-edit": "rssGroupManagementScreen",
    "rss-favorite-add": "rssGroupManagementScreen",
    "rss-favorite-remove": "rssGroupManagementScreen",
    "rss-favorite-clear": "rssGroupManagementScreen",

    // 6. 登录/Cookie 管理
    "rss-source-login": "rssLoginCookieScreen",
    "rss-source-login-web": "rssLoginCookieScreen",
    "rss-source-login-cookie": "rssLoginCookieScreen",
    "rss-source-login-clear": "rssLoginCookieScreen",

    // 7. OPML 导入导出
    "rss-source-import": "rssImportExportScreen",
    "rss-source-import-detail": "rssImportExportScreen",
    "rss-source-import-result": "rssImportExportScreen",
    "rss-source-export": "rssImportExportScreen",
    "rss-source-export-detail": "rssImportExportScreen",
    "rss-source-export-result": "rssImportExportScreen",

    // 8. 规则订阅
    "rss-rule-subscription": "rssRuleSubscriptionScreen",
    "rss-rule-subscription-detail": "rssRuleSubscriptionScreen",
    "rss-rule-subscription-edit": "rssRuleSubscriptionScreen",
    "rss-rule-subscription-create": "rssRuleSubscriptionScreen",
    "rss-rule-subscription-test": "rssRuleSubscriptionScreen",
    "rss-rule-subscription-apply": "rssRuleSubscriptionScreen",

    // 9. 阅读记录（已读/未读管理）
    "rss-read-record": "rssReadingHistoryScreen",
    "rss-record-clear": "rssReadingHistoryScreen",

    // 10. 批量管理
    "rss-source-batch": "rssBatchManagementScreen",
    "rss-source-batch-disable": "rssBatchManagementScreen"
  };

  // ===========================================================================
  // 六、模块暴露
  // ===========================================================================
  window.ReaderD2RssRenderers = {
    // 10 个产品化 renderer
    rssHomeScreenV2,
    rssArticleDetailScreenV2,
    rssOriginalWebViewScreen,
    rssSubscriptionCrudScreen,
    rssGroupManagementScreen,
    rssLoginCookieScreen,
    rssImportExportScreen,
    rssRuleSubscriptionScreen,
    rssReadingHistoryScreen,
    rssBatchManagementScreen,
    // 集成映射（路由 → 函数名）
    INTEGRATION_MAP
  };
})(window);
