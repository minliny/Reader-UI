// =============================================================================
// W2 阅读工作流 renderer 函数模块
// -----------------------------------------------------------------------------
// 用途：为 W2 阅读工作流的 10 个 canonical direct ViewState 路由提供专用 renderer，
//       其中 3 个 P0 阻断路由（正文加载中 / 离线 / 错误）必须使用 ReaderShell
//       保持阅读上下文，绝不 fallback 到书架。
//
// 集成方式：本文件中的函数签名与 render-runtime.js 现有 renderer 一致，
//           假设 esc / icon / shellKit / readerThemeStyle / readerBrightnessStyle /
//           sharedReaderSurface / readerTopOverlay / currentReaderChapter /
//           readerChapterMeta / readerChapterTitle / readerChapters / routes /
//           routeTitle 等辅助函数在作用域内可用。集成时将函数定义复制进
//           render-runtime.js 的 renderer 定义区，并在 renderRoute switch 中
//           添加对应 case。
//
// P0 阻断约束：
//   reader-content-loading / reader-content-offline / reader-content-error
//   三个路由必须使用 ReaderShell，保留阅读框架、章节标题和页码位置，
//   不得 fallback 到书架（LibraryShell / MainTabShell）。
//
// 契约对齐：
//   UiEvent: reader.content.loading / reader.content.offline / reader.content.error /
//            reader.toc.loading / reader.toc.offline / reader.toc.error /
//            reader.page.boundary.first / reader.page.boundary.last /
//            reader.progress.restore / reader.background.restore
//   CoreCommand: reader.content.retry / reader.content.switchSource /
//                reader.toc.retry / reader.progress.jump / reader.progress.reset
//   view-state.readerPhase: loading / offline / error / boundary / restore
// =============================================================================


// -----------------------------------------------------------------------------
// 辅助：阅读状态面板公共结构
// 用于在 ReaderShell 的 bottomSheet 区域展示加载/离线/错误/边界等状态卡
// -----------------------------------------------------------------------------
function w2ReaderStatePanel(route, variant, iconName, title, summary, extraHtml, actionsHtml) {
  return `
    <section class="fd-reader-state-panel fd-reader-state-${esc(variant)}" data-route="${esc(route)}" data-reader-variant="${esc(variant)}" aria-live="polite">
      <span class="fd-reader-state-icon">${icon(iconName, "fd-medium-icon")}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(summary)}</p>
      ${extraHtml || ""}
      ${actionsHtml ? `<div class="fd-action-row fd-reader-state-actions">${actionsHtml}</div>` : ""}
    </section>`;
}


// -----------------------------------------------------------------------------
// 辅助：阅读状态 ReaderShell 公共构造
// 统一 P0 与其他状态路由的 ReaderShell 结构，保证阅读上下文（正文层、顶栏、
// 亮度层）一致，只替换 bottomSheet 内容和 readingSurface 变体。
// 参数：
//   data, appState —— 常规渲染数据
//   route          —— 当前路由 id（用于 ariaLabel 和 data 属性）
//   options.surfaceHtml —— 正文层 HTML（默认保留 sharedReaderSurface）
//   options.bottomSheetHtml —— 状态面板 HTML
//   options.overlayHtml    —— 覆盖层 HTML（默认 readerTopOverlay）
//   options.dialogHtml     —— 对话层 HTML（注入到 stateHostHtml）
//   options.frameClassExtra —— 额外 frame 类名（如 fd-reader-state-loading）
// -----------------------------------------------------------------------------
function w2ReaderStateShell(data, appState, route, options) {
  const opts = options || {};
  const pageModeClass = appState?.readerPageMode === "vertical" ? " fd-reader-page-mode-vertical" : " fd-reader-page-mode-horizontal";
  const frameExtra = opts.frameClassExtra ? ` ${opts.frameClassExtra}` : "";
  const ariaLabel = (routes[route] && routes[route].title) || routeTitle(route) || "阅读状态";
  const dialogHtml = opts.dialogHtml || "";
  return shellKit().renderReaderShell({
    frameClass: `fd-reader-frame fd-reader-flow-frame fd-reader-mode-full fd-reader-state-frame${frameExtra}${pageModeClass}`,
    frameStyle: readerThemeStyle(data, appState),
    readingSurfaceClass: "fd-reading-surface",
    overlayClass: "fd-reader-overlay fd-reader-full-overlay",
    bottomSheetHostClass: "fd-reader-full-host",
    moduleNavClass: "fd-reader-module-nav fd-reader-module-nav-empty",
    stateHostClass: "fd-reader-state-host",
    stateHostHtml: `<div class="fd-reader-global-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>${dialogHtml}`,
    ariaLabel,
    readingSurfaceHtml: opts.surfaceHtml != null ? opts.surfaceHtml : sharedReaderSurface(data, "", appState),
    overlayHtml: opts.overlayHtml != null ? opts.overlayHtml : readerTopOverlay(data, Object.assign({}, appState, { readerMoreOpen: false })),
    bottomSheetHtml: opts.bottomSheetHtml || "",
    moduleNavHtml: ""
  });
}


