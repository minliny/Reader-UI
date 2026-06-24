# Loop 028 Report

## 当前 Slice
Slice 6：Discover / RSS / WebDAV — WebDavConfig + BackupSettings

## 本轮任务
LOOP-028：新增 `WebDavConfigScreen.kt` + `BackupSettingsScreen.kt` 静态 UI

## 修改文件
- `app/src/main/kotlin/com/reader/android/ui/settings/WebDavAndBackupScreens.kt`（新增）：
  - `WebDavConfigScreen` — 表单：服务器地址/用户名/密码 + "登录并测试"按钮
  - `BackupSettingsScreen` — 自动备份 SwitchRow + WebDAV 备份 ReaderSettingsRow with chip
  - 全量 ReaderTheme styling

## 测试: PASS (49 tasks, 7s) | P0/P1: 0/0
## 下一轮: LOOP-029：Slice 6 测试 + 完成
