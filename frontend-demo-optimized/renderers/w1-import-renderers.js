// =============================================================================
// W1 导入工作流 renderer 函数模块
// -----------------------------------------------------------------------------
// 用途：为 W1 导入工作流的 8 个 canonical direct ViewState 路由提供专用 renderer，
//       并为 7 个已审计路由补全 loading/empty/error/offline 状态变体。
//
// 集成方式：本文件中的函数签名与 render-runtime.js 现有 renderer 一致，
//           假设 esc / icon / chevron / shellKit / phoneShellClasses /
//           sourceShell / sourceBottomActions / rssLibraryScreen 等辅助函数
//           在作用域内可用。集成时将函数定义复制进 render-runtime.js 的
//           renderer 定义区，并在 renderRoute switch 中添加对应 case。
//
// 动作流（importPhase enum）：入口 → 选择 → 输入 → 解析 → 预览 → 冲突 → 应用 → 结果
//   idle → selecting → input → parsing → preview → conflict → applying → result
//
// 契约对齐：
//   UiEvent: import.permission.denied / import.format.unsupported / import.file.empty /
//            import.duplicate.found / import.conflict.resolve / import.partial.success /
//            import.retry.failed / import.start / import.apply / import.cancel
//   CoreCommand: import.parse / import.persist / import.rollback
//   view-state.importPhase: idle/selecting/input/parsing/preview/conflict/applying/result
// =============================================================================


// -----------------------------------------------------------------------------
// 辅助：W1 导入流程阶段面包屑
// phase 取自 importPhase enum，高亮当前阶段，其余阶段弱化
// -----------------------------------------------------------------------------
function w1ImportPhaseBreadcrumb(currentPhase) {
  const phases = [
    ["selecting", "选择"],
    ["input", "输入"],
    ["parsing", "解析"],
    ["preview", "预览"],
    ["conflict", "冲突"],
    ["applying", "应用"],
    ["result", "结果"]
  ];
  const items = phases.map(([key, label]) => {
    const isActive = key === currentPhase;
    const isPast = phases.findIndex(([k]) => k === currentPhase) > phases.findIndex(([k]) => k === key);
    const stateClass = isActive ? " is-active" : (isPast ? " is-done" : "");
    return `<li class="fd-import-phase-item${stateClass}" data-phase="${esc(key)}"><span>${esc(label)}</span></li>`;
  }).join("");
  return `<ol class="fd-import-phase-breadcrumb" aria-label="导入流程阶段">${items}</ol>`;
}


// -----------------------------------------------------------------------------
// 辅助：导入状态卡公共结构
// -----------------------------------------------------------------------------
function w1ImportStateCard(route, phase, iconName, title, summary, extraHtml, actionsHtml) {
  return `
    <section class="fd-import-state fd-import-state-card" data-route="${esc(route)}" data-import-phase="${esc(phase)}">
      <span class="fd-state-icon">${icon(iconName, "fd-medium-icon")}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(summary)}</p>
      ${extraHtml || ""}
      ${actionsHtml ? `<div class="fd-action-row">${actionsHtml}</div>` : ""}
    </section>`;
}


// =============================================================================
// 一、8 个 canonical direct ViewState 路由的专用 renderer
// =============================================================================

