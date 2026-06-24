# 素材库清单（Asset Library Inventory）

## 当前纳入内容（Included Assets）

| 中文名称（English Name） | 数量（Count） | 说明（Notes） |
|---|---:|---|
| UI 设计图（UI Design Screens） | 30 | 当前所有 `UI设计图.png` 已按页面组进入 `fixture.json`。 |
| 书籍封面素材（Book Cover Assets） | 6 | 当前书架封面图已进入素材库。 |
| fixture 图标 token（Fixture Icon Tokens） | 54 | 从当前所有页面 `fixture.json` 扫描得出。 |
| 补齐图标（Supplemented Icons） | 17 | 补齐 Shell、阅读模块、状态和缺少公共登记的图标 token。 |
| 本地总图标 token（Total Local Icon Tokens） | 71 | 以 `icons.js` 中 `ReaderAssetIcons.icons` 为准。 |
| 验证截图（Validation Screenshots） | 60 | 作为验证素材集合登记，不在预览页逐张加载。 |

## 补齐图标（Supplemented Icons）

- 返回（Back）：`back`
- 更多（More）：`more`
- 右箭头（Chevron）：`chevron`
- 关闭（Close）：`close`
- 目录（Directory）：`directory`
- 朗读（TTS）：`tts`
- 自动翻页（Auto Page）：`auto-page`
- 替换（Replace）：`replace`
- 暂停（Pause）：`pause`
- 打开书籍（Book Open）：`book-open`
- 来源栈（Source Stack）：`source-stack`
- 进度（Progress）：`progress`
- 音量（Volume）：`volume`
- 齿轮（Gear）：`gear`
- 清除（Clear）：`clear`
- 离线（Offline）：`offline`
- 闪光 / 智能提示（Sparkle）：`sparkle`

## 准入规则（Acceptance Rules）

- 新增图标必须先进入 `icons.js`。
- 新增 UI 源图必须先进入 `fixture.json` 和 `fixture.js`。
- 页面 renderer 不能再临时新增同义图标 token。
- 如果页面必须使用局部图标，必须在素材库中标注为页面专属。
- `preview.html` 必须通过 manifest 验证。
