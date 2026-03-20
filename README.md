# Mini Tools Box（微信小程序工具箱）

一个基于微信小程序的多工具箱项目，当前包含 **图像、文本、转换、安全** 四类工具，并提供统一首页入口与反馈页面。

## 预览体验

请使用微信扫描下方小程序码预览：

<div align="center">

<img alt="小程序码" src="./docs/miniprogram-qrcode.png" width="256" height="256" />

</div>

## 当前功能概览

### 图像工具箱

- 长图拼接：多图选择、拖拽排序、背景色设置、导出相册
- 图片加水印：文字水印、透明度/角度/密度调节、单点与平铺模式、导出相册
- 证件照处理：1 寸/2 寸规格、缩放与位置调节、背景色替换、导出 PNG

### 文本工具箱

- 字符计数：字符数、单词数、行数、UTF-8 字节统计
- 二维码工具：二维码生成、扫码识别、历史记录
- Cron 工具：Cron 表达式生成与解析、下次运行时间预览
- JSON 工具：JSON 格式化、压缩、校验

### 转换工具箱

- 进制转换：支持常见进制互转（含大整数）
- 时间转换：时间戳/日期互转、时区换算、历史记录
- 色彩转换：HEX/RGB/HSL 互转与取色支持

### 安全工具箱

- 密码生成器：长度与字符集控制、强度与熵评估、历史记录
- 文本加解密：AES-256-CBC / XXTEA / RC4 / Base64
- TOTP 动态码：手动录入与二维码导入（otpauth）

### 其他页面

- 反馈页：问题类型选择、草稿保存、提交到 [Waline](https://waline.js.org/) 评论后端

## 页面与路由

### 主包

- `/pages/home/index`：首页
- `/pages/feedback/index`：反馈页

### 分包

- 图像工具：`/subpackages/image-tools/pages/*`
- 文本工具：`/subpackages/text-tools/pages/*`
- 转换工具：`/subpackages/convert-tools/pages/*`
- 安全工具：`/subpackages/security-tools/pages/*`

## 项目结构

```text
mini-tools-box
├─ pages/                  # 主包页面（首页、反馈）
├─ subpackages/            # 分包页面（图像/文本/转换/安全）
├─ components/             # 通用组件（tool-grid、tool-card）
├─ common/                 # 图像处理通用能力
├─ services/               # 业务服务（反馈接口）
├─ utils/                  # 工具库（请求、二维码、Cron 等）
├─ app.js                  # 全局配置与工具箱入口配置
├─ app.json                # 路由、分包、权限配置
└─ project.config.json     # 微信开发者工具项目配置
```

## 运行与开发

1. 使用微信开发者工具导入项目根目录
2. 安装/更新基础库到 `3.9.0` 或兼容版本
3. 直接编译运行，从首页进入各工具箱

## 关键配置说明

- AppID：当前 `project.config.json` 中已配置 AppID，发布前请按你的主体配置
- 权限：已声明 `scope.writePhotosAlbum`，用于导出图片保存到相册
- 工具箱入口：首页卡片由 `app.js` 中 `globalData.toolboxes` 统一配置
- 反馈服务：反馈页请求基于 `app.js` 中 `feedbackApiBaseUrl`，后端为 [Waline](https://waline.js.org/)（`POST /api/comment`）

## 许可证

本项目采用 **MIT License** 开源协议。

- 可以自由使用、修改、分发和商用
- 需保留原始版权声明与许可声明
- 详细条款见仓库根目录 [LICENSE](./LICENSE)
