Page({
  data: {
    tools: [
      {id: 'stitch', name: '长图拼接', desc: '多图拼接', icon: '📏', iconClass: 'stitch-icon', path: '/subpackages/image-tools/pages/stitch/index'},
      {id: 'watermark', name: '图片加水印', desc: '文字水印', icon: '💧', iconClass: 'wm-icon', path: '/subpackages/image-tools/pages/watermark/index'},
      {id: 'idphoto', name: '证件照', desc: '裁剪+换底色', icon: '🪪', iconClass: 'idphoto-icon', path: '/subpackages/image-tools/pages/idphoto/index'},
      // {id: 'pdf', name: '生成PDF', desc: '多图合成文档', icon: '📄', iconClass: 'pdf-icon', path: '/subpackages/image-tools/pages/pdf/index'}
    ]
  },
  onToolClick(e) {
    const tool = e.detail.tool;
    wx.navigateTo({ url: tool.path });
  }
});
