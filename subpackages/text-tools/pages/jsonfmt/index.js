Page({
  data: {
    inputText: '',
    outputText: '',
    errorMsg: '',
    indentOptions: [
      { label: '2 空格', value: 2 },
      { label: '4 空格', value: 4 },
      { label: 'Tab', value: 'tab' }
    ],
    indentIndex: 0
  },

  onInput(e) {
    this.setData({ inputText: e.detail.value || '', errorMsg: '' })
  },

  onIndentChange(e) {
    this.setData({ indentIndex: Number(e.detail.value) })
  },

  clearAll() {
    this.setData({
      inputText: '',
      outputText: '',
      errorMsg: ''
    })
  },

  copyOutput() {
    const text = this.data.outputText
    if (!text) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({ data: text, success: () => wx.showToast({ title: '已复制' }) })
  },

  formatJson() {
    const parsed = this.parseInputJson()
    if (!parsed.ok) return
    const indentValue = this.data.indentOptions[this.data.indentIndex].value
    const spacer = indentValue === 'tab' ? '\t' : indentValue
    const outputText = JSON.stringify(parsed.value, null, spacer)
    this.setData({ outputText, errorMsg: '' })
  },

  minifyJson() {
    const parsed = this.parseInputJson()
    if (!parsed.ok) return
    const outputText = JSON.stringify(parsed.value)
    this.setData({ outputText, errorMsg: '' })
  },

  validateJson() {
    const parsed = this.parseInputJson()
    if (!parsed.ok) return
    this.setData({ errorMsg: '', outputText: this.data.outputText })
    wx.showToast({ title: 'JSON 合法', icon: 'success' })
  },

  parseInputJson() {
    const text = (this.data.inputText || '').trim()
    if (!text) {
      this.setData({ errorMsg: '请输入 JSON 内容', outputText: '' })
      return { ok: false }
    }
    try {
      const value = JSON.parse(text)
      this.setData({ errorMsg: '' })
      return { ok: true, value }
    } catch (e) {
      const detail = this.normalizeError(e, text)
      this.setData({ errorMsg: detail, outputText: '' })
      return { ok: false }
    }
  },

  normalizeError(err, text) {
    const msg = (err && err.message) || 'JSON 解析失败'
    const match = msg.match(/position\s+(\d+)/i)
    if (!match) return msg
    const pos = Number(match[1])
    if (Number.isNaN(pos) || pos < 0) return msg
    const part = text.slice(0, pos)
    const line = part.split('\n').length
    const col = pos - part.lastIndexOf('\n')
    return `${msg}（第 ${line} 行，第 ${col} 列）`
  }
})
