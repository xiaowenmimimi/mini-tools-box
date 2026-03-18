App({
  onLaunch() {
    // 检查更新
    if(wx.canIUse('getUpdateManager')){
      const updateManager = wx.getUpdateManager();
      updateManager.onUpdateReady(function() {
        wx.showModal({
          title: '更新提示',
          content: '新版本已准备好，是否重启应用？',
          success(res) {
            if (res.confirm) updateManager.applyUpdate();
          }
        });
      });
    }
    
    // 错误监控
    wx.onError(err => {
      console.error('全局错误:', err);
      // 可添加上报逻辑
    });
  },
  globalData: {
    version: '0.1.0',
    // 主题色配置
    theme: {
      primary: '#10B981',
      primaryActive: '#059669',
      secondary: '#34D399',
      warning: '#F59E0B',
      danger: '#EF4444',
      success: '#059669'
    },
    toolboxes: [
      {
        id: 'image',
        name: '图像工具箱',
        desc: '拼接 / 水印 / 证件照',
        icon: 'icon-home-image',
        iconType: 'iconfont',
        path: '/subpackages/image-tools/pages/index/index'
      },
      {
        id: 'text',
        name: '文本工具箱',
        desc: '字符 / 二维码 / Cron / JSON',
        icon: 'icon-home-text',
        iconType: 'iconfont',
        path: '/subpackages/text-tools/pages/index/index'
      },
      {
        id: 'convert',
        name: '转换工具箱',
        desc: '进制 / 时间 / 色彩',
        icon: 'icon-home-convert',
        iconType: 'iconfont',
        path: '/subpackages/convert-tools/pages/index/index'
      },
      {
        id: 'security',
        name: '安全工具箱',
        desc: '密码',
        icon: 'icon-home-security',
        iconType: 'iconfont',
        path: '/subpackages/security-tools/pages/index/index'
      }
      // 后续可添加更多工具箱
    ]
  }
});
