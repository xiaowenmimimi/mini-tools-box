# Mini Tools Box（微信小程序工具箱）

一个基于微信小程序的多工具箱项目，当前聚合 **图像、文本、转换、安全** 四类能力，提供统一首页入口与反馈通道。

## 📚 目录

- [预览体验](#预览体验)
- [功能概览](#功能概览)
- [页面与路由](#页面与路由)
- [项目结构](#项目结构)
- [运行与开发](#运行与开发)
- [关键配置](#关键配置)
- [反馈服务](#反馈服务)
- [许可证](#许可证)

## 📱 预览体验

请使用微信扫描下方小程序码预览：

<div align="center">
  <img alt="小程序码" src="./docs/miniprogram-qrcode.png" width="256" height="256" />
</div>

## ✨ 功能概览

| 工具箱 | 功能 |
| --- | --- |
| 图像工具箱 | 长图拼接（多图排序/背景/导出）、图片加水印（文字/角度/密度/导出）、证件照处理（1 寸/2 寸/换底色/导出） |
| 文本工具箱 | 字符计数、二维码生成与识别、Cron 生成解析、JSON 格式化与校验 |
| 转换工具箱 | 进制转换（含大整数）、时间戳与时区转换、HEX/RGB/HSL 色彩转换 |
| 安全工具箱 | 密码生成与强度评估、文本加解密（AES-256-CBC/XXTEA/RC4/Base64）、TOTP 动态码 |
| 其他页面 | 反馈页（问题类型、草稿保存、提交到 [Waline](https://waline.js.org/) 评论后端） |

## 🗺️ 页面与路由

| 分类 | 路由 |
| --- | --- |
| 主包 | `/pages/home/index`、`/pages/feedback/index` |
| 图像分包 | `/subpackages/image-tools/pages/*` |
| 文本分包 | `/subpackages/text-tools/pages/*` |
| 转换分包 | `/subpackages/convert-tools/pages/*` |
| 安全分包 | `/subpackages/security-tools/pages/*` |

## 🧱 项目结构

```text
mini-tools-box
├─ pages/                  # 主包页面（首页、反馈）
├─ subpackages/            # 分包页面（图像/文本/转换/安全）
├─ components/             # 通用组件（tool-grid、tool-card）
├─ common/                 # 图像处理通用能力
├─ services/               # 业务服务（反馈接口）
├─ utils/                  # 工具库（请求、二维码、Cron 等）
├─ docs/                   # 文档资源（小程序码等）
├─ app.js                  # 全局配置与工具箱入口配置
├─ app.json                # 路由、分包、权限配置
└─ project.config.json     # 微信开发者工具项目配置
```

## 🚀 运行与开发

1. 使用微信开发者工具导入项目根目录
2. 安装或更新基础库到 `3.9.0` 或兼容版本
3. 编译运行后，从首页进入各工具箱

## ⚙️ 关键配置

- AppID：`project.config.json` 已配置，发布前请替换为你自己的 AppID
- 权限：声明了 `scope.writePhotosAlbum`，用于导出图片到相册
- 工具箱入口：由 `app.js` 的 `globalData.toolboxes` 统一维护

## 💬 反馈服务

- 反馈接口基地址：`app.js` 中 `feedbackApiBaseUrl`
- 后端服务： [Waline](https://waline.js.org/)
- 提交接口：`POST /api/comment`

## 📄 许可证

本项目采用 **MIT License**。

- 允许使用、修改、分发与商用
- 需保留版权声明与许可声明
- 完整条款见 [LICENSE](./LICENSE)
