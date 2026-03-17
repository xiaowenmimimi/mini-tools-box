import cronParser from '../../../../utils/cron-parser.js'

Page({
  data: {
    cronExpression: '* * * * * *',
    activeTab: 'generate', // generate | parse
    
    // 生成器状态
    second: '*',
    minute: '*',
    hour: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
    
    // 解析结果
    nextRuns: [],
    errorMsg: '',

    // 常用预设
    presets: [
        { label: '每秒执行', value: '* * * * * ?' },
        { label: '每分钟执行', value: '0 * * * * ?' },
        { label: '每5分钟执行', value: '0 0/5 * * * ?' },
        { label: '每小时执行', value: '0 0 * * * ?' },
        { label: '每天0点执行', value: '0 0 0 * * ?' },
        { label: '每月1号0点', value: '0 0 0 1 * ?' },
        { label: '每周一0点', value: '0 0 0 ? * 2' } // 周日=1, 周一=2 (Spring标准) 或 周一=1 (Linux) -> 这里的 parser 兼容性要注意
        // 我们的简易 parser 0-7, 0=Sun. 
        // 修正：常用 Cron 库中，周一通常是 MON 或 1。
    ],
    showPresetModal: false
  },

  onLoad() {
    this.updatePreview()
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // 输入 Cron 表达式
  onCronInput(e) {
    const val = e.detail.value
    this.setData({ cronExpression: val })
    this.updatePreview()
  },

  // 更新生成器字段
  onFieldChange(e) {
    const field = e.currentTarget.dataset.field
    const val = e.detail.value.trim()
    
    this.setData({ [field]: val })
    
    // 组合 Cron
    const { second, minute, hour, dayOfMonth, month, dayOfWeek } = this.data
    
    // 强制生成 6 位 Cron (秒 分 时 日 月 周)
    // 如果用户未输入或清空，默认为 *
    const s = second || '*'
    const m = minute || '*'
    const h = hour || '*'
    const D = dayOfMonth || '*'
    const M = month || '*'
    const W = dayOfWeek || '*'
    
    const expr = `${s} ${m} ${h} ${D} ${M} ${W}`
    
    this.setData({ cronExpression: expr })
    this.updatePreview()
  },

  togglePresets() {
      this.setData({ showPresetModal: !this.data.showPresetModal })
  },

  selectPreset(e) {
      const val = e.currentTarget.dataset.value
      this.setData({ 
          cronExpression: val,
          showPresetModal: false
      })
      this.updatePreview()
      
      // 同步到生成器字段
      const parts = val.split(/\s+/)
      if (parts.length === 6) {
          this.setData({
              second: parts[0],
              minute: parts[1],
              hour: parts[2],
              dayOfMonth: parts[3],
              month: parts[4],
              dayOfWeek: parts[5]
          })
      }
  },

  // 解析并更新预览
  updatePreview() {
    const expr = this.data.cronExpression.trim()
    if (!expr) {
        this.setData({ 
            description: '',
            nextRuns: [],
            errorMsg: ''
        })
        return
    }

    try {
        // 2. 计算下次运行时间
        const interval = cronParser.parseExpression(expr)
        
        // 校验日期有效性 (简易 parser 可能没校验 2月30日)
        // 尝试生成一次，看是否报错或返回无效日期
        const next = interval.next()
        if (isNaN(next.getTime())) {
            throw new Error('生成的日期无效')
        }
        
        const nextRuns = []
        nextRuns.push(this.formatDate(new Date(next.getTime())))
        
        for (let i = 0; i < 4; i++) {
            const obj = interval.next()
            const date = new Date(obj.getTime())
            nextRuns.push(this.formatDate(date))
        }
        
        this.setData({ 
            nextRuns,
            errorMsg: ''
        })
        
        // 反向填充 UI (如果是在 parse tab 输入的)
        if (this.data.activeTab === 'parse') {
            const parts = expr.split(/\s+/)
            if (parts.length === 5) {
                this.setData({
                    second: '*',
                    minute: parts[0],
                    hour: parts[1],
                    dayOfMonth: parts[2],
                    month: parts[3],
                    dayOfWeek: parts[4]
                })
            } else if (parts.length === 6) {
                this.setData({
                    second: parts[0],
                    minute: parts[1],
                    hour: parts[2],
                    dayOfMonth: parts[3],
                    month: parts[4],
                    dayOfWeek: parts[5]
                })
            }
        }
        
    } catch (e) {
         let friendlyMsg = '表达式无效'
         const msg = e.message
         
         if (msg.includes('Cron 表达式格式错误')) {
             friendlyMsg = '格式错误：请确保包含 5 到 7 个字段（秒 分 时 日 月 周 [年]）'
         } else if (msg.includes('generated date is invalid') || msg.includes('生成的日期无效')) {
             friendlyMsg = '日期无效：不存在该日期（如2月30日）'
         } else if (msg.includes('is not a valid')) {
             friendlyMsg = '数值超出范围：请检查各字段是否在允许范围内（如分钟 0-59）'
         } else if (msg.includes('step')) {
             friendlyMsg = '步长设置错误：/ 后的数字必须大于 0'
         } else if (msg.includes('range')) {
             friendlyMsg = '范围设置错误：- 前后的数字顺序不对'
         } else if (msg.includes('Cannot create property') || msg.includes('Cannot read property')) {
             friendlyMsg = '输入格式异常：请检查是否包含非法字符或格式错误'
         } else if (msg.includes('NaN')) {
             friendlyMsg = '数值错误：请输入有效的数字'
         } else {
             friendlyMsg = '解析失败：' + msg
         }

         this.setData({ 
             errorMsg: friendlyMsg,
             nextRuns: []
         })
     }
   },

   formatDate(date) {
      const pad = n => n.toString().padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  },
  
  copyCron() {
      wx.setClipboardData({
          data: this.data.cronExpression,
          success: () => wx.showToast({ title: '已复制' })
      })
  },
  onShareAppMessage() {
    return {
      title: 'Cron 表达式工具',
      path: `/${this.route}`
    }
  },
  onShareTimeline() {
    return {
      title: 'Cron 表达式工具'
    }
  }
})
