const HISTORY_KEY = 'time_convert_history_v1'
const HISTORY_LIMIT = 50

Page({
  data: {
    activeTab: 'convert',
    inputMode: 'timestamp',
    timestampInput: '',
    datetimeInput: '',
    offsetOptions: [
      { label: 'UTC-08:00', value: '-08:00' },
      { label: 'UTC-05:00', value: '-05:00' },
      { label: 'UTC+00:00', value: '+00:00' },
      { label: 'UTC+01:00', value: '+01:00' },
      { label: 'UTC+08:00', value: '+08:00' },
      { label: 'UTC+09:00', value: '+09:00' },
      { label: 'UTC+10:00', value: '+10:00' }
    ],
    offsetIndex: 4,
    results: [],
    errorMsg: '',
    historyList: []
  },
  onLoad() {
    this.loadHistory()
    this.syncAutoNowThenConvert()
  },
  onShow() {
    this.loadHistory()
    this.syncAutoNowThenConvert()
  },
  onHide() {
    this.stopAutoNow()
  },
  onUnload() {
    this.stopAutoNow()
  },
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab || tab === this.data.activeTab) return
    this.setData({ activeTab: tab }, () => {
      if (tab === 'convert') {
        this.syncAutoNowThenConvert()
      } else {
        this.stopAutoNow()
      }
    })
  },
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (!mode || mode === this.data.inputMode) return
    this.setData({
      inputMode: mode,
      results: [],
      errorMsg: ''
    })
    this.syncAutoNowThenConvert()
  },
  onTimestampInput(e) {
    this.setData({
      timestampInput: e.detail.value,
      errorMsg: ''
    })
    this.syncAutoNowThenConvert()
  },
  onDatetimeInput(e) {
    this.setData({
      datetimeInput: e.detail.value,
      errorMsg: ''
    })
    this.syncAutoNowThenConvert()
  },
  onOffsetChange(e) {
    this.setData({
      offsetIndex: Number(e.detail.value),
      errorMsg: ''
    })
    this.convert()
  },
  fillNow() {
    const now = new Date()
    this.setData({
      timestampInput: String(now.getTime()),
      datetimeInput: this.formatLocalDateTime(now),
      errorMsg: ''
    }, () => this.syncAutoNowThenConvert())
  },
  clearInputs() {
    this.setData({
      timestampInput: '',
      datetimeInput: '',
      results: [],
      errorMsg: ''
    }, () => this.syncAutoNowThenConvert())
  },
  copyResult(e) {
    const text = e.currentTarget.dataset.text || ''
    wx.setClipboardData({
      data: String(text),
      success: () => {
        this.saveCurrentHistory()
        wx.showToast({ title: '已复制' })
      }
    })
  },
  onSaveHistory() {
    const saved = this.saveCurrentHistory()
    wx.showToast({ title: saved ? '已保存' : '暂无可保存内容', icon: 'none' })
  },
  loadHistory() {
    const list = wx.getStorageSync(HISTORY_KEY)
    this.setData({
      historyList: Array.isArray(list) ? list : []
    })
  },
  saveCurrentHistory() {
    if (this.shouldAutoNow() || this.data.errorMsg || !this.data.results.length) return false
    const inputText = this.getInputTextByMode(this.data.inputMode).trim()
    if (!inputText) return false
    const offset = this.data.offsetOptions[this.data.offsetIndex]
    const dedupeKey = `${this.data.inputMode}|${inputText}|${offset.value}`
    const list = this.data.historyList || []
    if (list.length > 0 && list[0].dedupeKey === dedupeKey) return false
    const now = Date.now()
    const historyItem = {
      id: `${now}_${Math.random().toString(36).slice(2, 8)}`,
      mode: this.data.inputMode,
      inputText,
      offsetValue: offset.value,
      offsetLabel: offset.label,
      resultSnapshot: this.data.results.slice(0, 5),
      createdAt: now,
      displayTime: this.formatHistoryTime(new Date(now)),
      dedupeKey
    }
    const nextList = [historyItem, ...list].slice(0, HISTORY_LIMIT)
    this.setData({ historyList: nextList })
    wx.setStorageSync(HISTORY_KEY, nextList)
    return true
  },
  deleteHistoryItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const nextList = (this.data.historyList || []).filter(item => item.id !== id)
    this.setData({ historyList: nextList })
    wx.setStorageSync(HISTORY_KEY, nextList)
  },
  clearHistory() {
    this.setData({ historyList: [] })
    wx.removeStorageSync(HISTORY_KEY)
    wx.showToast({ title: '已清空' })
  },
  applyHistory(e) {
    const item = e.currentTarget.dataset.item
    if (!item) return
    const targetMode = item.mode === 'datetime' ? 'datetime' : 'timestamp'
    const offsetIndex = this.getOffsetIndexByValue(item.offsetValue)
    this.setData({
      activeTab: 'convert',
      inputMode: targetMode,
      timestampInput: targetMode === 'timestamp' ? item.inputText : '',
      datetimeInput: targetMode === 'datetime' ? item.inputText : '',
      offsetIndex,
      errorMsg: ''
    }, () => this.syncAutoNowThenConvert())
  },
  convert() {
    const mode = this.data.inputMode
    let date = null
    try {
      if (mode === 'timestamp') {
        date = this.parseTimestamp(this.data.timestampInput)
      } else {
        date = this.parseDateTime(this.data.datetimeInput)
      }
      if (!date) {
        if (!this.shouldAutoNow()) {
          this.setData({ results: [], errorMsg: '' })
          return
        }
        date = new Date()
      }
      const results = this.buildResults(date)
      this.setData({
        results,
        errorMsg: ''
      })
    } catch (err) {
      this.setData({
        results: [],
        errorMsg: err.message || '转换失败'
      })
    }
  },
  shouldAutoNow() {
    if (this.data.inputMode === 'timestamp') {
      return !this.data.timestampInput.trim()
    }
    return !this.data.datetimeInput.trim()
  },
  syncAutoNowThenConvert() {
    if (this.data.activeTab !== 'convert') {
      this.stopAutoNow()
      return
    }
    if (this.shouldAutoNow()) {
      this.startAutoNow()
    } else {
      this.stopAutoNow()
    }
    this.convert()
  },
  startAutoNow() {
    if (this._nowTimer) return
    this._nowTimer = setInterval(() => {
      if (!this.shouldAutoNow()) {
        this.stopAutoNow()
        return
      }
      this.convert()
    }, 1000)
  },
  stopAutoNow() {
    if (!this._nowTimer) return
    clearInterval(this._nowTimer)
    this._nowTimer = null
  },
  buildResults(date) {
    const offsetValue = this.data.offsetOptions[this.data.offsetIndex].value
    const offsetMinutes = this.parseOffsetMinutes(offsetValue)
    const ms = date.getTime()
    const seconds = Math.floor(ms / 1000)
    const customOffset = this.formatDateTimeByOffset(date, offsetMinutes)
    return [
      { label: '本地时间', value: this.formatLocalDateTime(date) },
      { label: 'UTC 时间', value: this.formatUTCDateTime(date) },
      { label: `目标时区 (${this.normalizeOffsetLabel(offsetValue)})`, value: customOffset },
      { label: 'Unix 时间戳（秒）', value: String(seconds) },
      { label: 'Unix 时间戳（毫秒）', value: String(ms) },
      { label: 'ISO 8601', value: date.toISOString() }
    ]
  },
  getInputTextByMode(mode) {
    if (mode === 'timestamp') return this.data.timestampInput || ''
    return this.data.datetimeInput || ''
  },
  getOffsetIndexByValue(value) {
    const idx = this.data.offsetOptions.findIndex(item => item.value === value)
    return idx >= 0 ? idx : 4
  },
  formatHistoryTime(date) {
    return `${date.getMonth() + 1}/${date.getDate()} ${this.pad2(date.getHours())}:${this.pad2(date.getMinutes())}:${this.pad2(date.getSeconds())}`
  },
  parseTimestamp(input) {
    const raw = (input || '').trim()
    if (!raw) return null
    if (!/^-?\d+$/.test(raw)) {
      throw new Error('时间戳必须是整数')
    }
    const absDigits = raw.replace('-', '').length
    const num = Number(raw)
    if (!Number.isFinite(num)) {
      throw new Error('时间戳超出范围')
    }
    const ms = absDigits <= 10 ? num * 1000 : num
    const date = new Date(ms)
    if (Number.isNaN(date.getTime())) {
      throw new Error('无效时间戳')
    }
    return date
  },
  parseDateTime(input) {
    const raw = (input || '').trim()
    if (!raw) return null
    const basic = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:\s+(\d{1,2})(?::(\d{1,2})(?::(\d{1,2}))?)?)?$/)
    if (basic) {
      const y = Number(basic[1])
      const mo = Number(basic[2])
      const d = Number(basic[3])
      const h = Number(basic[4] || 0)
      const mi = Number(basic[5] || 0)
      const s = Number(basic[6] || 0)
      const date = new Date(y, mo - 1, d, h, mi, s)
      if (
        date.getFullYear() !== y ||
        date.getMonth() !== mo - 1 ||
        date.getDate() !== d ||
        date.getHours() !== h ||
        date.getMinutes() !== mi ||
        date.getSeconds() !== s
      ) {
        throw new Error('日期时间无效')
      }
      return date
    }
    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) {
      throw new Error('日期格式错误，请输入 YYYY-MM-DD HH:mm:ss 或 ISO 8601')
    }
    return date
  },
  parseOffsetMinutes(input) {
    const raw = (input || '').trim()
    const match = raw.match(/^([+-])(\d{2}):?(\d{2})$/)
    if (!match) return 0
    const sign = match[1] === '+' ? 1 : -1
    const hh = Number(match[2])
    const mm = Number(match[3])
    if (hh > 23 || mm > 59) return 0
    return sign * (hh * 60 + mm)
  },
  normalizeOffsetLabel(input) {
    const raw = (input || '').trim()
    const match = raw.match(/^([+-])(\d{2}):?(\d{2})$/)
    if (!match) return raw || '+00:00'
    return `${match[1]}${match[2]}:${match[3]}`
  },
  formatLocalDateTime(date) {
    return `${date.getFullYear()}-${this.pad2(date.getMonth() + 1)}-${this.pad2(date.getDate())} ${this.pad2(date.getHours())}:${this.pad2(date.getMinutes())}:${this.pad2(date.getSeconds())}`
  },
  formatUTCDateTime(date) {
    return `${date.getUTCFullYear()}-${this.pad2(date.getUTCMonth() + 1)}-${this.pad2(date.getUTCDate())} ${this.pad2(date.getUTCHours())}:${this.pad2(date.getUTCMinutes())}:${this.pad2(date.getUTCSeconds())}`
  },
  formatDateTimeByOffset(date, offsetMinutes) {
    const target = new Date(date.getTime() + offsetMinutes * 60 * 1000)
    return `${target.getUTCFullYear()}-${this.pad2(target.getUTCMonth() + 1)}-${this.pad2(target.getUTCDate())} ${this.pad2(target.getUTCHours())}:${this.pad2(target.getUTCMinutes())}:${this.pad2(target.getUTCSeconds())}`
  },
  pad2(n) {
    return String(n).padStart(2, '0')
  }
})
