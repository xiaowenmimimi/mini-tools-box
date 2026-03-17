Page({
  data: {
    tools: [
      { id: 'base', name: '进制转换', desc: '二/十/十六进制', icon: 'icon-base', iconType: 'iconfont', iconClass: 'conv-base-icon', path: '/subpackages/convert-tools/pages/base/index' }
    ]
  },
  onToolClick(e) {
    const tool = e.detail.tool;
    wx.navigateTo({ url: tool.path });
  }
});
