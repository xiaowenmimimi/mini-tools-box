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
      },
      {
        id: 'crypto',
        name: '加密/解密',
        desc: 'AES 文本保护',
        icon: 'icon-crypto',
        iconType: 'iconfont',
        iconClass: 'crypto-icon',
        path: '/subpackages/security-tools/pages/crypto/index'
      },
      {
        id: 'totp',
        name: '2FA 验证码',
        desc: '扫码导入与生成',
        icon: 'icon-totp',
        iconType: 'iconfont',
        iconClass: 'totp-icon',
        path: '/subpackages/security-tools/pages/totp/index'
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
