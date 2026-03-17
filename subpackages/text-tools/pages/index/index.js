Page({
  data:{
    tools:[
      { id:'charcount', name:'字符计数', desc:'统计字数与空白', icon:'icon-charcount', iconType:'iconfont', iconClass:'char-icon', path:'/subpackages/text-tools/pages/charcount/index' },
      { id:'qrcode', name:'二维码工具', desc:'生成与识别', icon:'icon-qrcode', iconType:'iconfont', iconClass:'qr-icon', path:'/subpackages/text-tools/pages/qrcode/index' },
      { id:'cron', name:'Cron表达式', desc:'解析与校验', icon:'icon-cron', iconType:'iconfont', iconClass:'cron-icon', path:'/subpackages/text-tools/pages/cron/index' },
      { id:'jsonfmt', name:'JSON格式化', desc:'格式化/压缩', icon:'icon-json', iconType:'iconfont', iconClass:'json-icon', path:'/subpackages/text-tools/pages/jsonfmt/index' }
    ]
  },
  onToolClick(e){ const tool=e.detail.tool; wx.navigateTo({ url: tool.path }); }
})