// -----------------------------------------------------------------------------
// 辅助：骨架正文层（用于 reader-content-loading）
// 保留章节标题和页码位置标记，正文段落用骨架占位，避免暴露空白或旧内容
// -----------------------------------------------------------------------------
function w2ReaderSkeletonSurface(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const pageIndex = Number.isFinite(Number(appState?.readerPageIndex)) ? Number(appState.readerPageIndex) : 0;
  const skeletonLines = Array.from({ length: 7 }, (_, i) => `<p class="fd-reader-skeleton-line" style="--skel-w:${30 + ((i * 13) % 60)}%"></p>`).join("");
  return `
    <div class="fd-ir-background-layer" data-dev-region="ReadingBackground" aria-hidden="true" style="${readerThemeStyle(data, appState)}"></div>
    <article class="fd-ir-reading-layer fd-reader-skeleton-surface" aria-label="正文加载中" data-dev-region="ReadingTextLayer" data-reader-loading-surface data-reader-page-index="${esc(pageIndex)}" data-reader-surface-signature="${esc(chapterTitle)}" style="${readerThemeStyle(data, appState)}">
      <h1>${esc(chapterTitle.replace(/^第\s*\d+\s*章\s*/, ""))}</h1>
      ${skeletonLines}
    </article>
    <div class="fd-reader-brightness-dim" data-reader-brightness-dim aria-hidden="true" style="${readerBrightnessStyle(data, appState)}"></div>`;
}


// -----------------------------------------------------------------------------
// 辅助：阅读进度恢复对话框
// 显示"是否跳转到上次阅读位置"，提供"跳转到第 X 章"和"从头开始"
// -----------------------------------------------------------------------------
function w2ReaderProgressRestoreDialog(data, appState) {
  const lastChapter = appState?.readerRestoreChapter || "第 45 章 雨霁";
  const lastProgress = appState?.readerRestoreProgress || "68%";
  const lastTime = appState?.readerRestoreTime || "昨天 23:14";
  return `
    <section class="fd-reader-restore-dialog" role="dialog" aria-modal="true" aria-label="恢复阅读进度" data-reader-restore-dialog>
      <div class="fd-reader-restore-dialog-body">
        <header>
          ${icon("bookmark", "fd-small-icon")}
          <strong>是否跳转到上次阅读位置？</strong>
        </header>
        <dl class="fd-reader-restore-meta">
          <div><dt>上次章节</dt><dd>${esc(lastChapter)}</dd></div>
          <div><dt>阅读进度</dt><dd>${esc(lastProgress)}</dd></div>
          <div><dt>阅读时间</dt><dd>${esc(lastTime)}</dd></div>
        </dl>
        <div class="fd-action-row fd-reader-restore-actions">
          <button type="button" data-reader-restore="jump" data-route="immersive-reading">跳转到${esc(lastChapter)}</button>
          <button type="button" data-reader-restore="reset" data-route="immersive-reading">从头开始</button>
        </div>
      </div>
    </section>`;
}


