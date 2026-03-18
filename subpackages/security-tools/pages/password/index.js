const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?/~'
const AMBIGUOUS = new Set(['I', 'l', '1', 'O', '0', 'o', '|', '`', '\'', '"', '\\'])
const HISTORY_STORAGE_KEY = 'password_history_records_v1'
const HISTORY_SETTINGS_STORAGE_KEY = 'password_history_settings_v1'
const HISTORY_LIMIT = 20
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000

Page({
  data: {
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: true,
    excludedChars: '',
    activeTag: 'generator',
    autoExpireHistory: true,
    historyRecords: [],
    revealedHistoryIds: {},
    generatedPassword: '',
    strengthLabel: '-',
    strengthPercent: 0,
    entropyBits: 0,
    errorMsg: ''
  },

  onLoad() {
    const autoExpireHistory = this.readAutoExpireHistorySetting()
    const historyRecords = this.readLocalHistory(autoExpireHistory)
    this.setData({ autoExpireHistory, historyRecords })
  },

  onLengthChanging(e) {
    this.setData({ length: Number(e.detail.value) || 6 })
  },

  onLengthChange(e) {
    this.setData({ length: Number(e.detail.value) || 6 })
    this.generatePassword()
  },

  onTagChange(e) {
    const tag = e.currentTarget.dataset.tag
    if (!tag) return
    this.setData({ activeTag: tag })
  },

  onExcludedCharsInput(e) {
    this.setData({ excludedChars: e.detail.value || '' })
    this.generatePassword()
  },

  onToggleAutoExpireHistory(e) {
    const autoExpireHistory = !!e.detail.value
    const historyRecords = this.normalizeHistoryRecords(this.data.historyRecords, autoExpireHistory)
    this.setData({ autoExpireHistory, historyRecords }, () => {
      this.writeAutoExpireHistorySetting(autoExpireHistory)
      this.writeLocalHistory(historyRecords)
    })
  },

  clearHistory() {
    wx.showModal({
      title: '清空历史',
      content: '确认清空全部历史记录？',
      success: ({ confirm }) => {
        if (!confirm) return
        this.setData({ historyRecords: [], revealedHistoryIds: {} }, () => {
          this.writeLocalHistory([])
        })
      }
    })
  },

  onToggleHistoryReveal(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const key = `revealedHistoryIds.${id}`
    this.setData({ [key]: !this.data.revealedHistoryIds[id] })
  },

  copyHistoryItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.historyRecords.find(record => record.id === id)
    if (!item || !item.password) return
    wx.setClipboardData({
      data: item.password,
      success: () => wx.showToast({ title: '历史密码已复制', icon: 'none' })
    })
  },

  onOptionChange(e) {
    const field = e.currentTarget.dataset.field
    const value = !!e.detail.value
    const nextData = { [field]: value, errorMsg: '' }
    this.setData(nextData, () => {
      if (!this.hasAnyEnabledSet()) {
        this.setData({ [field]: true, errorMsg: '至少选择一种字符类型' }, () => this.generatePassword())
        return
      }
      this.generatePassword()
    })
  },

  onRegenerateTap() {
    this.generatePassword(true)
  },

  generatePassword(forceDifferent = false) {
    const activeSets = this.getActiveSets()
    if (!activeSets.length) {
      this.setData({
        errorMsg: this.hasAnyEnabledSet() ? '当前排除规则导致无可用字符' : '至少选择一种字符类型',
        generatedPassword: '',
        strengthLabel: '弱',
        strengthPercent: 20,
        entropyBits: 0
      })
      return
    }

    const targetLength = Math.max(6, Math.min(64, Number(this.data.length) || 16))
    const passwordChars = []
    for (let i = 0; i < activeSets.length && passwordChars.length < targetLength; i++) {
      passwordChars.push(this.pickRandomChar(activeSets[i]))
    }

    const fullPool = activeSets.join('')
    while (passwordChars.length < targetLength) {
      passwordChars.push(this.pickRandomChar(fullPool))
    }

    this.shuffleInPlace(passwordChars)
    let generatedPassword = passwordChars.join('')
    if (forceDifferent && generatedPassword === this.data.generatedPassword && fullPool.length > 1) {
      this.shuffleInPlace(passwordChars)
      generatedPassword = passwordChars.join('')
    }
    const strength = this.calcStrength(targetLength, activeSets, fullPool.length)

    this.setData({
      generatedPassword,
      strengthLabel: strength.label,
      strengthPercent: strength.percent,
      entropyBits: strength.entropyBits,
      errorMsg: ''
    })
  },

  copyPassword() {
    if (!this.data.generatedPassword) return
    wx.setClipboardData({
      data: this.data.generatedPassword,
      success: () => wx.showToast({ title: '密码已复制', icon: 'none' })
    })
  },

  onSaveHistoryTap() {
    if (!this.data.generatedPassword) {
      wx.showToast({ title: '请先生成密码', icon: 'none' })
      return
    }
    const strength = {
      label: this.data.strengthLabel,
      entropyBits: this.data.entropyBits
    }
    this.pushHistoryRecord(this.data.generatedPassword, strength, this.data.length)
    wx.showToast({ title: '已保存到历史', icon: 'none' })
  },

  pushHistoryRecord(password, strength, length) {
    if (!password) return
    const localRecords = this.readLocalHistory()
    if (localRecords.length > 0 && localRecords[0].password === password) {
      this.setData({ historyRecords: localRecords })
      return
    }
    const now = Date.now()
    const record = {
      id: this.createHistoryId(),
      password,
      maskedPassword: this.maskPassword(password),
      length,
      strengthLabel: strength.label,
      entropyBits: strength.entropyBits,
      createdAt: now,
      createdAtText: this.formatDateTime(now),
      expiresAt: this.data.autoExpireHistory ? now + HISTORY_TTL_MS : 0
    }
    const historyRecords = this.normalizeHistoryRecords([record, ...localRecords], this.data.autoExpireHistory)
    this.setData({ historyRecords })
    this.writeLocalHistory(historyRecords)
  },

  normalizeHistoryRecords(records, autoExpireHistory) {
    const now = Date.now()
    const map = new Map()
    records.forEach(item => {
      if (!item || !item.id || !item.password) return
      const normalized = {
        id: String(item.id),
        password: String(item.password),
        maskedPassword: item.maskedPassword || this.maskPassword(String(item.password)),
        length: Number(item.length) || String(item.password).length,
        strengthLabel: item.strengthLabel || '-',
        entropyBits: Number(item.entropyBits) || 0,
        createdAt: Number(item.createdAt) || now,
        createdAtText: item.createdAtText || this.formatDateTime(Number(item.createdAt) || now),
        expiresAt: Number(item.expiresAt) || 0
      }
      if (autoExpireHistory && normalized.expiresAt > 0 && normalized.expiresAt <= now) return
      map.set(normalized.id, normalized)
    })
    return [...map.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, HISTORY_LIMIT)
  },

  readLocalHistory(autoExpireHistory = this.data.autoExpireHistory) {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return []
    try {
      const stored = wx.getStorageSync(HISTORY_STORAGE_KEY)
      if (!Array.isArray(stored)) return []
      return this.normalizeHistoryRecords(stored, autoExpireHistory)
    } catch (e) {
      return []
    }
  },

  readAutoExpireHistorySetting() {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return true
    try {
      const stored = wx.getStorageSync(HISTORY_SETTINGS_STORAGE_KEY)
      if (typeof stored === 'boolean') return stored
      if (stored && typeof stored.autoExpireHistory === 'boolean') return stored.autoExpireHistory
    } catch (e) {}
    return true
  },

  writeAutoExpireHistorySetting(autoExpireHistory) {
    if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return
    try {
      wx.setStorageSync(HISTORY_SETTINGS_STORAGE_KEY, { autoExpireHistory: !!autoExpireHistory })
    } catch (e) {}
  },

  writeLocalHistory(records) {
    if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return
    try {
      wx.setStorageSync(HISTORY_STORAGE_KEY, records)
    } catch (e) {}
  },

  createHistoryId() {
    return `${Date.now()}_${Math.floor(Math.random() * 1000000)}`
  },

  maskPassword(password) {
    if (!password) return ''
    if (password.length <= 2) return '*'.repeat(password.length)
    if (password.length <= 6) return `${password[0]}${'*'.repeat(password.length - 2)}${password[password.length - 1]}`
    return `${password.slice(0, 2)}${'*'.repeat(Math.max(2, password.length - 4))}${password.slice(-2)}`
  },

  formatDateTime(timestamp) {
    const d = new Date(timestamp)
    const year = d.getFullYear()
    const month = `${d.getMonth() + 1}`.padStart(2, '0')
    const day = `${d.getDate()}`.padStart(2, '0')
    const hour = `${d.getHours()}`.padStart(2, '0')
    const minute = `${d.getMinutes()}`.padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  hasAnyEnabledSet() {
    return this.data.includeUppercase || this.data.includeLowercase || this.data.includeNumbers || this.data.includeSymbols
  },

  getActiveSets() {
    const sets = []
    if (this.data.includeUppercase) sets.push(this.applyAllFilters(UPPERCASE))
    if (this.data.includeLowercase) sets.push(this.applyAllFilters(LOWERCASE))
    if (this.data.includeNumbers) sets.push(this.applyAllFilters(NUMBERS))
    if (this.data.includeSymbols) sets.push(this.applyAllFilters(SYMBOLS))
    return sets.filter(Boolean)
  },

  applyAllFilters(source) {
    return this.filterExcludedChars(this.filterAmbiguous(source))
  },

  filterAmbiguous(source) {
    if (!this.data.excludeAmbiguous) return source
    const result = source.split('').filter(ch => !AMBIGUOUS.has(ch)).join('')
    return result || source
  },

  filterExcludedChars(source) {
    const excludedChars = this.data.excludedChars || ''
    if (!excludedChars) return source
    const excludedSet = new Set([...excludedChars])
    return source.split('').filter(ch => !excludedSet.has(ch)).join('')
  },

  pickRandomChar(source) {
    const index = this.getRandomInt(source.length)
    return source[index]
  },

  getRandomInt(max) {
    if (max <= 0) return 0
    const secureValue = this.getSecureRandomInt(max)
    if (secureValue !== null) {
      return secureValue
    }
    return Math.floor(Math.random() * max)
  },

  getSecureRandomInt(max) {
    if (max <= 0) return 0
    const limit = Math.floor(0x100000000 / max) * max
    if (limit <= 0) return null
    let attempts = 0
    while (attempts < 8) {
      const value = this.getSecureRandomUint32()
      if (value === null) return null
      if (!this.isSecureRandomHealthy(value)) return null
      if (value < limit) return value % max
      attempts += 1
    }
    return null
  },

  getSecureRandomUint32() {
    if (typeof wx === 'undefined' || typeof wx.getRandomValues !== 'function') return null
    if (typeof Uint8Array === 'undefined') return null
    try {
      const bytes = new Uint8Array(4)
      wx.getRandomValues(bytes)
      return (
        (bytes[0] * 0x1000000) +
        (bytes[1] << 16) +
        (bytes[2] << 8) +
        bytes[3]
      ) >>> 0
    } catch (e) {
      return null
    }
  },

  isSecureRandomHealthy(value) {
    if (this._lastSecureRandomValue === value) {
      this._secureRandomRepeatCount = (this._secureRandomRepeatCount || 0) + 1
    } else {
      this._secureRandomRepeatCount = 0
      this._lastSecureRandomValue = value
    }
    return (this._secureRandomRepeatCount || 0) < 6
  },

  shuffleInPlace(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.getRandomInt(i + 1)
      const t = arr[i]
      arr[i] = arr[j]
      arr[j] = t
    }
  },

  calcStrength(length, activeSets, poolSize) {
    let score = 0
    if (length >= 10) score += 1
    if (length >= 12) score += 1
    if (length >= 16) score += 1
    if (length >= 20) score += 1
    if (activeSets.length >= 2) score += 1
    if (activeSets.length >= 3) score += 1
    if (activeSets.length >= 4) score += 1
    if (this.data.includeSymbols) score += 1

    const entropyBits = Math.max(0, Math.round(length * Math.log2(Math.max(poolSize, 1))))
    let label = '弱'
    if (score >= 7) label = '很强'
    else if (score >= 5) label = '强'
    else if (score >= 3) label = '中'

    const percent = Math.min(100, Math.max(10, Math.round((score / 8) * 100)))
    return { label, percent, entropyBits }
  },

  onShareAppMessage() {
    return {
      title: '密码生成器',
      path: `/${this.route}`
    }
  },

  onShareTimeline() {
    return {
      title: '密码生成器'
    }
  }
})
