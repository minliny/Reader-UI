# Reader-UI Demo 路由缺口矩阵

> 生成日期: 2026-07-11
> 源文件: ROUTE_GAP_MATRIX.json

## 总览统计

| 指标 | 数量 |
|---|---|
| 总路由数 | 200 |
| 已审计路由 | 198 |
| 未审计路由 | 2 |

### 按渲染器类型

| 类型 | 数量 |
|---|---|
| real-product | 79 |
| state-variant | 52 |
| shared-screen | 48 |
| static-contract | 13 |
| scaffold | 8 |

### 按工作流/业务域

| 工作流 | 数量 |
|---|---|
| rss | 50 |
| settings | 42 |
| discover | 41 |
| bookshelf | 17 |
| W2-reading | 11 |
| reader-control | 11 |
| system-state | 10 |
| W1-import | 7 |
| W4-theme-font | 7 |
| W5-replace-rules | 2 |
| W3-source-switch | 2 |

## D1-D5 工作优先级清单

| 优先级 | 阶段 | 任务 | 路由数 | 缺口数 |
|---|---|---|---|---|
| 1 | D1-W1 | 导入流程补全 | 6 | 50 |
| 2 | D1-W4 | 自定义字体/主题/排版流程（最明确的产品缺口） | 7 | 56 |
| 3 | D1-W5 | 替换规则 CRUD | 2 | 15 |
| 4 | D1-W2 | 阅读链补全 | 10 | 72 |
| 5 | D1-W3 | 换源流程补全 | 2 | 18 |
| 6 | D2 | 书架产品化 | 17 | 79 |
| 7 | D2 | 发现产品化 | 41 | 128 |
| 8 | D2 | RSS 产品化 | 50 | 195 |
| 9 | D2 | 设置与同步产品化 | 42 | 173 |
| 10 | D4 | 视觉、美化与默认配置 | 0 | 0 |
| 11 | D5 | 动作与动效闭环 | 0 | 0 |

## 按工作流分组的路由清单

### W1-import (7 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| rss-source-import | real-product | 12 |
| rss-source-import-detail | real-product | 7 |
| rss-source-import-result | real-product | 6 |
| local-import | real-product | 13 |
| source-import-options | real-product | 8 |
| source-add | shared-screen | 1 |
| source-import-preview | real-product | 9 |

### W2-reading (11 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| book-directory | real-product | 1 |
| immersive-reading | real-product | 14 |
| reader_content | shared-screen | 4 |
| reader | shared-screen | 11 |
| toc-bookmarks | shared-screen | 10 |
| reader-night-state-v2 | shared-screen | 5 |
| content-search | shared-screen | 8 |
| reader-search-overlay-v2 | shared-screen | 3 |
| reader-full-directory | shared-screen | 9 |
| reader-book-cache | real-product | 7 |
| reader-debug-info | shared-screen | 7 |

### W3-source-switch (2 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| source-switch | real-product | 13 |
| source-switch-results | shared-screen | 7 |

### W4-theme-font (7 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| reader-appearance | shared-screen | 9 |
| reader-appearance-overlay-v2 | shared-screen | 3 |
| reader-full-appearance | scaffold | 9 |
| reader-full-font | scaffold | 11 |
| reader-full-theme | scaffold | 10 |
| reader-full-theme-edit | scaffold | 11 |
| reader-full-layout | scaffold | 9 |

### W5-replace-rules (2 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| content-replacement | scaffold | 13 |
| reader-replace-overlay-v2 | scaffold | 4 |

### bookshelf (17 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| bookshelf | real-product | 15 |
| bookshelf-cover-mode | state-variant | 4 |
| bookshelf-list-mode | state-variant | 4 |
| bookshelf-book-more-menu | static-contract | 6 |
| book-search | real-product | 6 |
| search-home | state-variant | 5 |
| search-results | state-variant | 6 |
| search-loading | static-contract | 4 |
| search-empty | static-contract | 4 |
| search-error | static-contract | 5 |
| book-detail | real-product | 7 |
| book-detail-toc-preview | shared-screen | 5 |
| bookshelf-empty | real-product | 4 |
| book-batch-management | real-product | 7 |
| sort-filter | real-product | 5 |
| group-management | real-product | 7 |
| bookshelf-group-management | shared-screen | 4 |

