/**
 * Figma route-admission policy
 * --------------------------------------------------------------------------
 * This is a production-route guard, not a visual renderer.  A RouteId may
 * exist in the executable UI contract before it has an approved Figma page.
 * Such a contract must never be rendered as a locally invented approximation.
 *
 * Default-deny scope:
 *   - only RouteIds with an explicit `exact-figma-binding` record in
 *     FIGMA_VISUAL_ADMISSION_REGISTRY may reach a visual renderer;
 *   - D6 capability-contract pages, generic contractStatic pages and the
 *     historical Source Management subpages retain named denial reasons so
 *     they cannot quietly become exceptions;
 *   - a route added to the executable contract is blocked until a Figma
 *     master, page/node identity and classification are recorded first.
 *
 * To re-enable a route, do not remove it casually.  First land a current
 * Figma node/revision/design-delta binding and replace the local generic
 * renderer with the approved visual implementation; then update this policy
 * in the same reviewed change.
 */
(function attachReaderFigmaRouteAdmissionPolicy(window) {
  "use strict";

  // Generated deliberately as a reviewed mirror of every `routeIds` member
  // with classification=exact-figma-binding in
  // docs/design/FIGMA_VISUAL_ADMISSION_REGISTRY.json.  The verification test
  // compares this set to the registry; never add a route here by itself.
  var EXACT_FIGMA_ADMITTED_ROUTE_IDS = Object.freeze([
    "auto-page",
    "book-detail",
    "book-detail-toc-preview",
    "book-directory",
    "book-search",
    "bookshelf",
    "bookshelf-cover-mode",
    "bookshelf-empty",
    "bookshelf-list-mode",
    "content-replacement",
    "discover",
    "discover-control",
    "discover-entry-bestseller",
    "discover-entry-booklist",
    "discover-entry-category",
    "discover-entry-finished",
    "discover-entry-latest",
    "discover-entry-new",
    "discover-entry-ranking",
    "discover-entry-source",
    "discover-home",
    "discover-sort",
    "immersive-reading",
    "reader",
    "reader-full-appearance",
    "reader-full-directory",
    "reader-full-settings",
    "reader-full-tts",
    "reader_content",
    "restore-confirm",
    "restore-result",
    "restore-running",
    "rss",
    "search-empty",
    "search-error",
    "search-home",
    "search-loading",
    "search-results",
    "settings-general",
    "source-management",
    "source-switch",
    "sync-backup",
    "webdav-config"
  ]);

  var D6_CAPABILITY_CONTRACT_ROUTES = Object.freeze([
    "onboarding-welcome",
    "onboarding-capability-setup",
    "permission-recovery",
    "local-format-support",
    "pdf-reader",
    "manga-reader",
    "http-tts-management",
    "http-tts-editor",
    "http-tts-test",
    "content-edit",
    "book-cover-change",
    "book-cover-search",
    "chapter-reviews",
    "bookmarks-manager",
    "download-queue",
    "download-task-detail",
    "storage-management",
    "webview-login",
    "webview-captcha",
    "webview-challenge",
    "webview-cookie-return",
    "settings-tts",
    "settings-storage",
    "settings-accessibility"
  ]);

  var GENERIC_CONTRACT_STATIC_ROUTES = Object.freeze([
    "global-loading",
    "global-empty",
    "global-error",
    "offline-state",
    "permission-required",
    "state-error",
    "state-offline",
    "sync-error"
  ]);

  // Source Management's current final master is the only admitted route in
  // this family.  These secondary routes still point at locally authored
  // historical/Pilot renderers; F0 records currentBindings: [] for them.
  var SOURCE_MANAGEMENT_UNBOUND_ROUTES = Object.freeze([
    "source-settings-entry",
    "source-import-options",
    "source-add",
    "source-import-preview",
    "source-batch",
    "source-groups",
    "source-detail",
    "source-detect",
    "source-test-result",
    "source-rule-edit",
    "source-edit",
    "source-debug",
    "source-debug-running",
    "source-debug-result",
    "source-debug-search-result",
    "source-debug-detail-result",
    "source-debug-catalog-result",
    "source-debug-content-log",
    "source-edit-debug",
    "source-logs",
    "source-code-view",
    "source-delete-confirm",
    // This D2-only legacy entry has no RouteId contract and must never fall
    // back to its source-settings-entry approximation either.
    "source-import-export"
  ]);

  // This list is a reviewed mirror of the `routeIds` union of the nine
  // `classification=retired` records in
  // FIGMA_VISUAL_ADMISSION_REGISTRY.json.  Default denial would also reject
  // these RouteIds today, but that is not sufficient retirement governance:
  // an accidental future allowlist edit must not silently revive a surface
  // the user explicitly withdrew.  Keep the named reason ahead of the
  // generic fallback and prove the mirror in the verification test.
  var RETIRED_FIGMA_ROUTE_IDS = Object.freeze([
    "about",
    "about-feedback",
    "about-version",
    "book-batch-management",
    "bookshelf-book-more-menu",
    "bookshelf-group-management",
    "group-management",
    "import-conflict-resolve",
    "import-duplicate",
    "import-empty-file",
    "import-format-unsupported",
    "import-parsing",
    "import-partial-success",
    "import-permission-denied",
    "import-result-detail",
    "local-import",
    "restore-preview",
    "source-switch-empty",
    "source-switch-error",
    "source-switch-loading",
    "source-switch-preview",
    "source-switch-results",
    "source-switch-rollback",
    "source-switch-timeout"
  ]);

  // The remaining retired registry records are not independent RouteIds.
  // Their production renderers retain explicit sanitizers (the final Source
  // Management list and the five-chip Search history); recording their IDs
  // here lets the source-level verification prove they remain retired without
  // creating fictional routes or overlays.
  var RETIRED_FIGMA_COMPONENT_STATE_IDS = Object.freeze([
    "source-management.historical-pilot",
    "search.history-expanded"
  ]);

  // Compact/fold were explicitly removed as visual variants.  This is a
  // policy identifier, not a runtime viewport class: the renderer aliases
  // landscape to Tablet and narrow portrait to Phone.
  var RETIRED_FIGMA_VIEWPORT_POLICY_IDS = Object.freeze([
    "compact-and-fold.viewport-policy"
  ]);

  function freezeReasons(routes, reason) {
    return routes.reduce(function (result, route) {
      result[route] = reason;
      return result;
    }, {});
  }

  var BLOCKED_ROUTE_REASONS = Object.freeze(Object.assign(
    {},
    freezeReasons(D6_CAPABILITY_CONTRACT_ROUTES, {
      code: "D6_CONTRACT_ONLY_NO_FIGMA_VISUAL",
      message: "D6 capability contract has no current Figma-backed visual route"
    }),
    freezeReasons(GENERIC_CONTRACT_STATIC_ROUTES, {
      code: "GENERIC_CONTRACT_STATIC_NO_FIGMA_VISUAL",
      message: "generic contractStatic fallback cannot stand in for a Figma page"
    }),
    freezeReasons(SOURCE_MANAGEMENT_UNBOUND_ROUTES, {
      code: "SOURCE_MANAGEMENT_SUBPAGE_UNBOUND",
      message: "Source Management secondary route has no current Figma binding"
    }),
    freezeReasons(RETIRED_FIGMA_ROUTE_IDS, {
      code: "RETIRED_FIGMA_VISUAL",
      message: "route belongs to an explicitly withdrawn Figma visual; no local replacement may render"
    })
  ));

  function routeKey(route) {
    return String(route == null ? "" : route);
  }

  function blockedReason(route) {
    var key = routeKey(route);
    var explicitlyBlocked = BLOCKED_ROUTE_REASONS[key];
    if (explicitlyBlocked) return explicitlyBlocked;
    if (EXACT_FIGMA_ADMITTED_ROUTE_IDS.indexOf(key) >= 0) return null;
    return {
      code: "UNCLASSIFIED_ROUTE_NO_FIGMA_VISUAL",
      message: "route has no exact Figma visual-admission classification"
    };
  }

  function isRouteRenderable(route) {
    return !blockedReason(route);
  }

  function isRetiredVisualState(visualStateId) {
    return RETIRED_FIGMA_COMPONENT_STATE_IDS.indexOf(routeKey(visualStateId)) >= 0;
  }

  function isRetiredViewportPolicy(viewportPolicyId) {
    return RETIRED_FIGMA_VIEWPORT_POLICY_IDS.indexOf(routeKey(viewportPolicyId)) >= 0;
  }

  function admissionError(route, reason) {
    return new Error(
      'Route "' + routeKey(route) + '" is FROZEN (' + reason.code + "): " + reason.message +
      ". Do not render a local approximation; require an approved Figma node/revision/design delta first."
    );
  }

  function assertRouteRenderable(route) {
    var reason = blockedReason(route);
    if (reason) throw admissionError(route, reason);
    return true;
  }

  // contractStaticRouteScreen is intentionally prohibited even for a route
  // that becomes admitted elsewhere.  The caller must use that route's
  // Figma-backed renderer rather than reuse the generic information card.
  function assertContractStaticSurfaceNotAllowed(route) {
    throw new Error(
      'Route "' + routeKey(route) +
      '" is FROZEN (GENERIC_CONTRACT_STATIC_RENDERER). contractStaticRouteScreen is contract-only and cannot render a production surface without a dedicated Figma-backed renderer.'
    );
  }

  // D6 pages are contract records.  Keeping this separate from the generic
  // route check makes a missing policy script fail closed as well as proving
  // that the D6 renderer itself cannot become an accidental visual fallback.
  function assertD6VisualRouteNotAllowed(route) {
    var reason = blockedReason(route);
    if (!reason || reason.code !== "D6_CONTRACT_ONLY_NO_FIGMA_VISUAL") {
      throw new Error(
        'Route "' + routeKey(route) +
        '" has no registered D6 Figma visual admission. D6 contract markup must not be used as a production renderer.'
      );
    }
    throw admissionError(route, reason);
  }

  window.ReaderFigmaRouteAdmissionPolicy = Object.freeze({
    EXACT_FIGMA_ADMITTED_ROUTE_IDS: EXACT_FIGMA_ADMITTED_ROUTE_IDS,
    D6_CAPABILITY_CONTRACT_ROUTES: D6_CAPABILITY_CONTRACT_ROUTES,
    GENERIC_CONTRACT_STATIC_ROUTES: GENERIC_CONTRACT_STATIC_ROUTES,
    SOURCE_MANAGEMENT_UNBOUND_ROUTES: SOURCE_MANAGEMENT_UNBOUND_ROUTES,
    RETIRED_FIGMA_ROUTE_IDS: RETIRED_FIGMA_ROUTE_IDS,
    RETIRED_FIGMA_COMPONENT_STATE_IDS: RETIRED_FIGMA_COMPONENT_STATE_IDS,
    RETIRED_FIGMA_VIEWPORT_POLICY_IDS: RETIRED_FIGMA_VIEWPORT_POLICY_IDS,
    BLOCKED_ROUTE_REASONS: BLOCKED_ROUTE_REASONS,
    blockedReason: blockedReason,
    isRouteRenderable: isRouteRenderable,
    isRetiredVisualState: isRetiredVisualState,
    isRetiredViewportPolicy: isRetiredViewportPolicy,
    assertRouteRenderable: assertRouteRenderable,
    assertContractStaticSurfaceNotAllowed: assertContractStaticSurfaceNotAllowed,
    assertD6VisualRouteNotAllowed: assertD6VisualRouteNotAllowed
  });
})(window);
