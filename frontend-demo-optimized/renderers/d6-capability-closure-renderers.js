/**
 * D6 capability closure renderer
 * --------------------------------------------------------------------------
 * Gives every product-expansion RouteId a visible local contract surface.
 * Route navigation is interactive in the demo; Host/Core business actions are
 * deliberately disabled until their runtime ownership and evidence are wired.
 */
(function attachReaderD6CapabilityClosureRenderers(window) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function shellKit() {
    if (!window.ReaderShellKit) {
      throw new Error("ReaderShellKit is required before d6-capability-closure-renderers.js");
    }
    return window.ReaderShellKit;
  }

  function icon(name, className) {
    if (window.ReaderShellKit && typeof window.ReaderShellKit.icon === "function") {
      return window.ReaderShellKit.icon(name, className || "fd-medium-icon");
    }
    return `<span class="${esc(className || "fd-medium-icon")}" data-icon-missing="${esc(name)}" aria-hidden="true"></span>`;
  }

  var ROUTE_CONFIG = Object.freeze({
    "onboarding-welcome": {
      title: "首次使用",
      shell: "FlowShell",
      icon: "sparkle",
      capability: "启动与首次配置",
      state: "欢迎页合同已登记",
      summary: "展示产品定位、隐私边界和能力配置入口；不会在 Demo 中写入首次启动状态。",
      facts: [["下一步", "能力配置"], ["本地边界", "仅预览路由"], ["Host 依赖", "无"]],
      navigation: [{ label: "查看能力配置", route: "onboarding-capability-setup", event: "route.push" }],
      planned: [{ label: "完成欢迎步骤", event: "onboarding.continue" }]
    },
    "onboarding-capability-setup": {
      title: "能力配置",
      shell: "FlowShell",
      icon: "settings",
      capability: "启动与首次配置",
      state: "权限与能力清单已登记",
      summary: "逐项解释存储、通知和联网能力；Demo 不代替系统授权，也不记录跳过结果。",
      facts: [["存储", "按需申请"], ["通知", "可跳过"], ["网络", "使用时说明"]],
      navigation: [{ label: "查看权限恢复", route: "permission-recovery", event: "route.push" }, { label: "预览应用首页", route: "bookshelf", event: "route.push" }],
      planned: [{ label: "保存能力选择", event: "onboarding.capabilitySetup.complete" }]
    },
    "permission-recovery": {
      title: "权限恢复",
      shell: "FlowShell",
      icon: "shield",
      capability: "权限恢复",
      state: "恢复路径已登记",
      summary: "权限被拒后给出原因、系统设置入口和重试路径；系统设置跳转必须由平台 Host 执行。",
      facts: [["示例范围", "本地存储"], ["返回目标", "本地导入"], ["降级", "保持失败关闭"]],
      navigation: [{ label: "返回格式支持", route: "local-format-support", event: "route.replace" }],
      planned: [{ label: "打开系统设置", event: "permission.recovery.openSettings" }, { label: "重新检测权限", event: "permission.recovery.retry" }]
    },
    "local-format-support": {
      title: "本地格式支持",
      shell: "LibraryShell",
      icon: "directory",
      capability: "本地书导入",
      state: "格式入口已登记",
      summary: "列出文本、EPUB、PDF 与图片序列的处理边界；真实文件选择仍由 Host 提供。",
      facts: [["文本", "TXT / EPUB"], ["固定版式", "PDF"], ["图像阅读", "ZIP / 图片序列"]],
      navigation: [{ label: "进入本地导入", route: "local-import", event: "route.push" }, { label: "预览 PDF 阅读", route: "pdf-reader", event: "route.push" }, { label: "预览漫画阅读", route: "manga-reader", event: "route.push" }],
      planned: [{ label: "选择本地文件", event: "localFormat.select" }]
    },
    "pdf-reader": {
      title: "PDF 阅读",
      shell: "ReaderShell",
      icon: "book",
      capability: "固定版式阅读",
      state: "ReaderShell 合同已登记",
      summary: "保留页码、缩放和阅读控制层语义；当前页面不解析或渲染真实 PDF 文件。",
      facts: [["示例页", "12 / 286"], ["页面模型", "固定版式"], ["业务状态", "等待 PDF runtime"]],
      navigation: [{ label: "返回格式支持", route: "local-format-support", event: "route.replace" }],
      planned: [{ label: "上一页", event: "reader.page.prev" }, { label: "下一页", event: "reader.page.next" }]
    },
    "manga-reader": {
      title: "漫画阅读",
      shell: "ReaderShell",
      icon: "image",
      capability: "图像序列阅读",
      state: "ReaderShell 合同已登记",
      summary: "展示图像序列、阅读方向和翻页控制边界；当前页面不加载真实漫画资源。",
      facts: [["示例图", "7 / 48"], ["阅读方向", "从左到右"], ["业务状态", "等待 image runtime"]],
      navigation: [{ label: "返回格式支持", route: "local-format-support", event: "route.replace" }],
      planned: [{ label: "上一图", event: "reader.page.prev" }, { label: "下一图", event: "reader.page.next" }]
    },
    "http-tts-management": {
      title: "HTTP TTS 管理",
      shell: "SettingsShell",
      icon: "tts",
      capability: "网络朗读",
      state: "提供器列表合同已登记",
      summary: "区分系统 TTS 与 HTTP TTS，并显示提供器状态；网络请求和密钥读取默认失败关闭。",
      facts: [["示例提供器", "本地测试（未连接）"], ["凭据", "只保存引用"], ["网络", "Host 发起"]],
      navigation: [{ label: "编辑提供器", route: "http-tts-editor", event: "route.push" }, { label: "查看测试状态", route: "http-tts-test", event: "route.push" }],
      planned: [{ label: "连接提供器", event: "httpTts.management.open" }]
    },
    "http-tts-editor": {
      title: "HTTP TTS 编辑",
      shell: "SettingsShell",
      icon: "edit",
      capability: "网络朗读",
      state: "编辑表单合同已登记",
      summary: "展示 URL、请求模板与凭据引用字段；Demo 不保存明文密钥，也不提交配置。",
      facts: [["端点", "https://example.invalid/tts"], ["凭据字段", "credentialKey"], ["校验", "Host / Core 待接线"]],
      navigation: [{ label: "返回提供器列表", route: "http-tts-management", event: "route.replace" }],
      planned: [{ label: "保存提供器", event: "httpTts.provider.save" }]
    },
    "http-tts-test": {
      title: "HTTP TTS 测试",
      shell: "SettingsShell",
      icon: "play",
      capability: "网络朗读",
      state: "测试状态合同已登记",
      summary: "明确 idle、loading、success、error 与 cancel 状态；当前仅展示 loading，不发起网络请求。",
      facts: [["示例状态", "等待运行时"], ["样本文本", "这是一段测试。"], ["取消语义", "请求级取消"]],
      navigation: [{ label: "返回提供器列表", route: "http-tts-management", event: "route.replace" }],
      planned: [{ label: "开始测试", event: "httpTts.test.start" }, { label: "取消测试", event: "httpTts.test.cancel" }]
    },
    "content-edit": {
      title: "正文编辑",
      shell: "ReaderShell",
      icon: "edit",
      capability: "正文工具",
      state: "编辑目标合同已登记",
      summary: "展示章节正文与替换规则的编辑入口；Demo 不写回章节内容，也不自动创建规则。",
      facts: [["书籍", "bk-001"], ["章节", "ch-001"], ["保存目标", "replacement-rule"]],
      navigation: [{ label: "查看替换规则", route: "content-replacement", event: "route.push" }],
      planned: [{ label: "保存编辑", event: "content.edit.save" }]
    },
    "book-cover-change": {
      title: "更换封面",
      shell: "LibraryShell",
      icon: "image",
      capability: "封面管理",
      state: "来源选择合同已登记",
      summary: "区分本地文件、网络搜索和恢复默认封面；文件读取和图片落盘仍由 Host 完成。",
      facts: [["当前书籍", "长夜余火"], ["本地文件", "等待 file picker"], ["远程搜索", "显式用户触发"]],
      navigation: [{ label: "搜索网络封面", route: "book-cover-search", event: "route.push" }, { label: "返回书籍详情", route: "book-detail", event: "route.replace" }],
      planned: [{ label: "选择本地封面", event: "book.cover.change" }]
    },
    "book-cover-search": {
      title: "搜索封面",
      shell: "LibraryShell",
      icon: "search",
      capability: "封面管理",
      state: "搜索表单合同已登记",
      summary: "展示关键词、来源和结果状态；Demo 不请求远程图片，也不声称已替换封面。",
      facts: [["关键词", "长夜余火"], ["结果", "等待 Core 搜索"], ["写入", "需二次确认"]],
      navigation: [{ label: "返回更换封面", route: "book-cover-change", event: "route.replace" }],
      planned: [{ label: "发起封面搜索", event: "book.cover.search" }]
    },
    "chapter-reviews": {
      title: "章节评论",
      shell: "LibraryShell",
      icon: "chat",
      capability: "章节评论",
      state: "远程状态合同已登记",
      summary: "展示加载、空、错误和重试语义；评论读取依赖书源能力，未声明时保持不可用。",
      facts: [["章节", "ch-001"], ["书源", "src-001"], ["当前状态", "能力未确认"]],
      navigation: [{ label: "返回书籍详情", route: "book-detail", event: "route.replace" }],
      planned: [{ label: "重试加载评论", event: "chapter.reviews.retry" }]
    },
    "bookmarks-manager": {
      title: "书签管理",
      shell: "LibraryShell",
      icon: "bookmark",
      capability: "个人阅读数据",
      state: "书签列表合同已登记",
      summary: "展示书签位置、摘录和删除边界；删除操作需 Core 确认，Demo 不变更本地数据。",
      facts: [["示例书签", "第一章 · 32%"], ["数据所有者", "Core"], ["删除", "需确认"]],
      navigation: [{ label: "返回书籍详情", route: "book-detail", event: "route.replace" }],
      planned: [{ label: "删除示例书签", event: "reader.bookmark.remove" }]
    },
    "download-queue": {
      title: "下载队列",
      shell: "LibraryShell",
      icon: "download",
      capability: "下载与缓存",
      state: "队列状态合同已登记",
      summary: "展示排队、进行中、暂停、失败与完成状态；Demo 不启动后台任务或占用存储。",
      facts: [["任务", "长夜余火 · 128 章"], ["示例进度", "37%"], ["后台执行", "平台 Host"]],
      navigation: [{ label: "查看任务详情", route: "download-task-detail", event: "route.push" }, { label: "查看存储", route: "storage-management", event: "route.push" }],
      planned: [{ label: "刷新下载队列", event: "download.queue.open" }]
    },
    "download-task-detail": {
      title: "下载任务详情",
      shell: "LibraryShell",
      icon: "download",
      capability: "下载与缓存",
      state: "任务控制合同已登记",
      summary: "展示任务范围、进度、错误和可恢复动作；当前重试与取消均保持失败关闭。",
      facts: [["任务 ID", "download-001"], ["失败章节", "2"], ["清理策略", "取消后显式确认"]],
      navigation: [{ label: "返回下载队列", route: "download-queue", event: "route.replace" }],
      planned: [{ label: "重试失败章节", event: "download.task.retry" }, { label: "取消任务", event: "download.task.cancel" }]
    },
    "storage-management": {
      title: "存储管理",
      shell: "SettingsShell",
      icon: "storage",
      capability: "存储治理",
      state: "存储分类合同已登记",
      summary: "区分书籍缓存、本地书、临时文件和数据库；Demo 不删除文件，也不估算设备真实容量。",
      facts: [["书籍缓存", "示例 1.2 GB"], ["本地书", "示例 640 MB"], ["可清理", "仅缓存与临时文件"]],
      navigation: [{ label: "查看存储设置", route: "settings-storage", event: "route.push" }],
      planned: [{ label: "确认清理缓存", event: "storage.cleanup.confirm" }]
    },
    "webview-login": {
      title: "网页登录",
      shell: "FlowShell",
      icon: "globe",
      capability: "书源认证挑战",
      state: "WebView 能力合同已登记",
      summary: "App 只编排登录窗口、限定域 Cookie 与返回请求；WebView 不可用时保持失败关闭。",
      facts: [["书源", "src-001"], ["凭据展示", "始终脱敏"], ["降级", "不回退到伪登录"]],
      navigation: [{ label: "预览验证码状态", route: "webview-captcha", event: "route.push" }, { label: "预览挑战恢复", route: "webview-challenge", event: "route.push" }],
      planned: [{ label: "启动登录 WebView", event: "webview.login.open" }, { label: "取消登录", event: "webview.login.cancel" }]
    },
    "webview-captcha": {
      title: "验证码",
      shell: "FlowShell",
      icon: "shield",
      capability: "书源认证挑战",
      state: "验证码表面合同已登记",
      summary: "验证码内容只能来自真实 App WebView；Demo 不生成或截取凭据，不模拟验证成功。",
      facts: [["模式", "captcha"], ["完成信号", "App-owned evaluate result"], ["凭据捕获", "禁止"]],
      navigation: [{ label: "预览 Cookie 返回", route: "webview-cookie-return", event: "route.push" }, { label: "返回登录入口", route: "webview-login", event: "route.replace" }],
      planned: [{ label: "打开验证码 WebView", event: "webview.login.open" }]
    },
    "webview-challenge": {
      title: "需要网页验证",
      shell: "FlowShell",
      icon: "warning",
      capability: "书源认证挑战",
      state: "CHALLENGE_REQUIRED",
      summary: "该错误仅在 WebView 能力可用时可恢复；否则保留原错误，不循环重试网络请求。",
      facts: [["错误码", "CHALLENGE_REQUIRED"], ["自动重试", "关闭"], ["恢复方式", "用户发起 WebView"]],
      navigation: [{ label: "返回登录入口", route: "webview-login", event: "route.replace" }],
      planned: [{ label: "打开验证页", event: "webview.challenge.retry" }]
    },
    "webview-cookie-return": {
      title: "读取登录状态",
      shell: "FlowShell",
      icon: "refresh",
      capability: "书源认证挑战",
      state: "Cookie 返回合同已登记",
      summary: "读取限定 profile/source 的 Cookie 并返回失败请求；Demo 不访问浏览器存储，不展示 Cookie 值。",
      facts: [["作用域", "profile + source"], ["展示策略", "redacted"], ["失败状态", "empty / mismatch / unavailable"]],
      navigation: [{ label: "返回登录入口", route: "webview-login", event: "route.replace" }],
      planned: [{ label: "读取并返回 Cookie", event: "webview.cookie.return" }]
    },
    "settings-tts": {
      title: "朗读设置",
      shell: "SettingsShell",
      icon: "tts",
      capability: "系统与网络朗读",
      state: "系统 TTS 设置合同已登记",
      summary: "系统 TTS 与 HTTP TTS 使用不同能力边界；当前试听不会调用设备语音引擎。",
      facts: [["语音", "system-default"], ["语速", "1.0x"], ["平台差异", "必须显式呈现"]],
      navigation: [{ label: "管理 HTTP TTS", route: "http-tts-management", event: "route.push" }, { label: "返回设置", route: "settings", event: "route.replace" }],
      planned: [{ label: "试听系统语音", event: "reader.tts.start" }]
    },
    "settings-storage": {
      title: "存储设置",
      shell: "SettingsShell",
      icon: "storage",
      capability: "存储治理",
      state: "存储设置合同已登记",
      summary: "展示缓存策略和平台路径差异；清理缓存必须经明确确认，Demo 不执行删除。",
      facts: [["缓存策略", "按书籍可清理"], ["本地书", "永不自动删除"], ["路径", "平台管理"]],
      navigation: [{ label: "打开存储管理", route: "storage-management", event: "route.push" }, { label: "返回设置", route: "settings", event: "route.replace" }],
      planned: [{ label: "清理缓存", event: "settings.cache.clear" }]
    },
    "settings-accessibility": {
      title: "无障碍",
      shell: "SettingsShell",
      icon: "assist",
      capability: "可访问性与动态效果",
      state: "平台差异合同已登记",
      summary: "减少动态效果可由 ReaderUIRuntime 响应；屏幕阅读器和系统文字大小仍由平台管理。",
      facts: [["减少动态", "runtime policy"], ["屏幕阅读器", "system-managed"], ["文字缩放", "system-managed"]],
      navigation: [{ label: "返回设置", route: "settings", event: "route.replace" }],
      planned: [{ label: "启用减少动态", event: "reducedMotion.enable" }, { label: "停用减少动态", event: "reducedMotion.disable" }]
    }
  });

  var CAPABILITY_ROUTES = Object.freeze(Object.keys(ROUTE_CONFIG));
  var INTEGRATION_MAP = Object.freeze(CAPABILITY_ROUTES.reduce(function (map, route) {
    map[route] = "renderCapabilityRoute";
    return map;
  }, {}));

  function factGrid(items, title) {
    return `
      <section class="fd-reader-debug-grid" aria-label="${esc(title)}合同信息">
        ${(items || []).map(function (item) {
          return `<article><small>${esc(item[0])}</small><strong>${esc(item[1])}</strong></article>`;
        }).join("")}
      </section>`;
  }

  function navigationButton(action) {
    return `<button type="button" data-route="${esc(action.route)}" data-ui-event="${esc(action.event)}" data-action-policy="demo-route-only">${esc(action.label)}</button>`;
  }

  function plannedButton(action) {
    return `<button type="button" disabled aria-disabled="true" data-ui-event="${esc(action.event)}" data-action-policy="planned-fail-closed" title="业务运行时尚未接入">${esc(action.label)} · 待接入</button>`;
  }

  function capabilityContent(route, config) {
    var facts = [["RouteId", route], ["Shell", config.shell], ["能力域", config.capability]].concat(config.facts || []);
    return `
      <section class="fd-search-state fd-contract-static-state" data-capability-route="${esc(route)}" data-renderer="d6-capability-closure" data-delivery-state="registered-local-fail-closed" aria-label="${esc(config.title)}">
        <span>${icon(config.icon || "info", "fd-medium-icon")}</span>
        <small>D6 · 本地能力合同</small>
        <h2>${esc(config.title)}</h2>
        <p>${esc(config.summary)}</p>
        <p role="status"><strong>${esc(config.state)}</strong>；仅下方路由预览可交互，业务动作保持失败关闭。</p>
        ${factGrid(facts, config.title)}
        <section class="fd-setting-section" aria-label="交互边界">
          <h3>交互边界</h3>
          <article class="fd-setting-row" role="note">
            <span>${icon("shield", "fd-small-icon")}</span>
            <strong>本地预览不伪造 Core / Host 成功<small>禁用动作保留 canonical UiEvent，待真实 runtime 接入后启用。</small></strong>
          </article>
        </section>
        <div class="fd-action-row" aria-label="${esc(config.title)}路由预览">
          ${(config.navigation || []).map(navigationButton).join("")}
        </div>
        <div class="fd-action-row" aria-label="${esc(config.title)}待接入动作">
          ${(config.planned || []).map(plannedButton).join("")}
        </div>
      </section>`;
  }

  function basePhoneConfig(data, config, contentHtml) {
    return {
      data: data || {},
      title: config.title,
      ariaLabel: config.title,
      frameClass: "fd-phone fd-library-phone fd-capability-phone",
      statusBarClass: "fd-status-bar",
      systemIconsClass: "fd-system-icons",
      topBarClass: "fd-back-bar",
      iconClass: "fd-icon",
      contentClass: "fd-phone-content fd-capability-content",
      bottomActionHostClass: "fd-bottom-action-host",
      contentHtml: contentHtml
    };
  }

  function renderInShell(data, config, contentHtml) {
    var kit = shellKit();
    if (config.shell === "FlowShell") {
      return kit.renderFlowShell({
        title: config.title,
        ariaLabel: config.title,
        frameClass: "fd-phone fd-library-phone fd-capability-phone fd-capability-flow",
        stepClass: "fd-phone-content fd-capability-content",
        stepHtml: contentHtml
      });
    }
    if (config.shell === "ReaderShell") {
      return kit.renderReaderShell({
        frameClass: "fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-utility-frame fd-capability-reader",
        readingSurfaceClass: "fd-reading-surface fd-capability-content",
        readingSurfaceHtml: contentHtml,
        overlayClass: "fd-reader-overlay fd-reader-full-overlay",
        bottomSheetHostClass: "fd-reader-full-host",
        moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
        stateHostClass: "fd-reader-state-host",
        ariaLabel: config.title
      });
    }
    if (config.shell === "SettingsShell") {
      var settingsConfig = basePhoneConfig(data, config, contentHtml);
      settingsConfig.frameClass = "fd-phone fd-settings-phone fd-capability-phone";
      return kit.renderSettingsShell(settingsConfig);
    }
    return kit.renderLibraryShell(basePhoneConfig(data, config, contentHtml));
  }

  function renderCapabilityRoute(route, data, appState) {
    var config = ROUTE_CONFIG[route];
    if (!config) return null;
    return renderInShell(data, config, capabilityContent(route, config, appState));
  }

  function renderD6Route(route, data, appState) {
    return INTEGRATION_MAP[route] ? renderCapabilityRoute(route, data, appState) : null;
  }

  var d6Exports = {
    CAPABILITY_ROUTES: CAPABILITY_ROUTES,
    ROUTE_CONFIG: ROUTE_CONFIG,
    INTEGRATION_MAP: INTEGRATION_MAP,
    renderCapabilityRoute: renderCapabilityRoute,
    renderD6Route: renderD6Route
  };
  var d6PublicRouteSpecifications = {
    renderCapabilityRoute: { allowedRoutes: CAPABILITY_ROUTES, routeIndex: 0 },
    renderD6Route: { allowedRoutes: CAPABILITY_ROUTES, routeIndex: 0, passthroughUnowned: true }
  };
  d6Exports.PUBLIC_ROUTE_RENDERER_BINDINGS = Object.freeze({
    renderCapabilityRoute: CAPABILITY_ROUTES,
    renderD6Route: CAPABILITY_ROUTES
  });
  if (window.ReaderPublicRouteRendererAdmission && typeof window.ReaderPublicRouteRendererAdmission.guardModule === "function") {
    d6Exports = window.ReaderPublicRouteRendererAdmission.guardModule(d6Exports, d6PublicRouteSpecifications);
  }
  window.ReaderD6CapabilityClosureRenderers = d6Exports;
})(window);
