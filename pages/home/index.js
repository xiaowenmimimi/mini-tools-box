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
  }
});
