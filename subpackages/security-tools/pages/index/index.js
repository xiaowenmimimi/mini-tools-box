Page({
  data: {
    tools: [
      {
        id: 'password',
        name: '密码生成器',
        desc: '随机强密码',
        icon: 'icon-password',
        iconType: 'iconfont',
        iconClass: 'password-icon',
        path: '/subpackages/security-tools/pages/password/index'
      }
    ]
  },
  onToolClick(e) {
    const tool = e.detail.tool
    if (!tool || !tool.path) return
    wx.navigateTo({ url: tool.path })
  },
  onShareAppMessage() {
    return {
      title: '安全工具箱',
      path: `/${this.route}`
    }
  },
  onShareTimeline() {
    return {
      title: '安全工具箱'
    }
  }
})
