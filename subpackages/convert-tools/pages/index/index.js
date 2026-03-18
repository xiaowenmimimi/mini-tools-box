Page({
  data: {
    tools: [
      { id: 'base', name: '进制转换', desc: '二/十/十六进制', icon: 'icon-base', iconType: 'iconfont', iconClass: 'conv-base-icon', path: '/subpackages/convert-tools/pages/base/index' },
      { id: 'datetime', name: '时间转换', desc: '时间戳/时区', icon: 'icon-datetime', iconType: 'iconfont', iconClass: 'conv-datetime-icon', path: '/subpackages/convert-tools/pages/datetime/index' },
      { id: 'color', name: '色彩转换', desc: 'HEX/RGB/HSL', icon: 'icon-color', iconType: 'iconfont', iconClass: 'conv-color-icon', path: '/subpackages/convert-tools/pages/color/index' }
    ]
  },
  onToolClick(e) {
    const tool = e.detail.tool;
    wx.navigateTo({ url: tool.path });
  },
  onShareAppMessage() {
    return {
      title: '转换工具箱：进制/时间/色彩转换',
      path: `/${this.route}`
    };
  },
  onShareTimeline() {
    return {
      title: '转换工具箱：进制/时间/色彩转换'
    };
  }
});
