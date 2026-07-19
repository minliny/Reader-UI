# Reader 素材库（Reader Asset Library）

本目录把当前 UI 设计图、封面图片和图标 token 统一成一个可浏览、可验证的前端输入件素材库。

## 文件（Files）

- `preview.html`：素材库可视化预览页。
- `fixture.json`：素材库数据源，供真实前端或转换脚本读取。
- `fixture.js`：file 协议下可直接运行的 fixture 镜像。
- `tabler-icon-map.json`：128 个 Reader 语义到 Tabler 3.44.0 上游文件的唯一映射。
- `icons/tabler/3.44.0/`：110 个 outline、10 个 filled 源 SVG，以及 MIT 许可证和来源校验信息。
- `icons.js`：由固定源文件生成的运行时图标注册表，禁止手工编辑。
- `render.js`：`window.ReaderAssetLibrary` 渲染器。
- `asset-library.css`：素材库页面样式。

## 范围（Scope）

- UI 设计图（UI Design Screens）：30 张 `UI设计图.png`。
- 书籍封面素材（Book Cover Assets）：6 张书架封面图片。
- 图标素材（Icon Assets）：128 个语义 ID，覆盖当前 111 个静态使用语义；映射到 110 个 Tabler outline SVG，并为 11 个关键选中态语义提供 filled 资产。
- 验证截图（Validation Screenshots）：60 张 `design-draft-*.png` 作为验证素材集合登记，不在预览页逐张加载。

## 使用规则（Usage Rules）

- 新页面转换前先查 `tabler-icon-map.json`，已有语义不得另起同义名称。
- 新增图标必须先固定 Tabler 上游源文件，再运行 `node tools/icons/generate-tabler-icon-registry.mjs`。
- 页面不得手绘、描摹或临时内联同义 SVG；未知语义不得回退为 `warning`。
- UI 设计图作为源图引用；验证截图作为验收证据引用；二者不得混用。
- `preview.html` 是正式前端输入件，必须进入 manifest。
- 素材库变更后必须运行 `node tools/icons/verify-tabler-icon-registry.mjs`，并重新生成、检查 `UI_RELEASE_MANIFEST.json`。