// =============================================================================
// 一、3 个 P0 阻断路由的专用 renderer
// =============================================================================
// 1. reader-content-loading —— 正文加载中（P0）
//    约束：使用 ReaderShell，显示骨架屏 + 保留章节标题和页码位置，不跳回书架
//    动作：保留阅读框架；加载完成后自动回到 immersive-reading
function readerContentLoadingScreen(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const pageIndex = Number.isFinite(Number(appState?.readerPageIndex)) ? Number(appState.readerPageIndex) : 0;
  const pageHint = `第 ${chapterState.index + 1}/${chapterState.count} 章 · 第 ${pageIndex + 1} 页`;
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="加载上下文">
      <article><small>当前章节</small><strong>${esc(chapterTitle)}</strong></article>
      <article><small>阅读位置</small><strong>${esc(pageHint)}</strong></article>
    </section>
    <div class="fd-reader-state-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" aria-label="正文加载进度">
      <i class="fd-reader-state-spinner" aria-hidden="true"></i>
      <span>正在拉取正文内容</span>
    </div>`;
  const actionsHtml = `
    <button type="button" data-route="immersive-reading">取消加载</button>
    <button type="button" data-route="reader">返回控制层</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-content-loading", "loading", "refresh", "正文加载中", "正在从书源拉取章节正文，加载完成后自动回到阅读。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-content-loading", {
    surfaceHtml: w2ReaderSkeletonSurface(data, appState),
    bottomSheetHtml,
    frameClassExtra: "fd-reader-state-loading"
  });
}


// 2. reader-content-offline —— 正文离线（P0）
//    约束：使用 ReaderShell，保留阅读框架；显示离线提示 + 缓存章节入口 + 重试
//    动作：阅读缓存章节 / 重试 / 换源
function readerContentOfflineScreen(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const cachedChapters = readerChapters(data).filter((ch) => ch.markers && ch.markers.indexOf("已缓存") >= 0);
  const cachedCount = cachedChapters.length || 2;
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="离线上下文">
      <article><small>当前章节</small><strong>${esc(chapterTitle)}</strong></article>
      <article><small>可读缓存</small><strong>${esc(cachedCount)} 章已缓存</strong></article>
    </section>
    <p class="fd-reader-state-hint">网络不可用，可继续阅读已缓存章节，或在恢复网络后重试拉取当前章节正文。</p>`;
  const actionsHtml = `
    <button type="button" data-route="reader-book-cache">阅读缓存章节</button>
    <button type="button" data-route="immersive-reading">重试</button>
    <button type="button" data-route="source-switch">换源</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-content-offline", "offline", "offline", "正文离线", "当前网络不可用，无法拉取当前章节正文。", extraHtml, actionsHtml);
  // 离线时保留上一次渲染的正文层（sharedReaderSurface），不丢失页码位置
  return w2ReaderStateShell(data, appState, "reader-content-offline", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-state-offline"
  });
}


// 3. reader-content-error —— 正文加载错误（P0）
//    约束：使用 ReaderShell，保留阅读框架；显示错误信息 + 重试 + 换源入口
//    动作：重试 / 换源 / 查看缓存
function readerContentErrorScreen(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const errorCode = appState?.readerContentError || "HTTP 503";
  const errorMsg = appState?.readerContentErrorMsg || "书源响应超时或返回了无效内容，可重试或切换书源。";
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="错误上下文">
      <article><small>当前章节</small><strong>${esc(chapterTitle)}</strong></article>
      <article><small>错误码</small><strong>${esc(errorCode)}</strong></article>
    </section>
    <p class="fd-reader-state-hint">${esc(errorMsg)}</p>`;
  const actionsHtml = `
    <button type="button" data-route="immersive-reading">重试</button>
    <button type="button" data-route="source-switch">换源</button>
    <button type="button" data-route="reader-book-cache">查看缓存</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-content-error", "error", "warning", "正文加载失败", "当前章节正文拉取失败，可重试或切换书源。", extraHtml, actionsHtml);
  // 错误时保留上一次正文层，不丢失阅读位置
  return w2ReaderStateShell(data, appState, "reader-content-error", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-state-error"
  });
}


