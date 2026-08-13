/**
 * Public route-renderer admission boundary
 * --------------------------------------------------------------------------
 * Renderer modules are also exposed on `window` for the runtime, diagnostics
 * and tests.  That public surface must not become a side door around the
 * route-level Figma admission check in render-runtime.js.
 *
 * This file deliberately contains no visual or route ownership decisions.
 * It only verifies that a public renderer is called for one of its declared
 * routes, then delegates the allow/deny decision to
 * ReaderFigmaRouteAdmissionPolicy.  If either layer is absent, it throws
 * before the underlying renderer is invoked.
 */
(function attachReaderPublicRouteRendererAdmission(window) {
  "use strict";

  function routeKey(route) {
    return String(route == null ? "" : route);
  }

  function routeList(value) {
    return Object.freeze(Array.from(new Set((value || []).map(routeKey).filter(Boolean))));
  }

  function routesForRenderer(routeMap, rendererName) {
    return routeList(Object.keys(routeMap || {}).filter(function (route) {
      return routeMap[route] === rendererName;
    }));
  }

  function requirePolicy() {
    var policy = window.ReaderFigmaRouteAdmissionPolicy;
    if (!policy || typeof policy.assertRouteRenderable !== "function") {
      throw new Error(
        "ReaderFigmaRouteAdmissionPolicy is required before a public route renderer can return UI."
      );
    }
    return policy;
  }

  function routeOwnershipError(rendererName, route, allowedRoutes) {
    var suffix = allowedRoutes.length
      ? " Expected one of: " + allowedRoutes.join(", ") + "."
      : " This renderer has no current canonical route binding.";
    return new Error(
      'Public renderer "' + rendererName + '" rejected route "' + routeKey(route) +
      '" (PUBLIC_RENDERER_ROUTE_UNBOUND).' + suffix
    );
  }

  /**
   * Wrap a publicly exposed renderer.  The original function remains private
   * to its module; callers only receive this boundary.  `routeIndex` is the
   * argument position holding the RouteId (0 for dispatchers, 1 for the
   * common `(data, route, appState)` renderer signature).  `fixedRoute` is
   * for a named screen renderer whose route is intrinsic to its API.
   */
  function wrap(rendererName, renderer, options) {
    if (typeof renderer !== "function") {
      throw new TypeError("Public renderer wrapper requires a function: " + rendererName);
    }
    var config = options || {};
    var allowedRoutes = routeList(config.allowedRoutes);
    var routeIndex = Number.isInteger(config.routeIndex) ? config.routeIndex : 1;
    var fixedRoute = config.fixedRoute == null ? "" : routeKey(config.fixedRoute);
    // Route dispatchers are intentionally chained by render-runtime.  An
    // unrelated route must therefore reach a dispatcher's private lookup and
    // return its documented empty/null sentinel, not throw before a later
    // Figma-backed family gets a chance to own the route.  This option is
    // only valid for audited dispatchers whose private implementation returns
    // no HTML before it touches any renderer for an unowned route.
    var passthroughUnowned = config.passthroughUnowned === true;

    return function guardedPublicRouteRenderer() {
      var args = arguments;
      var suppliedRoute = routeIndex < 0 ? "" : routeKey(args[routeIndex]);
      var route = fixedRoute || suppliedRoute;

      // A named renderer must not be relabelled as an unrelated admitted
      // route by adding a spare RouteId argument at its public boundary.
      if (fixedRoute && suppliedRoute && suppliedRoute !== fixedRoute) {
        throw routeOwnershipError(rendererName, suppliedRoute, [fixedRoute]);
      }
      if (!route || allowedRoutes.indexOf(route) < 0) {
        if (passthroughUnowned && !fixedRoute) {
          return renderer.apply(this, args);
        }
        throw routeOwnershipError(rendererName, route, allowedRoutes);
      }

      // This is intentionally immediately before invoking the original
      // renderer.  A missing policy and every unclassified route therefore
      // fail before any local HTML can be produced.
      requirePolicy().assertRouteRenderable(route);
      return renderer.apply(this, args);
    };
  }

  function wrapMapped(rendererName, renderer, routeMap, options) {
    var config = Object.assign({}, options || {}, {
      allowedRoutes: routesForRenderer(routeMap, rendererName)
    });
    return wrap(rendererName, renderer, config);
  }

  function reject(rendererName) {
    return wrap(rendererName, function () { return ""; }, {
      allowedRoutes: [],
      routeIndex: -1
    });
  }

  function guardModule(api, specifications) {
    var guarded = Object.assign({}, api || {});
    var bindings = {};
    Object.keys(specifications || {}).forEach(function (rendererName) {
      var config = specifications[rendererName] || {};
      var allowedRoutes = routeList(config.allowedRoutes);
      bindings[rendererName] = allowedRoutes;
      guarded[rendererName] = wrap(rendererName, guarded[rendererName], Object.assign({}, config, {
        allowedRoutes: allowedRoutes
      }));
    });
    guarded.PUBLIC_ROUTE_RENDERER_BINDINGS = Object.freeze(bindings);
    return guarded;
  }

  window.ReaderPublicRouteRendererAdmission = Object.freeze({
    routeList: routeList,
    routesForRenderer: routesForRenderer,
    wrap: wrap,
    wrapMapped: wrapMapped,
    reject: reject,
    guardModule: guardModule
  });
})(window);
