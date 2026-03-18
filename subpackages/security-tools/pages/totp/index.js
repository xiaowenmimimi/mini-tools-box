const STORAGE_KEY = 'totp_accounts_v1'
const MAX_ACCOUNTS = 50
const ALGORITHM_OPTIONS = [
  { id: 'SHA1', name: 'SHA1' },
  { id: 'SHA256', name: 'SHA256' },
  { id: 'SHA512', name: 'SHA512' }
]
const DIGITS_OPTIONS = [6, 8]

Page({
  data: {
    activeTab: 'codes',
    accounts: [],
    codeMap: {},
    formIssuer: '',
    formAccount: '',
    formSecret: '',
    formPeriod: '30',
    formAlgorithmIndex: 0,
    formDigitsIndex: 0,
    algorithmOptions: ALGORITHM_OPTIONS,
    digitsOptions: DIGITS_OPTIONS
  },

  onLoad() {
    this.timer = null
    this.loadAccounts()
    this.startTicker()
  },

  onShow() {
    this.startTicker()
  },

  onHide() {
    this.stopTicker()
  },

  onUnload() {
    this.stopTicker()
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab) return
    this.setData({ activeTab: tab })
  },

  onIssuerInput(e) {
    this.setData({ formIssuer: e.detail.value || '' })
  },

  onAccountInput(e) {
    this.setData({ formAccount: e.detail.value || '' })
  },

  onSecretInput(e) {
    this.setData({ formSecret: e.detail.value || '' })
  },

  onPeriodInput(e) {
    this.setData({ formPeriod: e.detail.value || '' })
  },

  onAlgorithmChange(e) {
    this.setData({ formAlgorithmIndex: Number(e.detail.value) || 0 })
  },

  onDigitsChange(e) {
    this.setData({ formDigitsIndex: Number(e.detail.value) || 0 })
  },

  addManualAccount() {
    const algorithm = this.getSelectedAlgorithm()
    const digits = this.getSelectedDigits()
    const period = this.parsePeriod(this.data.formPeriod)
    const payload = {
      issuer: String(this.data.formIssuer || '').trim(),
      account: String(this.data.formAccount || '').trim(),
      secret: String(this.data.formSecret || '').trim(),
      algorithm,
      digits,
      period
    }
    const validated = this.validateAccountPayload(payload)
    if (!validated.ok) {
      wx.showToast({ title: validated.message, icon: 'none' })
      return
    }
    const account = this.buildAccount(validated.value)
    this.addAccountRecord(account, '账号已添加')
    this.setData({
      formIssuer: '',
      formAccount: '',
      formSecret: ''
    })
  },

  importByScan() {
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode', 'barCode', 'datamatrix', 'pdf417'],
      success: (res) => {
        this.importFromUri(res.result)
      },
      fail: (err) => {
        if (!err || !err.errMsg || !err.errMsg.includes('cancel')) {
          wx.showToast({ title: '扫码失败', icon: 'none' })
        }
      }
    })
  },

  importFromUri(text) {
    let parsed
    try {
      parsed = this.parseOtpauthUri(text)
    } catch (err) {
      wx.showToast({ title: err && err.message ? err.message : '二维码内容无效', icon: 'none' })
      return
    }
    const validated = this.validateAccountPayload(parsed)
    if (!validated.ok) {
      wx.showToast({ title: validated.message, icon: 'none' })
      return
    }
    const account = this.buildAccount(validated.value)
    this.addAccountRecord(account, '扫码导入成功')
  },

  addAccountRecord(account, successTitle) {
    const accounts = this.data.accounts || []
    if (accounts.length >= MAX_ACCOUNTS) {
      wx.showToast({ title: `最多保存 ${MAX_ACCOUNTS} 个账号`, icon: 'none' })
      return
    }
    const duplicated = accounts.some(item => {
      return item.secret === account.secret && item.account === account.account && item.issuer === account.issuer
    })
    if (duplicated) {
      wx.showToast({ title: '账号已存在', icon: 'none' })
      return
    }
    const next = this.decorateAccounts([account, ...accounts]).slice(0, MAX_ACCOUNTS)
    this.setData({ accounts: next }, () => {
      this.saveAccounts(next)
      this.refreshCodes()
      wx.showToast({ title: successTitle, icon: 'none' })
    })
  },

  removeAccount(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.showModal({
      title: '删除账号',
      content: '确认删除该 2FA 账号吗？',
      success: ({ confirm }) => {
        if (!confirm) return
        const next = this.data.accounts.filter(item => item.id !== id)
        this.setData({ accounts: next }, () => {
          this.saveAccounts(next)
          this.refreshCodes()
        })
      }
    })
  },

  copyCode(e) {
    const id = e.currentTarget.dataset.id
    const hit = this.data.codeMap[id]
    if (!hit || !hit.code) {
      wx.showToast({ title: '暂无可复制验证码', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: hit.code,
      success: () => wx.showToast({ title: '验证码已复制', icon: 'none' })
    })
  },

  copyAccountSecret(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const account = (this.data.accounts || []).find(item => item.id === id)
    if (!account || !account.secret) {
      wx.showToast({ title: '未找到可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: account.secret,
      success: () => wx.showToast({ title: 'Secret 已复制', icon: 'none' })
    })
  },

  refreshNow() {
    this.refreshCodes()
  },

  startTicker() {
    if (this.timer) return
    this.refreshCodes()
    this.timer = setInterval(() => {
      this.refreshCodes()
    }, 1000)
  },

  stopTicker() {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
  },

  async refreshCodes() {
    const accounts = this.data.accounts || []
    if (!accounts.length) {
      this.setData({ codeMap: {} })
      return
    }
    const nowSec = Math.floor(Date.now() / 1000)
    const codeMap = {}
    await Promise.all(accounts.map(async (item) => {
      try {
        const result = await this.generateTotp(item, nowSec)
        codeMap[item.id] = result
      } catch (err) {
        const period = this.parsePeriod(item.period)
        codeMap[item.id] = {
          code: '',
          remaining: period - (nowSec % period)
        }
      }
    }))
    this.setData({ codeMap })
  },

  async generateTotp(account, nowSec) {
    const period = this.parsePeriod(account.period)
    const digits = this.parseDigits(account.digits)
    const counter = Math.floor(nowSec / period)
    const digest = await this.hotpDigest(account.secret, counter, account.algorithm)
    const code = this.digestToCode(digest, digits)
    let remaining = period - (nowSec % period)
    if (remaining <= 0) remaining = period
    return { code, remaining }
  },

  async hotpDigest(secret, counter, algorithm) {
    const keyBytes = this.base32ToBytes(secret)
    const msgBytes = this.counterToBytes(counter)
    const subtle = this.getSubtleCrypto()
    if (subtle) {
      try {
        const key = await subtle.importKey(
          'raw',
          keyBytes,
          { name: 'HMAC', hash: { name: algorithm } },
          false,
          ['sign']
        )
        const sign = await subtle.sign('HMAC', key, msgBytes)
        return new Uint8Array(sign)
      } catch (e) {}
    }
    if (algorithm !== 'SHA1') {
      throw new Error('当前环境仅支持 SHA1')
    }
    return this.hmacSha1(keyBytes, msgBytes)
  },

  digestToCode(digest, digits) {
    const offset = digest[digest.length - 1] & 0x0f
    const binCode = ((digest[offset] & 0x7f) << 24)
      | ((digest[offset + 1] & 0xff) << 16)
      | ((digest[offset + 2] & 0xff) << 8)
      | (digest[offset + 3] & 0xff)
    const mod = Math.pow(10, digits)
    const value = String(binCode % mod)
    return value.padStart(digits, '0')
  },

  counterToBytes(counter) {
    let value = Math.floor(counter)
    const out = new Uint8Array(8)
    for (let i = 7; i >= 0; i--) {
      out[i] = value & 0xff
      value = Math.floor(value / 256)
    }
    return out
  },

  parseOtpauthUri(text) {
    const raw = String(text || '').trim()
    if (!raw) throw new Error('未识别到二维码内容')
    if (!/^otpauth:\/\//i.test(raw)) throw new Error('仅支持 otpauth:// 协议')
    const body = raw.replace(/^otpauth:\/\//i, '')
    const slashIndex = body.indexOf('/')
    if (slashIndex < 0) throw new Error('二维码格式无效')
    const type = body.slice(0, slashIndex).toLowerCase()
    if (type !== 'totp') throw new Error('仅支持 TOTP 类型')
    const payload = body.slice(slashIndex + 1)
    const qIndex = payload.indexOf('?')
    const labelRaw = qIndex >= 0 ? payload.slice(0, qIndex) : payload
    const queryRaw = qIndex >= 0 ? payload.slice(qIndex + 1) : ''
    const label = this.safeDecode(labelRaw)
    const query = this.parseQuery(queryRaw)
    const pair = this.parseLabel(label)
    return {
      issuer: String(query.issuer || pair.issuer || '').trim(),
      account: String(pair.account || '').trim(),
      secret: String(query.secret || '').trim(),
      algorithm: this.normalizeAlgorithm(query.algorithm),
      digits: this.parseDigits(query.digits),
      period: this.parsePeriod(query.period)
    }
  },

  parseQuery(queryRaw) {
    const output = {}
    if (!queryRaw) return output
    const pairs = String(queryRaw).split('&')
    pairs.forEach(item => {
      if (!item) return
      const eqIndex = item.indexOf('=')
      const key = eqIndex >= 0 ? item.slice(0, eqIndex) : item
      const value = eqIndex >= 0 ? item.slice(eqIndex + 1) : ''
      const decodedKey = this.safeDecode(key).toLowerCase()
      output[decodedKey] = this.safeDecode(value)
    })
    return output
  },

  parseLabel(label) {
    const value = String(label || '').trim()
    if (!value) return { issuer: '', account: '' }
    const index = value.indexOf(':')
    if (index < 0) return { issuer: '', account: value }
    return {
      issuer: value.slice(0, index).trim(),
      account: value.slice(index + 1).trim()
    }
  },

  safeDecode(text) {
    const value = String(text || '').replace(/\+/g, '%20')
    try {
      return decodeURIComponent(value)
    } catch (e) {
      return String(text || '')
    }
  },

  validateAccountPayload(payload) {
    const issuer = String(payload.issuer || '').trim()
    const account = String(payload.account || '').trim()
    const secretRaw = String(payload.secret || '').trim()
    if (!secretRaw) return { ok: false, message: 'Secret 不能为空' }
    const secret = this.normalizeSecret(secretRaw)
    let secretBytes = null
    try {
      secretBytes = this.base32ToBytes(secret)
    } catch (err) {
      return { ok: false, message: 'Secret 不是有效 Base32' }
    }
    if (!secretBytes || !secretBytes.length) return { ok: false, message: 'Secret 无效' }
    const algorithm = this.normalizeAlgorithm(payload.algorithm)
    const digits = this.parseDigits(payload.digits)
    const period = this.parsePeriod(payload.period)
    return {
      ok: true,
      value: { issuer, account, secret, algorithm, digits, period }
    }
  },

  buildAccount(payload) {
    const now = Date.now()
    const displayName = payload.issuer || payload.account || '未命名账号'
    return {
      id: this.createId(),
      issuer: payload.issuer,
      account: payload.account,
      displayName,
      secret: payload.secret,
      secretMasked: this.maskSecret(payload.secret),
      algorithm: payload.algorithm,
      digits: payload.digits,
      period: payload.period,
      createdAt: now,
      createdAtText: this.formatDateTime(now)
    }
  },

  decorateAccounts(accounts) {
    return (accounts || []).map(item => {
      const issuer = String(item.issuer || '').trim()
      const account = String(item.account || '').trim()
      const secret = this.normalizeSecret(item.secret || '')
      const now = Date.now()
      const createdAt = Number(item.createdAt) || now
      return {
        id: String(item.id || this.createId()),
        issuer,
        account,
        displayName: issuer || account || '未命名账号',
        secret,
        secretMasked: this.maskSecret(secret),
        algorithm: this.normalizeAlgorithm(item.algorithm),
        digits: this.parseDigits(item.digits),
        period: this.parsePeriod(item.period),
        createdAt,
        createdAtText: item.createdAtText || this.formatDateTime(createdAt)
      }
    })
  },

  loadAccounts() {
    let stored = []
    try {
      const value = wx.getStorageSync(STORAGE_KEY)
      if (Array.isArray(value)) stored = value
    } catch (e) {}
    const accounts = this.decorateAccounts(stored).slice(0, MAX_ACCOUNTS)
    this.setData({ accounts }, () => this.refreshCodes())
  },

  saveAccounts(accounts) {
    try {
      wx.setStorageSync(STORAGE_KEY, accounts || [])
    } catch (e) {}
  },

  getSelectedAlgorithm() {
    const index = Number(this.data.formAlgorithmIndex) || 0
    const item = ALGORITHM_OPTIONS[index]
    return this.normalizeAlgorithm(item ? item.id : 'SHA1')
  },

  getSelectedDigits() {
    const index = Number(this.data.formDigitsIndex) || 0
    const value = DIGITS_OPTIONS[index]
    return this.parseDigits(value)
  },

  parseDigits(value) {
    const n = Number(value)
    if (n === 8) return 8
    return 6
  },

  parsePeriod(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return 30
    if (n < 15) return 15
    if (n > 120) return 120
    return Math.floor(n)
  },

  normalizeAlgorithm(value) {
    const text = String(value || 'SHA1').toUpperCase()
    if (text === 'SHA256') return 'SHA256'
    if (text === 'SHA512') return 'SHA512'
    return 'SHA1'
  },

  normalizeSecret(secret) {
    return String(secret || '')
      .toUpperCase()
      .replace(/[\s-]/g, '')
      .replace(/=+$/g, '')
  },

  maskSecret(secret) {
    const text = String(secret || '')
    if (text.length <= 8) return text
    return `${text.slice(0, 4)}...${text.slice(-4)}`
  },

  base32ToBytes(input) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
    const normalized = this.normalizeSecret(input)
    if (!normalized) throw new Error('Secret 不能为空')
    let bits = 0
    let value = 0
    const out = []
    for (let i = 0; i < normalized.length; i++) {
      const idx = alphabet.indexOf(normalized[i])
      if (idx < 0) throw new Error('Secret 包含非法字符')
      value = (value << 5) | idx
      bits += 5
      if (bits >= 8) {
        bits -= 8
        out.push((value >>> bits) & 0xff)
      }
    }
    return new Uint8Array(out)
  },

  getSubtleCrypto() {
    if (typeof wx !== 'undefined' && wx && wx.crypto && wx.crypto.subtle) return wx.crypto.subtle
    if (typeof crypto !== 'undefined' && crypto && crypto.subtle) return crypto.subtle
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto.subtle
    return null
  },

  hmacSha1(keyBytes, messageBytes) {
    const blockSize = 64
    let key = keyBytes
    if (key.length > blockSize) key = this.sha1Bytes(key)
    const padded = new Uint8Array(blockSize)
    padded.set(key.slice(0, blockSize))
    const oKey = new Uint8Array(blockSize)
    const iKey = new Uint8Array(blockSize)
    for (let i = 0; i < blockSize; i++) {
      oKey[i] = padded[i] ^ 0x5c
      iKey[i] = padded[i] ^ 0x36
    }
    const inner = this.sha1Bytes(this.concatBytes(iKey, messageBytes))
    return this.sha1Bytes(this.concatBytes(oKey, inner))
  },

  sha1Bytes(bytes) {
    const message = this.toUint8(bytes)
    const bitLen = message.length * 8
    const withOne = message.length + 1
    const padZeroLen = (64 - ((withOne + 8) % 64)) % 64
    const totalLen = withOne + padZeroLen + 8
    const buffer = new Uint8Array(totalLen)
    buffer.set(message)
    buffer[message.length] = 0x80
    const view = new DataView(buffer.buffer)
    const high = Math.floor(bitLen / 0x100000000)
    const low = bitLen >>> 0
    view.setUint32(totalLen - 8, high, false)
    view.setUint32(totalLen - 4, low, false)

    let h0 = 0x67452301
    let h1 = 0xefcdab89
    let h2 = 0x98badcfe
    let h3 = 0x10325476
    let h4 = 0xc3d2e1f0

    const w = new Uint32Array(80)
    for (let offset = 0; offset < totalLen; offset += 64) {
      for (let i = 0; i < 16; i++) {
        w[i] = view.getUint32(offset + i * 4, false)
      }
      for (let i = 16; i < 80; i++) {
        w[i] = this.rotl((w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]) >>> 0, 1)
      }

      let a = h0
      let b = h1
      let c = h2
      let d = h3
      let e = h4

      for (let i = 0; i < 80; i++) {
        let f = 0
        let k = 0
        if (i < 20) {
          f = (b & c) | ((~b) & d)
          k = 0x5a827999
        } else if (i < 40) {
          f = b ^ c ^ d
          k = 0x6ed9eba1
        } else if (i < 60) {
          f = (b & c) | (b & d) | (c & d)
          k = 0x8f1bbcdc
        } else {
          f = b ^ c ^ d
          k = 0xca62c1d6
        }
        const temp = (this.rotl(a, 5) + f + e + k + w[i]) >>> 0
        e = d
        d = c
        c = this.rotl(b, 30)
        b = a
        a = temp
      }

      h0 = (h0 + a) >>> 0
      h1 = (h1 + b) >>> 0
      h2 = (h2 + c) >>> 0
      h3 = (h3 + d) >>> 0
      h4 = (h4 + e) >>> 0
    }

    const out = new Uint8Array(20)
    const outView = new DataView(out.buffer)
    outView.setUint32(0, h0, false)
    outView.setUint32(4, h1, false)
    outView.setUint32(8, h2, false)
    outView.setUint32(12, h3, false)
    outView.setUint32(16, h4, false)
    return out
  },

  concatBytes(a, b) {
    const x = this.toUint8(a)
    const y = this.toUint8(b)
    const out = new Uint8Array(x.length + y.length)
    out.set(x, 0)
    out.set(y, x.length)
    return out
  },

  toUint8(value) {
    if (value instanceof Uint8Array) return value
    if (value && value.buffer instanceof ArrayBuffer) {
      return new Uint8Array(value.buffer, value.byteOffset || 0, value.byteLength || value.length || 0)
    }
    return new Uint8Array(value || [])
  },

  rotl(value, bits) {
    return ((value << bits) | (value >>> (32 - bits))) >>> 0
  },

  createId() {
    return `${Date.now()}_${Math.floor(Math.random() * 1000000)}`
  },

  formatDateTime(ts) {
    const date = new Date(ts)
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    const hh = `${date.getHours()}`.padStart(2, '0')
    const mm = `${date.getMinutes()}`.padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  },

  onShareAppMessage() {
    return {
      title: '2FA 验证码生成',
      path: `/${this.route}`
    }
  },

  onShareTimeline() {
    return {
      title: '2FA 验证码生成'
    }
  }
})