// 1. import-permission-denied —— 权限拒绝页
//    阶段：selecting（入口被权限阻断）
//    动作：前往系统设置 / 重试选择 / 返回书架
function importPermissionDeniedScreen(data, appState) {
  const phase = "selecting";
  const permission = appState?.importPermission || "storage";
  const reason = appState?.importPermissionReason || "系统未授予存储访问权限，无法读取本地书籍文件。";
  const extraHtml = `
    <section class="fd-import-permission-detail" aria-label="权限说明">
      <article><small>所需权限</small><strong>${esc(permission === "storage" ? "存储访问" : "文件访问")}</strong></article>
      <article><small>触发场景</small><strong>本地书导入 · 选择文件阶段</strong></article>
      <article><small>影响范围</small><strong>无法读取或写入本地书籍文件</strong></article>
    </section>`;
  const actionsHtml = `
    <button type="button" data-action="open-system-settings">前往系统设置</button>
    <button type="button" data-route="local-import">重新选择</button>
    <button type="button" data-route="bookshelf">返回书架</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-permission-denied", phase, "lock", "导入权限被拒绝", reason, extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "导入权限被拒绝",
    ariaLabel: "导入权限被拒绝",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 2. import-format-unsupported —— 格式不支持页
//    阶段：input/parsing（格式识别失败）
//    动作：尝试转换 / 重新选择 / 取消
function importFormatUnsupportedScreen(data, appState) {
  const phase = "input";
  const fileName = appState?.importFileName || "未知文件";
  const fileFormat = appState?.importFileFormat || "未知格式";
  const supported = ["EPUB", "TXT", "MOBI", "AZW3", "PDF"];
  const extraHtml = `
    <section class="fd-import-format-detail" aria-label="格式信息">
      <article><small>文件名</small><strong>${esc(fileName)}</strong></article>
      <article><small>检测格式</small><strong>${esc(fileFormat)}</strong></article>
      <article><small>支持格式</small><strong>${supported.join(" · ")}</strong></article>
    </section>
    <p class="fd-import-hint">可尝试使用格式转换工具转换为支持的格式后重新导入。</p>`;
  const actionsHtml = `
    <button type="button" data-action="convert-format">尝试转换</button>
    <button type="button" data-route="local-import">重新选择</button>
    <button type="button" data-route="bookshelf">取消</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-format-unsupported", phase, "file-warning", "文件格式不支持", `当前文件格式（${esc(fileFormat)}）暂不支持导入，请转换为支持的格式。`, extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "格式不支持",
    ariaLabel: "文件格式不支持",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 3. import-empty-file —— 空文件页
//    阶段：parsing（文件内容为空）
//    动作：重新选择 / 返回书架
function importEmptyFileScreen(data, appState) {
  const phase = "parsing";
  const fileName = appState?.importFileName || "未知文件";
  const fileSize = appState?.importFileSize || "0 KB";
  const extraHtml = `
    <section class="fd-import-empty-detail" aria-label="文件信息">
      <article><small>文件名</small><strong>${esc(fileName)}</strong></article>
      <article><small>文件大小</small><strong>${esc(fileSize)}</strong></article>
      <article><small>检测结果</small><strong>文件内容为空或无法读取</strong></article>
    </section>`;
  const actionsHtml = `
    <button type="button" data-route="local-import">重新选择文件</button>
    <button type="button" data-route="bookshelf">返回书架</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-empty-file", phase, "file", "文件为空", "所选文件没有可导入的内容，请确认文件未损坏后重新选择。", extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "空文件",
    ariaLabel: "导入文件为空",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 4. import-parsing —— 解析中页
//    阶段：parsing
//    动作：取消解析 / 后台运行
function importParsingScreen(data, appState) {
  const phase = "parsing";
  const fileName = appState?.importFileName || "雨夜.epub";
  const progress = Math.max(0, Math.min(100, Number(appState?.importParseProgress) || 72));
  const step = appState?.importParseStep || "正在识别章节结构";
  const extraHtml = `
    <section class="fd-import-parsing-detail" aria-label="解析进度">
      <article><small>当前文件</small><strong>${esc(fileName)}</strong></article>
      <article><small>当前步骤</small><strong>${esc(step)}</strong></article>
    </section>
    <div class="fd-import-progress" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="解析进度">
      <div class="fd-import-progress-bar" style="width: ${progress}%"></div>
      <span class="fd-import-progress-text">${progress}%</span>
    </div>`;
  const actionsHtml = `
    <button type="button" data-action="import-cancel">取消解析</button>
    <button type="button" data-route="bookshelf">后台运行</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-parsing", phase, "refresh", "正在解析书籍", "正在解析文件内容、识别章节结构和元数据，请稍候。", extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "解析中",
    ariaLabel: "导入解析中",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 5. import-duplicate —— 重复检测页
//    阶段：preview（重复检测）
//    动作：全部跳过 / 全部覆盖 / 逐项处理 / 取消
function importDuplicateScreen(data, appState) {
  const phase = "preview";
  const duplicates = (appState?.importDuplicates && appState.importDuplicates.length)
    ? appState.importDuplicates
    : [
        { title: "雨夜.epub", meta: "本地已存在 · 同名同作者", size: "1.2 MB" },
        { title: "旧书扫描.txt", meta: "本地已存在 · 同名不同作者", size: "0.8 MB" }
      ];
  const listHtml = duplicates.map((item, index) => `
    <article class="fd-import-duplicate-item" data-duplicate-index="${index}">
      ${icon("copy", "fd-small-icon")}
      <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
      <em>${esc(item.size || "")}</em>
    </article>`).join("");
  const extraHtml = `
    <section class="fd-import-duplicate-list" aria-label="重复项列表">
      <h3>检测到 ${duplicates.length} 个重复项</h3>
      ${listHtml}
    </section>`;
  const actionsHtml = `
    <button type="button" data-action="duplicate-skip-all">全部跳过</button>
    <button type="button" data-action="duplicate-overwrite-all">全部覆盖</button>
    <button type="button" data-action="duplicate-review">逐项处理</button>
    <button type="button" data-route="local-import">取消</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-duplicate", phase, "copy", "检测到重复书籍", "以下书籍在本地书架已存在，请选择处理方式。", extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "重复检测",
    ariaLabel: "导入重复检测",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 6. import-conflict-resolve —— 冲突解决对话框
//    阶段：conflict
//    动作：保留本地 / 覆盖本地 / 保留两份 / 取消（回滚）
function importConflictResolveScreen(data, appState) {
  const phase = "conflict";
  const conflicts = (appState?.importConflicts && appState.importConflicts.length)
    ? appState.importConflicts
    : [
        { field: "书名", local: "雨夜", remote: "雨夜（修订版）" },
        { field: "作者", local: "佚名", remote: "张三" },
        { field: "分组", local: "默认分组", remote: "小说" }
      ];
  const listHtml = conflicts.map((item, index) => `
    <article class="fd-import-conflict-row" data-conflict-index="${index}">
      <small>${esc(item.field)}</small>
      <div class="fd-import-conflict-values">
        <span class="fd-import-conflict-local"><strong>本地</strong>${esc(item.local)}</span>
        <span class="fd-import-conflict-remote"><strong>导入</strong>${esc(item.remote)}</span>
      </div>
    </article>`).join("");
  const extraHtml = `
    <section class="fd-import-conflict-list" aria-label="冲突详情">
      <h3>字段冲突</h3>
      ${listHtml}
    </section>
    <p class="fd-import-hint">选择解决方案后将进入应用阶段，可通过回滚撤销本次导入。</p>`;
  const actionsHtml = `
    <button type="button" data-action="conflict-keep-local">保留本地</button>
    <button type="button" data-action="conflict-overwrite">覆盖本地</button>
    <button type="button" data-action="conflict-keep-both">保留两份</button>
    <button type="button" data-action="import-rollback">取消并回滚</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-conflict-resolve", phase, "warning", "解决导入冲突", "导入数据与本地记录存在冲突，请逐项选择处理方式。", extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "解决冲突",
    ariaLabel: "导入冲突解决",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 7. import-partial-success —— 部分成功结果页
//    阶段：result（部分成功）
//    动作：重试失败项 / 查看详情 / 完成
function importPartialSuccessScreen(data, appState) {
  const phase = "result";
  const results = (appState?.importPartialResults && appState.importPartialResults.length)
    ? appState.importPartialResults
    : [
        { title: "雨夜.epub", status: "成功", tone: "good" },
        { title: "旧书扫描.txt", status: "失败 · 编码异常", tone: "danger" },
        { title: "缺失章节.mobi", status: "失败 · 格式不支持", tone: "danger" }
      ];
  const successCount = results.filter((item) => item.tone === "good").length;
  const failCount = results.length - successCount;
  const listHtml = results.map((item) => `
    <article class="fd-import-result-item is-${esc(item.tone)}">
      ${icon(item.tone === "danger" ? "warning" : "check", "fd-small-icon")}
      <span><strong>${esc(item.title)}</strong></span>
      <em>${esc(item.status)}</em>
    </article>`).join("");
  const extraHtml = `
    <section class="fd-import-partial-summary" aria-label="导入结果摘要">
      <article><small>成功</small><strong class="is-good">${successCount} 项</strong></article>
      <article><small>失败</small><strong class="is-danger">${failCount} 项</strong></article>
      <article><small>总计</small><strong>${results.length} 项</strong></article>
    </section>
    <section class="fd-import-result-list" aria-label="结果明细">${listHtml}</section>`;
  const actionsHtml = `
    <button type="button" data-action="import-retry-failed">重试失败项</button>
    <button type="button" data-route="import-result-detail">查看详情</button>
    <button type="button" data-route="bookshelf">完成</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-partial-success", phase, "check-partial", "部分导入成功", `本次导入共 ${results.length} 项，其中 ${successCount} 项成功、${failCount} 项失败，可重试失败项或查看详情。`, extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "部分导入成功",
    ariaLabel: "导入部分成功",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 8. import-result-detail —— 导入结果详情页
//    阶段：result
//    动作：导出报告 / 返回书架 / 继续导入
function importResultDetailScreen(data, appState) {
  const phase = "result";
  const results = (appState?.importFullResults && appState.importFullResults.length)
    ? appState.importFullResults
    : [
        { title: "雨夜.epub", status: "成功", meta: "作者已识别 · 加入默认分组", tone: "good" },
        { title: "旧书扫描.txt", status: "成功", meta: "编码 UTF-8 · 章节识别完成", tone: "good" },
        { title: "缺失章节.mobi", status: "失败", meta: "格式不支持 · 已跳过", tone: "danger" }
      ];
  const listHtml = results.map((item) => `
    <article class="fd-import-result-item is-${esc(item.tone)}">
      ${icon(item.tone === "danger" ? "warning" : "book-open", "fd-small-icon")}
      <span><strong>${esc(item.title)}</strong><small>${esc(item.meta)}</small></span>
      <em>${esc(item.status)}</em>
    </article>`).join("");
  const extraHtml = `
    <section class="fd-import-result-detail-summary" aria-label="结果统计">
      <article><small>导入时间</small><strong>${esc(appState?.importTimestamp || "刚刚")}</strong></article>
      <article><small>来源</small><strong>${esc(appState?.importSource || "本地文件")}</strong></article>
      <article><small>分组</small><strong>${esc(appState?.importGroup || "默认分组")}</strong></article>
    </section>
    <section class="fd-import-result-list" aria-label="完整结果">${listHtml}</section>`;
  const actionsHtml = `
    <button type="button" data-action="export-report">导出报告</button>
    <button type="button" data-route="local-import">继续导入</button>
    <button type="button" data-route="bookshelf">返回书架</button>`;
  const contentHtml = `
    ${w1ImportPhaseBreadcrumb(phase)}
    ${w1ImportStateCard("import-result-detail", phase, "info", "导入结果详情", "以下是本次导入的完整结果，可导出报告或继续导入其他书籍。", extraHtml, actionsHtml)}`;
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "导入结果详情",
    ariaLabel: "导入结果详情",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// =============================================================================
// 二、7 个已审计路由的状态变体增强（V2 函数）
// -----------------------------------------------------------------------------
// 策略：读取 appState 中的状态标志（importLoading/importError/importOffline/
//       importEmpty 等），渲染 loading/empty/error/offline 状态变体；
//       默认状态委托给现有 renderer（rssSourceImportScreen / localImportScreen 等）。
// =============================================================================

// 辅助：导入状态错误/离线卡片（用于 V2 函数的变体）
function w1ImportVariantCard(route, variant, iconName, title, summary, actionsHtml) {
  return `
    <section class="fd-import-state fd-import-variant is-${esc(variant)}" data-route="${esc(route)}" data-variant="${esc(variant)}">
      <span class="fd-state-icon">${icon(iconName, "fd-medium-icon")}</span>
      <h2>${esc(title)}</h2>
      <p>${esc(summary)}</p>
      ${actionsHtml ? `<div class="fd-action-row">${actionsHtml}</div>` : ""}
    </section>`;
}


// 1. rss-source-import V2 —— RSS 源导入状态变体
//    loading：拉取订阅源列表中
//    empty：无可导入的订阅源
//    error：拉取失败
//    offline：离线无法拉取
function rssSourceImportScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importOffline ? "offline"
    : appState?.importError ? "error"
    : appState?.importEmpty ? "empty"
    : "";
  if (!variant) {
    return rssSourceImportScreen(data, appState);
  }
  const states = {
    loading: ["refresh", "正在拉取订阅源", "正在从远程地址拉取订阅源列表，请稍候。"],
    empty: ["info", "无可导入的订阅源", "当前地址没有解析到可导入的订阅源，请确认地址或更换来源。"],
    error: ["warning", "拉取订阅源失败", "订阅源列表拉取失败，可能是地址无效或规则解析异常，可重试或手动管理。"],
    offline: ["offline", "离线无法拉取", "当前网络不可用，无法拉取远程订阅源列表，可在恢复网络后重试。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="rss-source-import">${variant === "loading" ? "取消" : "重试"}</button>
    <button type="button" data-route="rss-subscription-management">手动管理</button>`;
  const contentHtml = w1ImportVariantCard("rss-source-import", variant, iconName, title, summary, actionsHtml);
  return rssLibraryScreen(data, "导入订阅源", contentHtml, "", appState);
}


// 2. rss-source-import-detail V2 —— RSS 源导入详情状态变体
//    loading：加载详情中
//    error：详情加载失败
function rssSourceImportDetailScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importError ? "error"
    : "";
  if (!variant) {
    return rssSourceImportDetailScreen(data, appState);
  }
  const states = {
    loading: ["refresh", "正在加载导入详情", "正在解析订阅源变更摘要和冲突处理策略，请稍候。"],
    error: ["warning", "详情加载失败", "导入详情解析失败，可返回重新发起导入或查看订阅源管理。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="rss-source-import">${variant === "loading" ? "取消" : "重试"}</button>
    <button type="button" data-route="rss-source-import">返回</button>`;
  const contentHtml = w1ImportVariantCard("rss-source-import-detail", variant, iconName, title, summary, actionsHtml);
  return rssLibraryScreen(data, "导入详情", contentHtml, "", appState);
}


// 3. rss-source-import-result V2 —— RSS 源导入结果状态变体
//    error：导入过程失败（覆盖默认成功确认页）
//    retry：部分失败可重试
function rssSourceImportResultScreenV2(data, appState) {
  const variant = appState?.importError ? "error"
    : appState?.importRetryable ? "retry"
    : "";
  if (!variant) {
    return rssConfirmScreen(data, {
      title: "导入完成",
      icon: "check",
      heading: "已导入 2 个订阅源",
      copy: "新增源已加入 RSS 订阅管理，冲突源保留本地名称、分组和启用状态。",
      detail: "需要登录的源不会自动导入 Cookie。",
      cancelLabel: "继续导入",
      cancelRoute: "rss-source-import",
      confirmRoute: "rss-subscription-management",
      confirmLabel: "完成"
    }, appState);
  }
  const states = {
    error: ["warning", "导入失败", "订阅源导入过程失败，已回滚未完成的变更，可重试或查看管理列表。"],
    retry: ["refresh", "部分导入失败", "部分订阅源导入失败，可重试失败项或先完成已成功的导入。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="rss-source-import">${variant === "error" ? "重试导入" : "重试失败项"}</button>
    <button type="button" data-route="rss-subscription-management">查看管理</button>`;
  const contentHtml = w1ImportVariantCard("rss-source-import-result", variant, iconName, title, summary, actionsHtml);
  return rssLibraryScreen(data, "导入结果", contentHtml, "", appState);
}


// 4. local-import V2 —— 本地书导入状态变体
//    loading：扫描本地文件中
//    empty：未选择文件
//    error：扫描失败
//    offline：本地存储不可用
function localImportScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importOffline ? "offline"
    : appState?.importError ? "error"
    : appState?.importEmpty ? "empty"
    : "";
  if (!variant) {
    return localImportScreen(data);
  }
  const states = {
    loading: ["refresh", "正在扫描本地文件", "正在扫描本地存储中的可导入书籍文件，请稍候。"],
    empty: ["info", "未选择文件", "尚未选择要导入的本地书籍文件，点击下方按钮开始选择。"],
    error: ["warning", "扫描失败", "本地文件扫描失败，可能是存储权限变更或读取异常，可重试或检查权限。"],
    offline: ["offline", "存储不可用", "本地存储当前不可用，无法扫描或读取文件，请确认存储已挂载后重试。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="local-import">${variant === "loading" ? "取消" : variant === "empty" ? "选择文件" : "重试"}</button>
    <button type="button" data-route="bookshelf">返回书架</button>`;
  const contentHtml = w1ImportVariantCard("local-import", variant, iconName, title, summary, actionsHtml);
  return shellKit().renderLibraryShell(Object.assign(phoneShellClasses("fd-library-phone fd-import-phone"), {
    data,
    title: "本地书导入",
    ariaLabel: "本地书导入",
    topBarClass: "fd-back-bar",
    bottomActionHostClass: "fd-bottom-action-host",
    contentHtml,
    stateHostHtml: mainTabFeedbackHtml(appState)
  }));
}


// 5. source-import-options V2 —— 添加书源状态变体
//    loading：加载导入选项中
//    error：选项加载失败
function sourceImportOptionsScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importError ? "error"
    : "";
  if (!variant) {
    return sourceImportOptionsScreen(data, appState);
  }
  const states = {
    loading: ["refresh", "正在加载导入选项", "正在准备网络导入、本地导入和剪贴板导入入口，请稍候。"],
    error: ["warning", "加载失败", "导入选项加载失败，可重试或返回书源管理。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="source-import-options">${variant === "loading" ? "取消" : "重试"}</button>
    <button type="button" data-route="source-management">返回书源管理</button>`;
  const contentHtml = w1ImportVariantCard("source-import-options", variant, iconName, title, summary, actionsHtml);
  return sourceShell(data, "添加书源", contentHtml, {});
}


// 6. source-add V2 —— 新增书源状态变体
//    loading：初始化新建表单中
//    error：初始化失败
//    说明：source-add 在现有 switch 中与 source-import-options 共用 renderer，
//          V2 提供独立入口，可单独接入 loading/error 变体。
function sourceAddScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importError ? "error"
    : "";
  if (!variant) {
    return sourceImportOptionsScreen(data, appState);
  }
  const states = {
    loading: ["refresh", "正在准备新建书源", "正在初始化空白书源编辑表单和默认规则模板，请稍候。"],
    error: ["warning", "初始化失败", "新建书源表单初始化失败，可重试或返回书源管理。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="source-add">${variant === "loading" ? "取消" : "重试"}</button>
    <button type="button" data-route="source-management">返回书源管理</button>`;
  const contentHtml = w1ImportVariantCard("source-add", variant, iconName, title, summary, actionsHtml);
  return sourceShell(data, "新增书源", contentHtml, {});
}


// 7. source-import-preview V2 —— 导入书源预览状态变体
//    loading：解析书源包中
//    empty：书源包无有效书源
//    error：解析失败
//    offline：离线无法拉取
function sourceImportPreviewScreenV2(data, appState) {
  const variant = appState?.importLoading ? "loading"
    : appState?.importOffline ? "offline"
    : appState?.importError ? "error"
    : appState?.importEmpty ? "empty"
    : "";
  if (!variant) {
    return sourceImportPreviewScreen(data);
  }
  const states = {
    loading: ["refresh", "正在解析书源包", "正在解析书源包内容、检测重复和异常源，请稍候。"],
    empty: ["info", "书源包为空", "当前书源包没有解析到有效书源，请确认来源或更换书源包。"],
    error: ["warning", "解析失败", "书源包解析失败，可能是格式错误或规则不兼容，可重试或手动新建。"],
    offline: ["offline", "离线无法拉取", "网络不可用，无法拉取远程书源包，可在恢复网络后重试。"]
  };
  const [iconName, title, summary] = states[variant];
  const actionsHtml = `
    <button type="button" data-route="source-import-preview">${variant === "loading" ? "取消" : "重试"}</button>
    <button type="button" data-route="source-import-options">更换来源</button>
    <button type="button" data-route="source-management">返回管理</button>`;
  const contentHtml = w1ImportVariantCard("source-import-preview", variant, iconName, title, summary, actionsHtml);
  return sourceShell(data, "导入书源", contentHtml, {
    bottomActionHtml: sourceBottomActions([
      { label: "取消", route: "source-management" },
      { label: variant === "loading" ? "解析中" : "重试", route: "source-import-preview" }
    ])
  });
}


// =============================================================================
// 三、集成映射
// -----------------------------------------------------------------------------
// 将以下 case 添加到 render-runtime.js 的 renderRoute switch（约 8509-8555 行
// 现有 import/source 相关 case 附近）。V2 函数可直接替换现有 case 的返回值，
// 由 appState 状态标志决定是否进入变体分支。
// =============================================================================

// INTEGRATION_MAP:
//
// --- 8 个 R16B direct 路由（render-runtime.js 已接入）---
// case "import-permission-denied":
//   return importPermissionDeniedScreen(data, appState);
// case "import-format-unsupported":
//   return importFormatUnsupportedScreen(data, appState);
// case "import-empty-file":
//   return importEmptyFileScreen(data, appState);
// case "import-parsing":
//   return importParsingScreen(data, appState);
// case "import-duplicate":
//   return importDuplicateScreen(data, appState);
// case "import-conflict-resolve":
//   return importConflictResolveScreen(data, appState);
// case "import-partial-success":
//   return importPartialSuccessScreen(data, appState);
// case "import-result-detail":
//   return importResultDetailScreen(data, appState);
//
// --- 7 个已审计路由（用 V2 替换现有 case 返回值）---
// case "rss-source-import":
//   return rssSourceImportScreenV2(data, appState);
// case "rss-source-import-detail":
//   return rssSourceImportDetailScreenV2(data, appState);
// case "rss-source-import-result":
//   return rssSourceImportResultScreenV2(data, appState);
// case "local-import":
//   return localImportScreenV2(data, appState);
// case "source-import-options":
//   return sourceImportOptionsScreenV2(data, appState);
// case "source-add":
//   return sourceAddScreenV2(data, appState);
// case "source-import-preview":
//   return sourceImportPreviewScreenV2(data, appState);
//
// --- routeId → functionName 完整映射 ---
// import-permission-denied    → importPermissionDeniedScreen
// import-format-unsupported   → importFormatUnsupportedScreen
// import-empty-file           → importEmptyFileScreen
// import-parsing              → importParsingScreen
// import-duplicate            → importDuplicateScreen
// import-conflict-resolve     → importConflictResolveScreen
// import-partial-success      → importPartialSuccessScreen
// import-result-detail        → importResultDetailScreen
// rss-source-import           → rssSourceImportScreenV2
// rss-source-import-detail    → rssSourceImportDetailScreenV2
// rss-source-import-result    → rssSourceImportResultScreenV2
// local-import                → localImportScreenV2
// source-import-options       → sourceImportOptionsScreenV2
// source-add                  → sourceAddScreenV2
// source-import-preview       → sourceImportPreviewScreenV2


// =============================================================================
// 四、route-contract.js 已同步条目
// -----------------------------------------------------------------------------
// 以下 8 个条目是 route-contract.js、route fixture、ViewState fixture 与本 renderer
// 共同发布的 canonical R16B 真源；保留文本映射用于 demo consistency 校验。
// =============================================================================

// ROUTE_CONTRACT_ENTRIES:
//
// "import-permission-denied": { title: "导入权限被拒绝（Import Permission Denied）", shell: "LibraryShell" },
// "import-format-unsupported": { title: "格式不支持（Import Format Unsupported）", shell: "LibraryShell" },
// "import-empty-file": { title: "空文件（Import Empty File）", shell: "LibraryShell" },
// "import-parsing": { title: "解析中（Import Parsing）", shell: "LibraryShell" },
// "import-duplicate": { title: "重复检测（Import Duplicate）", shell: "LibraryShell" },
// "import-conflict-resolve": { title: "冲突解决（Import Conflict Resolve）", shell: "LibraryShell" },
// "import-partial-success": { title: "部分导入成功（Import Partial Success）", shell: "LibraryShell" },
// "import-result-detail": { title: "导入结果详情（Import Result Detail）", shell: "LibraryShell" },
//
// 说明：
// - shell 统一为 LibraryShell，与现有 "local-import" 路由一致（导入为书架库功能域）。
// - title 格式遵循 route-contract.js 现有约定（中文 + 英文括注）。
// - 添加后 routeTitle(route) 将自动返回去掉括注的中文标题。
