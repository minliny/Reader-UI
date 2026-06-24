# Compose Regression Guards

## Guard List

1. 不允许重新引入 Stitch 旧 class：`bg-surface-container`、`text-on-surface`、`shadow-lg` 等。
2. 不允许使用旧颜色：`#fdf6ec`、`#eae1da`、`#f5ece6`、`#efe7e0`、`#8b5000`。
3. 不允许控制层恢复旧三层堆叠。
4. 不允许快捷按钮恢复文字标签。
5. 不允许夜间模式变成弹窗。
6. 不允许阅读页设置混入全局设置。
7. 不允许全局设置混入阅读页底栏设置。
8. 不允许 Android UI 直接依赖 normalized HTML 文件运行时。
9. normalized HTML 只是设计 handoff，不是生产 WebView UI。
10. Compose 实现必须使用 Kotlin/Compose 原生组件。
11. 不允许破坏 `FakeCoreBridge` / parser / repository / ViewModel fake-real constructor boundary。
12. 不允许删除现有 route tests，除非已有等价新 tests。

## Suggested Automation

- Static string scan in tests for old class/color literals.
- Semantics tests for reader control layer rules.
- Route smoke tests for all core routes.
- Screenshot smoke for reader base and overlays.
