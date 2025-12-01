Page({
  data:{
    tools:[
      { id:'charcount', name:'字符计数', desc:'统计字数与空白', icon:'🅰️', iconClass:'char-icon', path:'/subpackages/text-tools/pages/charcount/index' },
      { id:'qrcode', name:'二维码工具', desc:'生成与识别', icon:'🔳', iconClass:'qr-icon', path:'/subpackages/text-tools/pages/qrcode/index' },
      { id:'cron', name:'Cron表达式', desc:'解析与校验', icon:'🕒', iconClass:'cron-icon', path:'/subpackages/text-tools/pages/cron/index' },
      { id:'base', name:'进制转换', desc:'二/十/十六进制', icon:'🔢', iconClass:'base-icon', path:'/subpackages/text-tools/pages/base/index' }
    ]
  },
  onToolClick(e){ const tool=e.detail.tool; wx.navigateTo({ url: tool.path }); }
})
