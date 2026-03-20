Page({
  data: {
    tools: []
  },
  onLoad() {
    // 从全局配置获取工具箱列表
    this.setData({
      tools: getApp().globalData.toolboxes
    });
  },
  goTool(e) {
    const index = e.currentTarget.dataset.index;
    const tool = this.data.tools[index];
    wx.navigateTo({url: tool.path});
  },
  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/index' });
  },
  onShareAppMessage() {
    return {
      title: 'Mini Tools Box 实用工具箱',
      path: `/${this.route}`
    };
  },
  onShareTimeline() {
    return {
      title: 'Mini Tools Box 实用工具箱'
    };
  }
});
