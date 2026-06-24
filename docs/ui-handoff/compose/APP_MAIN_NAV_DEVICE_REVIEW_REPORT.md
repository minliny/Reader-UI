# App Main Nav Device Review Report

## 1. 总体结论

APP_MAIN_NAV_DEVICE_REVIEW_READY

已在连接的 Android 设备上重新构建、安装并打开 debug app。debug app 成功进入 `Reader UI Prototype Gallery`，并完成 App Shell / Main Tabs 与四主模块归属的设备端校对准备和结果记录。未提交、未 push，未接真实网络，未修改 Reader-Core bridge/parser/repository/book source。

## 2. 设备与安装结果

- `adb devices` 结果：
  - `dc54254d	device`
- `assembleDebug` 结果：
  - `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew assembleDebug --no-daemon`
  - BUILD SUCCESSFUL in 4s
- `installDebug` 结果：
  - `JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home ./gradlew installDebug --no-daemon`
  - Installed APK `app-debug.apk` on `IN2020 - 13`
  - BUILD SUCCESSFUL in 7s
- App 是否成功打开：
  - 是。初次启动时设备停在锁屏，已通过 `adb shell wm dismiss-keyguard` / swipe 解锁后重新启动。

设备端记录截图：

- `/tmp/reader_android_prototype_gallery.png`
- `/tmp/reader_android_app_shell_selected.png`
- `/tmp/reader_android_bookshelf_cover_selected.png`

## 3. Prototype Gallery 入口检查

通过 `adb shell am start -n com.reader.android/.MainActivity` 打开 App 后，UI dump 显示标题：

- `Reader UI Prototype Gallery`
- `App / Navigation`
- `App Shell / Main Tabs`

结论：debug app 成功直接进入 Prototype Gallery。

## 4. App Shell / Main Tabs 校对

| 检查项 | 期望 | 实际 | 是否通过 | 备注 |
|---|---|---|---|---|
| 底栏数量 | 正好 4 项 | UI dump 显示 4 项 | 通过 | `书架`、`发现`、`书源`、`我的` |
| 底栏名称 | 书架 / 发现 / 书源 / 我的 | 书架 / 发现 / 书源 / 我的 | 通过 | 截图 `/tmp/reader_android_app_shell_selected.png` |
| 搜索主按钮 | 不出现 | 未出现 | 通过 | 搜索仅在 Search / Detail 原型分组 |
| 阅读主按钮 | 不出现 | 未出现 | 通过 | Reader 是独立原型分组，不是 App 主底栏 |
| 设置主按钮 | 不出现 | 未出现 | 通过 | 全局设置归入“我的” |
| 必须包含发现 | 包含 | 已包含 | 通过 | 第二项 |
| 必须包含我的 | 包含 | 已包含 | 通过 | 第四项 |
| 默认主入口 | 书架 | 书架 selected | 通过 | UI dump 中 `书架` selected=true |
| 旧 4 项回归 | 不得显示书架 / 书源 / 阅读 / 设置 | 未显示 | 通过 | 无阅读/设置主 Tab |
| 旧 3 项原型回归 | 不得显示书架 / 搜索 / 设置 | 未显示 | 通过 | 无搜索/设置主 Tab |

## 5. 四主模块校对

书架：

- 设备端可见 `书架封面模式`、`书架列表模式`、`书架空状态` prototype entry。
- 抽样打开 `书架封面模式`，Selected Prototype 显示 `书架` 标题与顶部 `搜索` 入口。
- 书架搜索入口在页面内，不在 App 主底栏。
- 书籍进度、来源、缓存状态由 `BookshelfScreen` / `BookshelfUiState` fixture 与现有测试覆盖。

发现：

- App Shell 主底栏第二项为 `发现`。
- Prototype catalog 包含 `发现首页`、`RSS 列表`、`RSS 详情`、`RSS 订阅管理`。
- Route grouping 中 `discover` / `rss_list` / `rss_detail/{rssId}` / `rss_subscription` 均归入发现。
- 未发现 WebDAV/备份/关于混入发现主模块。

书源：

- App Shell 主底栏第三项为 `书源`。
- Prototype catalog 包含 `书源管理列表`、`书源详情`、`书源编辑/导入状态`、`书源测试/禁用/错误状态`。
- Route grouping 中 `sources` / `source_detail/{sourceId}` / `source_edit/{sourceId}` / `source_import` 均归入书源。
- 未把搜索结果页作为书源主页；未触发真实网络行为。

我的：

- App Shell 主底栏第四项为 `我的`。
- `MineScreen` 承载全局阅读设置、WebDAV 配置、备份设置、阅读进度同步、远程 WebDAV 书籍、关于版本、隐私与权限入口。
- Route grouping 中 `global_settings`、`webdav_config`、`backup_settings`、`progress_sync`、`remote_webdav_books`、`about` 均归入“我的”。
- 底栏名称不再是“设置”，且“我的”未混成阅读页底栏设置。

## 6. 搜索 / 阅读 / 设置 主底栏误用检查

- 搜索没有作为主底栏按钮：通过。
- 阅读没有作为主底栏按钮：通过。
- 设置没有作为主底栏按钮：通过。

## 7. 阅读页底栏回归检查

阅读页控制层底栏仍由 `ReaderControlBase` 渲染：

- `目录`
- `朗读`
- `界面设置`
- `阅读行为设置`

该底栏属于 ReaderScreen 控制层，不是 App 主底栏。源码与测试守卫确认：

- 未使用 `书架 / 发现 / 书源 / 我的` 替代阅读页底栏。
- 未使用 `skip_previous` / `skip_next` 表达页内控制。
- 阅读页设置未包含 WebDAV / 书源 / RSS / 关于。

## 8. 发现问题列表

无

## 9. 是否仍有 P0

无

## 10. 是否仍有 P1

无

## 11. 是否建议提交

建议提交主导航整改与设备校对报告。