// =============================================================================
// 二、7 个其他 canonical direct ViewState 路由的专用 renderer
// =============================================================================
// 4. reader-toc-loading —— 目录加载中
//    约束：使用 ReaderShell，保留正文层；目录区显示骨架占位
function readerTocLoadingScreen(data, appState) {
  const skeletonItems = Array.from({ length: 6 }, (_, i) => `
    <article class="fd-reader-toc-skeleton-item" aria-hidden="true">
      <span class="fd-reader-toc-skeleton-index">${esc(i + 1)}</span>
      <span class="fd-reader-toc-skeleton-line" style="--skel-w:${40 + ((i * 17) % 45)}%"></span>
    </article>`).join("");
  const extraHtml = `
    <section class="fd-reader-toc-loading-list" aria-label="目录加载占位">${skeletonItems}</section>`;
  const actionsHtml = `
    <button type="button" data-route="reader">返回阅读</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-toc-loading", "loading", "refresh", "目录加载中", "正在从书源拉取章节目录，加载完成后可点击跳转。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-toc-loading", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-toc-loading"
  });
}


// 5. reader-toc-offline —— 目录离线，显示缓存目录
//    约束：使用 ReaderShell，保留正文层；展示缓存目录章节列表 + 重试
function readerTocOfflineScreen(data, appState) {
  const chapters = readerChapters(data);
  const current = currentReaderChapter(data, appState);
  const listHtml = chapters.map((chapter, index) => {
    const isCurrent = index === current.index;
    const cached = chapter.markers && chapter.markers.indexOf("已缓存") >= 0;
    return `
      <article class="fd-reader-toc-cached-item${isCurrent ? " is-current" : ""}${cached ? " is-cached" : ""}">
        <span><strong>${esc(chapter.title)}</strong>${cached ? "<em>已缓存</em>" : ""}</span>
        <button type="button" data-reader-toc-jump="${esc(index)}"${cached ? "" : " disabled aria-disabled=\"true\""}>${cached ? "阅读" : "未缓存"}</button>
      </article>`;
  }).join("");
  const extraHtml = `
    <section class="fd-reader-toc-cached-list" aria-label="缓存目录">${listHtml}</section>
    <p class="fd-reader-state-hint">网络不可用，仅显示已缓存章节；未缓存章节需恢复网络后拉取。</p>`;
  const actionsHtml = `
    <button type="button" data-route="reader-toc-offline">重试</button>
    <button type="button" data-route="reader">返回阅读</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-toc-offline", "offline", "offline", "目录离线", "当前网络不可用，已展示缓存目录。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-toc-offline", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-toc-offline"
  });
}


// 6. reader-toc-error —— 目录加载错误 + 重试
//    约束：使用 ReaderShell，保留正文层；显示错误信息 + 重试
function readerTocErrorScreen(data, appState) {
  const errorCode = appState?.readerTocError || "解析超时";
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="错误上下文">
      <article><small>错误原因</small><strong>${esc(errorCode)}</strong></article>
      <article><small>影响范围</small><strong>无法浏览和跳转章节目录</strong></article>
    </section>
    <p class="fd-reader-state-hint">目录规则解析失败或书源未响应，可重试或切换书源后重新加载目录。</p>`;
  const actionsHtml = `
    <button type="button" data-route="reader-toc-error">重试</button>
    <button type="button" data-route="source-switch">换源</button>
    <button type="button" data-route="reader">返回阅读</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-toc-error", "error", "warning", "目录加载失败", "章节目录拉取失败，可重试或切换书源。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-toc-error", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-toc-error"
  });
}


// 7. reader-page-boundary-first —— 首章边界
//    约束：使用 ReaderShell，保留当前页码（不丢失位置）；显示"已是第一章"
//    动作：上一本 / 查看目录
function readerPageBoundaryFirstScreen(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="边界上下文">
      <article><small>当前章节</small><strong>${esc(chapterTitle)}</strong></article>
      <article><small>章节位置</small><strong>第 1 章 · 已是首章</strong></article>
    </section>
    <p class="fd-reader-state-hint">已是第一章，无法继续向前翻页；可打开上一本继续阅读，或查看目录选择章节。</p>`;
  const actionsHtml = `
    <button type="button" data-action="reader-open-previous-book">上一本</button>
    <button type="button" data-route="reader-full-directory">查看目录</button>
    <button type="button" data-route="immersive-reading">留在当前页</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-page-boundary-first", "boundary", "chevron-left", "已是第一章", "当前章节已是本书第一章，无法继续向前翻页。", extraHtml, actionsHtml);
  // 边界状态保留当前正文层和页码，不重置位置
  return w2ReaderStateShell(data, appState, "reader-page-boundary-first", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-boundary fd-reader-boundary-first"
  });
}