### discover (41 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| discover | real-product | 15 |
| discover-home | state-variant | 4 |
| discover-control | state-variant | 4 |
| discover-sort | state-variant | 3 |
| discover-entry-ranking | state-variant | 3 |
| discover-entry-bestseller | state-variant | 2 |
| discover-entry-category | state-variant | 3 |
| discover-entry-source | state-variant | 3 |
| discover-entry-finished | state-variant | 2 |
| discover-entry-latest | state-variant | 2 |
| discover-entry-new | state-variant | 2 |
| discover-entry-booklist | state-variant | 2 |
| discover-filter-keyword | state-variant | 2 |
| discover-filter-male | state-variant | 2 |
| discover-filter-female | state-variant | 2 |
| discover-filter-source-type | state-variant | 2 |
| discover-filter-category | state-variant | 2 |
| discover-sort-popularity | state-variant | 2 |
| discover-sort-update | state-variant | 2 |
| discover-sort-collection | state-variant | 2 |
| discover-sort-finished | state-variant | 2 |
| discover-sort-words | state-variant | 2 |
| discover-no-results | state-variant | 5 |
| discover-loading | state-variant | 3 |
| discover-refreshing | state-variant | 3 |
| discover-infinite-loading | state-variant | 4 |
| discover-page-two | state-variant | 3 |
| discover-cache-empty | state-variant | 3 |
| discover-cache-stale | state-variant | 4 |
| discover-cache-fresh | state-variant | 3 |
| discover-cache-confirm | state-variant | 3 |
| discover-cache-toast | state-variant | 3 |
| discover-login-return | state-variant | 4 |
| discover-switching-source | state-variant | 4 |
| discover-switched-source | state-variant | 4 |
| discover-entry-error | state-variant | 5 |
| discover-empty | state-variant | 3 |
| discover-error | state-variant | 5 |
| discover-source-login | real-product | 5 |
| discover-rule-test | real-product | 5 |
| discover-source-bulk | real-product | 5 |

### reader-control (11 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| control-layer-base-v2 | shared-screen | 4 |
| reader-directory-overlay-v2 | shared-screen | 4 |
| tts | shared-screen | 6 |
| reader-tts-overlay-v2 | shared-screen | 4 |
| reader-settings | shared-screen | 4 |
| reader-settings-overlay-v2 | shared-screen | 3 |
| auto-page | shared-screen | 5 |
| reader-auto-scroll-overlay-v2 | shared-screen | 3 |
| reader-full-tts | shared-screen | 5 |
| reader-full-settings | shared-screen | 5 |
| reader-full-page-turn | shared-screen | 5 |

### rss (50 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| rss | real-product | 7 |
| rss-all | state-variant | 4 |
| rss-source-feed | state-variant | 4 |
| rss-source-category-releases | state-variant | 3 |
| rss-source-category-issues | state-variant | 3 |
| rss-source-category-discussions | state-variant | 3 |
| rss-source-category-novel | state-variant | 3 |
| rss-source-category-tech | state-variant | 3 |
| rss-source-category-booklist | state-variant | 3 |
| rss-refreshing | state-variant | 4 |
| rss-starred | real-product | 5 |
| rss-detail | real-product | 7 |
| rss-original | scaffold | 6 |
| rss-original-browser | real-product | 4 |
| rss-search | real-product | 6 |
| rss-subscription-management | real-product | 7 |
| rss-source-actions | real-product | 4 |
| rss-source-edit | real-product | 5 |
| rss-source-add | shared-screen | 4 |
| rss-source-delete-confirm | real-product | 3 |
| rss-source-debug | real-product | 4 |
| rss-source-vars | real-product | 4 |
| rss-source-login | real-product | 5 |
| rss-source-login-web | real-product | 6 |
| rss-source-login-cookie | real-product | 4 |
| rss-source-login-clear | real-product | 3 |
| rss-source-groups | real-product | 7 |
| rss-source-group-edit | real-product | 4 |
| rss-source-batch | real-product | 6 |
| rss-source-export | real-product | 4 |
| rss-source-export-detail | real-product | 3 |
| rss-source-export-result | real-product | 3 |
| rss-source-pin | real-product | 3 |
| rss-source-disable | real-product | 3 |
| rss-source-batch-disable | real-product | 3 |
| rss-read-record | real-product | 6 |
| rss-record-clear | real-product | 3 |
| rss-rule-subscription | real-product | 6 |
| rss-rule-subscription-detail | real-product | 4 |
| rss-rule-subscription-edit | real-product | 4 |
| rss-rule-subscription-create | shared-screen | 4 |
| rss-rule-subscription-test | real-product | 4 |
| rss-rule-subscription-apply | real-product | 4 |
| rss-favorite-groups | real-product | 4 |
| rss-favorite-add | real-product | 3 |
| rss-favorite-remove | real-product | 3 |
| rss-favorite-group-edit | real-product | 4 |
| rss-favorite-clear | real-product | 3 |
| rss-empty | state-variant | 3 |
| rss-error | state-variant | 5 |

