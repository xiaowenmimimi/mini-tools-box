Page({
  data: {
    baseOptions: [
      { label: '二进制 (Binary)', value: 2 },
      { label: '八进制 (Octal)', value: 8 },
      { label: '十进制 (Decimal)', value: 10 },
      { label: '十六进制 (Hex)', value: 16 }
    ],
    inputBaseIndex: 2,
    inputText: '',
    results: [],
    errorMsg: '',
    isFormatted: true
  },

  onLoad() {
    this.convert()
  },

  onInputBaseChange(e) {
    this.setData({ 
      inputBaseIndex: e.detail.value,
      errorMsg: ''
    })
    this.convert()
  },

  toggleFormat() {
      this.setData({ isFormatted: !this.data.isFormatted })
      this.convert()
  },

  onInput(e) {
    this.setData({ 
      inputText: e.detail.value,
      errorMsg: ''
    })
    this.convert()
  },

  clear() {
    this.setData({
      inputText: '',
      results: [],
      errorMsg: ''
    })
  },

  copyResult(e) {
    const text = e.currentTarget.dataset.text
    const cleanText = text.replace(/\s/g, '')
    
    wx.setClipboardData({
      data: cleanText,
      success: () => wx.showToast({ title: '已复制' })
    })
  },

  convert() {
    const rawInput = this.data.inputText.replace(/\s/g, '')
    
    if (!rawInput) {
      this.setData({ results: [] })
      return
    }

    const fromBase = this.data.baseOptions[this.data.inputBaseIndex].value

    try {
      if (!this.validateInput(rawInput, fromBase)) {
          this.setData({ errorMsg: '输入包含非法字符' })
          return
      }
      
      let val = BigInt(0)
      if (fromBase === 10) {
          val = BigInt(rawInput)
      } else {
          val = this.parseBigInt(rawInput, fromBase)
      }
      
      const results = this.data.baseOptions.map(opt => {
          let str = val.toString(opt.value).toUpperCase()
          
          if (this.data.isFormatted) {
              str = this.formatOutput(str, opt.value)
          }
          
          return {
              label: opt.label,
              base: opt.value,
              value: str
          }
      })
      
      this.setData({ results })
      
    } catch (e) {
      console.error(e)
      this.setData({ errorMsg: '转换错误: ' + e.message })
    }
  },

  formatOutput(str, base) {
      if (!str) return ''
      if (base === 2) {
           return this.groupString(str, 4)
      }
      if (base === 8) {
           return this.groupString(str, 3)
      }
      if (base === 10) {
           return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      }
      if (base === 16) {
           return this.groupString(str, 4)
      }
      return str
  },

  groupString(str, step) {
      let res = ''
      let count = 0
      for (let i = str.length - 1; i >= 0; i--) {
          res = str[i] + res
          count++
          if (count % step === 0 && i !== 0) {
              res = ' ' + res
          }
      }
      return res
  },

  validateInput(str, base) {
      const regexMap = {
          2: /^[01]+$/,
          8: /^[0-7]+$/,
          10: /^[0-9]+$/,
          16: /^[0-9A-Fa-f]+$/
      }
      return regexMap[base].test(str)
  },

  parseBigInt(str, base) {
      let res = BigInt(0)
      const baseBig = BigInt(base)
      const digits = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      const upperStr = str.toUpperCase()
      
      for (let i = 0; i < upperStr.length; i++) {
          const char = upperStr[i]
          const val = digits.indexOf(char)
          if (val === -1 || val >= base) throw new Error('Invalid char')
          res = res * baseBig + BigInt(val)
      }
      return res
  },
  onShareAppMessage() {
    return {
      title: '进制转换工具',
      path: `/${this.route}`
    }
  },
  onShareTimeline() {
    return {
      title: '进制转换工具'
    }
  }
})