// 8. reader-page-boundary-last —— 末章边界
//    约束：使用 ReaderShell，保留当前页码；显示"已是最后一章"
//    动作：下一本 / 标记完结
function readerPageBoundaryLastScreen(data, appState) {
  const chapterState = currentReaderChapter(data, appState);
  const chapterTitle = chapterState.chapter.title || readerChapterMeta(data);
  const extraHtml = `
    <section class="fd-reader-state-meta" aria-label="边界上下文">
      <article><small>当前章节</small><strong>${esc(chapterTitle)}</strong></article>
      <article><small>章节位置</small><strong>第 ${esc(chapterState.count)} 章 · 已是末章</strong></article>
    </section>
    <p class="fd-reader-state-hint">已是最后一章，无法继续向后翻页；可打开下一本继续阅读，或将本书标记为已完结。</p>`;
  const actionsHtml = `
    <button type="button" data-action="reader-open-next-book">下一本</button>
    <button type="button" data-action="reader-mark-finished">标记完结</button>
    <button type="button" data-route="immersive-reading">留在当前页</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-page-boundary-last", "boundary", "chevron", "已是最后一章", "当前章节已是本书最后一章，无法继续向后翻页。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-page-boundary-last", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-boundary fd-reader-boundary-last"
  });
}


// 9. reader-progress-restore —— 阅读进度恢复对话框
//    约束：使用 ReaderShell，保留正文层；显示"是否跳转到上次阅读位置"
//    动作：跳转到第 X 章 / 从头开始
function readerProgressRestoreScreen(data, appState) {
  // 进度恢复以对话框形式叠加在阅读层之上，正文层保持当前内容
  const dialogHtml = w2ReaderProgressRestoreDialog(data, appState);
  const bottomSheetHtml = `
    <section class="fd-reader-restore-backdrop-hint" aria-hidden="true">
      ${icon("bookmark", "fd-small-icon")}
      <span>阅读进度恢复对话框已显示，请选择是否跳转到上次位置</span>
    </section>`;
  return w2ReaderStateShell(data, appState, "reader-progress-restore", {
    bottomSheetHtml,
    dialogHtml,
    frameClassExtra: "fd-reader-restore"
  });
}


// 10. reader-background-restore —— 后台恢复提示
//     约束：使用 ReaderShell，保留正文层；显示"正在恢复阅读状态"
//     动作：恢复完成后自动进入 immersive-reading
function readerBackgroundRestoreScreen(data, appState) {
  const restoreStage = appState?.readerRestoreStage || "正在恢复阅读位置和书签";
  const restoreProgress = Math.max(0, Math.min(100, Number(appState?.readerRestoreProgress) || 42));
  const extraHtml = `
    <section class="fd-reader-restore-progress" aria-label="恢复进度">
      <article><small>当前步骤</small><strong>${esc(restoreStage)}</strong></article>
    </section>
    <div class="fd-reader-state-progress" role="progressbar" aria-valuenow="${esc(restoreProgress)}" aria-valuemin="0" aria-valuemax="100" aria-label="阅读状态恢复进度">
      <i class="fd-reader-state-spinner" aria-hidden="true"></i>
      <span>恢复进度 ${esc(restoreProgress)}%</span>
    </div>`;
  const actionsHtml = `
    <button type="button" data-route="immersive-reading">立即进入阅读</button>`;
  const bottomSheetHtml = w2ReaderStatePanel("reader-background-restore", "restore", "refresh", "正在恢复阅读状态", "应用从后台返回，正在恢复阅读位置、书签和排版设置。", extraHtml, actionsHtml);
  return w2ReaderStateShell(data, appState, "reader-background-restore", {
    bottomSheetHtml,
    frameClassExtra: "fd-reader-background-restore"
  });
}


// =============================================================================
// 三、集成映射
// -----------------------------------------------------------------------------
// 将以下 case 添加到 render-runtime.js 的 renderRoute switch（约 8511-8543 行
// 现有 reader 相关 case 附近，建议放在 reader-book-cache/reader-debug-info 之后）。
// 所有 renderer 均使用 ReaderShell，不会 fallback 到书架。
// =============================================================================

// INTEGRATION_MAP:
//
// --- 3 个 P0 路由（render-runtime.js 已接入）---
// case "reader-content-loading":
//   return readerContentLoadingScreen(data, appState);
// case "reader-content-offline":
//   return readerContentOfflineScreen(data, appState);
// case "reader-content-error":
//   return readerContentErrorScreen(data, appState);
//
// --- 7 个其他 R16B direct 路由（render-runtime.js 已接入）---
// case "reader-toc-loading":
//   return readerTocLoadingScreen(data, appState);
// case "reader-toc-offline":
//   return readerTocOfflineScreen(data, appState);
// case "reader-toc-error":
//   return readerTocErrorScreen(data, appState);
// case "reader-page-boundary-first":
//   return readerPageBoundaryFirstScreen(data, appState);
// case "reader-page-boundary-last":
//   return readerPageBoundaryLastScreen(data, appState);
// case "reader-progress-restore":
//   return readerProgressRestoreScreen(data, appState);
// case "reader-background-restore":
//   return readerBackgroundRestoreScreen(data, appState);
//
// --- routeId → functionName 完整映射 ---
// reader-content-loading       → readerContentLoadingScreen
// reader-content-offline       → readerContentOfflineScreen
// reader-content-error         → readerContentErrorScreen
// reader-toc-loading           → readerTocLoadingScreen
// reader-toc-offline           → readerTocOfflineScreen
// reader-toc-error             → readerTocErrorScreen
// reader-page-boundary-first   → readerPageBoundaryFirstScreen
// reader-page-boundary-last    → readerPageBoundaryLastScreen
// reader-progress-restore      → readerProgressRestoreScreen
// reader-background-restore    → readerBackgroundRestoreScreen


// =============================================================================
// 四、route-contract.js 已同步条目
// -----------------------------------------------------------------------------
// 以下 10 个条目已由 route-contract.js、route fixture、ViewState fixture 与本
// renderer 共同发布为 canonical R16B 真源。
// 将以下条目添加到 route-contract.js 的 routes 对象中（建议放在 "reader-debug-info"
// 条目附近，与其他 reader 路由聚合）。
// =============================================================================

// ROUTE_CONTRACT_ENTRIES:
//
// "reader-content-loading": { title: "正文加载中（Reader Content Loading）", shell: "ReaderShell" },
// "reader-content-offline": { title: "正文离线（Reader Content Offline）", shell: "ReaderShell" },
// "reader-content-error": { title: "正文加载错误（Reader Content Error）", shell: "ReaderShell" },
// "reader-toc-loading": { title: "目录加载中（Reader TOC Loading）", shell: "ReaderShell" },
// "reader-toc-offline": { title: "目录离线（Reader TOC Offline）", shell: "ReaderShell" },
// "reader-toc-error": { title: "目录加载错误（Reader TOC Error）", shell: "ReaderShell" },
// "reader-page-boundary-first": { title: "首章边界（Reader Page Boundary First）", shell: "ReaderShell" },
// "reader-page-boundary-last": { title: "末章边界（Reader Page Boundary Last）", shell: "ReaderShell" },
// "reader-progress-restore": { title: "阅读进度恢复（Reader Progress Restore）", shell: "ReaderShell" },
// "reader-background-restore": { title: "后台恢复提示（Reader Background Restore）", shell: "ReaderShell" },
//
// 说明：
// - shell 统一为 ReaderShell，与现有 "immersive-reading"/"reader" 等路由一致，
//   保证阅读上下文不被打断，不 fallback 到书架。
// - title 格式遵循 route-contract.js 现有约定（中文 + 英文括注）。
// - 添加后 routeTitle(route) 将自动返回去掉括注的中文标题。
