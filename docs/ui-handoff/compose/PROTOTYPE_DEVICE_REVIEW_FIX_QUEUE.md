# Prototype Device Review Fix Queue

## 1. 当前已确认通过项

- App 主底栏: 书架 / 发现 / 书源 / 我的。
- Prototype Gallery 可打开，debug app 可直接进入 `UI 原型预览`。
- Prototype entry 数量: 38。
- 阅读页底栏未与 App 主底栏混淆，仍为目录 / 朗读 / 界面 / 设置。
- 当前 P0: 0。
- 当前 P1: 0。

## 2. 下一步人工校对顺序

1. App Shell / Main Tabs
2. 书架封面模式
3. 书架列表模式
4. 发现首页
5. RSS 列表 / 详情 / 订阅管理
6. 书源管理列表
7. 书源详情 / 编辑 / 导入 / 测试状态
8. 我的
9. WebDAV / 备份 / 同步
10. 阅读页基础控制层
11. 阅读页 8 个状态
12. 全局状态页

## 3. 用户反馈格式建议

建议每条反馈包含：

- 页面名称
- 截图
- 问题描述
- 期望效果
- 严重程度: P0 / P1 / P2

示例：

```text
页面名称：书架封面模式
截图：附图
问题描述：卡片之间距离过小，标题换行后压住作者
期望效果：卡片间距略增，标题最多两行，作者保持可见
严重程度：P2
```

## 4. 后续处理原则

- 有截图或明确问题再修 UI。
- 不根据猜测改视觉。
- 不接真实数据。
- 不 push。
- 不改 Reader-Core bridge / parser / repository / book source。
- 不把 Prototype Gallery 接成正式生产功能。
- 不把 App 主底栏改回错误项。
- 不把阅读页底栏与 App 主底栏混淆。

## 5. 暂不进入范围

- Slice 18 数据接入。
- 真实 WebDAV 登录。
- 真实 RSS 请求。
- 真实同步。
- Reader-Core bridge/parser/repository/book source 业务逻辑改动。
