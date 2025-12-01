Mini Tools Box - WeChat Mini Program Skeleton

结构：
- 主包：pages/home/index 入口卡片
- 分包：
  - subpackages/stitch/pages/index：长图拼接（可运行 MVP）
  - subpackages/idphoto/pages/index：证件照占位页
  - subpackages/pdf/pages/index：PDF 占位页

使用：
1) 用微信开发者工具 -> 导入本项目目录。
2) AppID 暂用 touristappid（仅预览），上线请替换为你的 AppID。
3) 直接运行，先体验“长图拼接”。

下一步：
- 在 B 中加入裁剪框组件，实现 1寸/2寸导出与换底。
- 在 C 中加入前端 PDF 生成（或云函数 pdfkit）。

许可证：自用/学习自由，商用请自测与补充合规说明。
