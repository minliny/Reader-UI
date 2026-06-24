# 26/27 阅读辅助态决策

## 判断范围

检查：

- `26-reader-brightness-system-state.png`
- `27-reader-chapter-progress-flow.png`

## 决策表

| 图 | 用途 | 是否可作为 final | 问题 | 决策建议 |
| - | -- | ----------- | -- | ---- |
| `26-reader-brightness-system-state.png` | 说明亮度从手动、跟随系统、返回手动的状态切换。 | 否 | 这是三联流程示意图，不是单张 390 × 884 标准手机 final；适合解释交互，不适合作为最终页面状态图。 | `USE_AS_REFERENCE_ONLY` |
| `27-reader-chapter-progress-flow.png` | 说明章节进度拖动、跳转完成、切换章节的辅助状态。 | 否 | 这是四联流程示意图，不是单张 390 × 884 标准手机 final；可说明拖动和跳转逻辑，但不能直接作为最终状态图。 | `USE_AS_REFERENCE_ONLY` |

## 结论

`26` 和 `27` 均建议作为 Stitch/设计说明参考，不作为 V1 标准手机 final。

如果阅读控制层冻结包必须包含亮度辅助态和章节进度辅助态的 final 图，应单独生成标准手机单屏状态图：

- `reader_overlay_brightness_final`
- `reader_overlay_progress_drag_final`

如果 V1 只需要说明交互逻辑，当前 `26/27` 可保留为 reference，不阻塞 Stitch 阅读模块初稿。