### settings (42 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| settings | real-product | 4 |
| source-management | real-product | 5 |
| source-settings-entry | shared-screen | 3 |
| source-batch | real-product | 5 |
| source-groups | real-product | 5 |
| source-detail | real-product | 5 |
| source-detect | real-product | 5 |
| source-test-result | shared-screen | 4 |
| source-rule-edit | real-product | 6 |
| source-edit | shared-screen | 3 |
| source-debug | real-product | 5 |
| source-debug-running | real-product | 4 |
| source-debug-result | real-product | 4 |
| source-debug-search-result | shared-screen | 5 |
| source-debug-detail-result | shared-screen | 4 |
| source-debug-catalog-result | shared-screen | 5 |
| source-debug-content-log | real-product | 5 |
| source-edit-debug | real-product | 3 |
| source-logs | real-product | 6 |
| source-code-view | real-product | 5 |
| source-delete-confirm | real-product | 4 |
| settings-general | real-product | 5 |
| global-settings | shared-screen | 3 |
| bookshelf-search-settings | shared-screen | 5 |
| sync-backup | real-product | 7 |
| about-feedback | real-product | 6 |
| about | shared-screen | 3 |
| about-version | shared-screen | 3 |
| sync-settings-entry | shared-screen | 3 |
| backup-settings | shared-screen | 4 |
| progress-sync | shared-screen | 4 |
| progress-sync-status | shared-screen | 4 |
| remote-webdav-books | static-contract | 7 |
| reading-settings-entry | shared-screen | 4 |
| restore-confirm | real-product | 6 |
| restore-scopes | shared-screen | 5 |
| restore-preview | shared-screen | 5 |
| restore-progress | real-product | 5 |
| restore-running | shared-screen | 4 |
| restore-conflict | real-product | 6 |
| restore-result | real-product | 7 |
| webdav-config | shared-screen | 7 |

### system-state (10 路由)

| routeId | 渲染器类型 | 缺口数 |
|---|---|---|
| app-shell | shared-screen | 5 |
| main-tabs | shared-screen | 5 |
| global-loading | static-contract | 5 |
| global-empty | static-contract | 4 |
| global-error | static-contract | 5 |
| offline-state | static-contract | 5 |
| permission-required | static-contract | 5 |
| state-error | static-contract | 4 |
| state-offline | static-contract | 4 |
| sync-error | static-contract | 5 |

## contractStaticRouteScreen 路由清单

共 13 条路由使用 contractStaticRouteScreen

| routeId | workflow | 说明 |
|---|---|---|
| bookshelf-book-more-menu | bookshelf | 需产品化：应展示真实选中书籍上下文、焦点恢复和系统返回行为 |
| search-loading | bookshelf | 应整合进 search-home/search-results 的状态渲染 |
| search-empty | bookshelf | 应整合进 search-home/search-results 的状态渲染 |
| search-error | bookshelf | 应整合进 search-home/search-results 的状态渲染 |
| remote-webdav-books | settings | 需产品化：应接入真实 WebDAV 目录、下载状态和错误恢复 |
| global-loading | system-state | 保留为系统状态页 |
| global-empty | system-state | 保留为系统状态页 |
| global-error | system-state | 保留为系统状态页 |
| offline-state | system-state | 保留为系统状态页 |
| permission-required | system-state | 保留为系统状态页 |
| state-error | system-state | 保留为系统状态页 |
| state-offline | system-state | 保留为系统状态页 |
| sync-error | system-state | 保留为系统状态页 |
