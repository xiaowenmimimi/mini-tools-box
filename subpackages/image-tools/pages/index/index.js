Page({
  data: {
    tools: [
      {id: 'stitch', name: '长图拼接', desc: '多图拼接', icon: 'icon-stitch', iconType: 'iconfont', iconClass: 'stitch-icon', path: '/subpackages/image-tools/pages/stitch/index'},
      {id: 'watermark', name: '图片加水印', desc: '文字水印', icon: 'icon-watermark', iconType: 'iconfont', iconClass: 'wm-icon', path: '/subpackages/image-tools/pages/watermark/index'},
      {id: 'idphoto', name: '证件照', desc: '裁剪+换底色', icon: 'icon-idphoto', iconType: 'iconfont', iconClass: 'idphoto-icon', path: '/subpackages/image-tools/pages/idphoto/index'},
    ]
  },
  onToolClick(e) {
    const tool = e.detail.tool;
    wx.navigateTo({ url: tool.path });
  },
  onShareAppMessage() {
    return {
      title: '图像工具箱：拼接/水印/证件照',
      path: `/${this.route}`
    };
  },
  onShareTimeline() {
    return {
      title: '图像工具箱：拼接/水印/证件照'
    };
  }
});
