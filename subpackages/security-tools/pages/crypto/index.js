const HISTORY_STORAGE_KEY = 'crypto_text_history_v1'
const HISTORY_LIMIT = 20
const PBKDF2_ITERATIONS = 120000
const SALT_LENGTH = 16
const IV_LENGTH = 12
const CBC_IV_LENGTH = 16
const COMPAT_SALT_LENGTH = 8
const ALGORITHM_OPTIONS = [
  { id: 'aes-cbc-js', name: 'AES-256-CBC' },
  { id: 'xxtea', name: 'XXTEA-128' },
  { id: 'rc4', name: 'RC4' },
  { id: 'base64', name: 'Base64' }
]
const LEGACY_ALGORITHM_NAMES = {
  'aes-gcm': 'AES-256-GCM'
}
const VERSION_MAP = {
  'aes-cbc-js': 'v5',
  'aes-gcm': 'v1',
  xxtea: 'v2',
  rc4: 'v3',
  base64: 'v4'
}

Page({
  data: {
    activeTab: 'encrypt',
    plainText: '',
    cipherText: '',
    passphrase: '',
    encryptResultText: '',
    decryptResultText: '',
    algorithmLabel: 'AES-256-CBC',
    formatVersion: 'v5',
    selectedAlgorithm: 'aes-cbc-js',
    selectedAlgorithmIndex: 0,
    algorithmOptions: ALGORITHM_OPTIONS,
    errorMsg: '',
    isProcessing: false,
    historyRecords: [],
    maxHistory: HISTORY_LIMIT,
    lastAction: '',
    cryptoSupported: true
  },

  onLoad() {
    const historyRecords = this.readHistory()
    const cryptoSupported = !!this.getSubtleCrypto()
    const algorithmOptions = this.getAlgorithmOptions()
    const selectedAlgorithm = 'aes-cbc-js'
    const selectedAlgorithmIndex = algorithmOptions.findIndex(item => item.id === selectedAlgorithm)
    this.setData({
      historyRecords,
      cryptoSupported,
      algorithmOptions,
      selectedAlgorithm,
      selectedAlgorithmIndex: selectedAlgorithmIndex < 0 ? 0 : selectedAlgorithmIndex,
      algorithmLabel: this.getAlgorithmNameById(selectedAlgorithm),
      formatVersion: this.getVersionByAlgorithmId(selectedAlgorithm),
      errorMsg: ''
    })
  },

  onHide() {
    this.setData({ passphrase: '' })
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab
    if (!tab) return
    this.setData({ activeTab: tab, errorMsg: '' })
  },

  onPlainTextInput(e) {
    this.setData({ plainText: e.detail.value || '', errorMsg: '' })
  },

  onCipherTextInput(e) {
    this.setData({ cipherText: e.detail.value || '', errorMsg: '' })
  },

  onPassphraseInput(e) {
    this.setData({ passphrase: e.detail.value || '', errorMsg: '' })
  },

  onAlgorithmChange(e) {
    const selectedAlgorithmIndex = Number(e.detail.value || 0)
    const algorithmOptions = this.data.algorithmOptions || []
    const option = algorithmOptions[selectedAlgorithmIndex] || algorithmOptions[0]
    if (!option) return
    const selectedAlgorithm = option.id
    this.setData({
      selectedAlgorithm,
      selectedAlgorithmIndex,
      algorithmLabel: this.getAlgorithmNameById(selectedAlgorithm),
      formatVersion: this.getVersionByAlgorithmId(selectedAlgorithm),
      errorMsg: ''
    })
  },

  async onEncryptTap() {
    if (this.data.isProcessing) return
    const msg = this.validateEncryptInput()
    if (msg) {
      this.setData({ errorMsg: msg })
      return
    }
    this.setData({ isProcessing: true, errorMsg: '' })
    try {
      const cipherText = await this.encryptText(this.data.plainText, this.data.passphrase)
      this.setData({
        encryptResultText: cipherText,
        cipherText,
        lastAction: 'encrypt',
        activeTab: 'encrypt',
        errorMsg: ''
      })
    } catch (err) {
      this.setData({ errorMsg: err && err.message ? err.message : '加密失败，请重试' })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  async onDecryptTap() {
    if (this.data.isProcessing) return
    const msg = this.validateDecryptInput()
    if (msg) {
      this.setData({ errorMsg: msg })
      return
    }
    this.setData({ isProcessing: true, errorMsg: '' })
    try {
      const plainText = await this.decryptText(this.data.cipherText, this.data.passphrase)
      this.setData({
        decryptResultText: plainText,
        plainText,
        lastAction: 'decrypt',
        activeTab: 'decrypt',
        errorMsg: ''
      })
    } catch (err) {
      this.setData({ errorMsg: err && err.message ? err.message : '解密失败，请检查密文与密码' })
    } finally {
      this.setData({ isProcessing: false })
    }
  },

  onCopyResultTap() {
    const resultText = this.getCurrentResultText()
    if (!resultText) {
      wx.showToast({ title: '暂无可复制内容', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: resultText,
      success: () => wx.showToast({ title: '结果已复制', icon: 'none' })
    })
  },

  onClearInputTap() {
    if (this.data.activeTab === 'decrypt') {
      this.setData({ cipherText: '', decryptResultText: '', errorMsg: '' })
      return
    }
    this.setData({ plainText: '', encryptResultText: '', errorMsg: '' })
  },

  onSwapTap() {
    const resultText = this.getCurrentResultText()
    if (!resultText) {
      wx.showToast({ title: '暂无可回填结果', icon: 'none' })
      return
    }
    if (this.data.activeTab === 'decrypt') {
      this.setData({
        activeTab: 'encrypt',
        plainText: resultText,
        decryptResultText: '',
        errorMsg: ''
      })
      return
    }
    this.setData({
      activeTab: 'decrypt',
      cipherText: resultText,
      encryptResultText: '',
      errorMsg: ''
    })
  },

  onSaveHistoryTap() {
    if (this.data.activeTab === 'encrypt' && this.data.encryptResultText) {
      this.pushHistoryRecord('encrypt', this.data.encryptResultText)
      wx.showToast({ title: '已保存历史', icon: 'none' })
      return
    }
    if (this.data.activeTab === 'decrypt' && this.data.cipherText) {
      this.pushHistoryRecord('decrypt', this.data.cipherText.trim())
      wx.showToast({ title: '已保存历史', icon: 'none' })
      return
    }
    wx.showToast({ title: '暂无可保存内容', icon: 'none' })
  },

  onApplyHistoryItem(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.historyRecords || []).find(record => record.id === id)
    if (!item || !item.payload) return
    const algorithmId = this.getAlgorithmIdByVersion(item.version)
    const selectedAlgorithmIndex = (this.data.algorithmOptions || []).findIndex(option => option.id === algorithmId)
    this.setData({
      activeTab: 'decrypt',
      cipherText: item.payload,
      selectedAlgorithm: algorithmId,
      selectedAlgorithmIndex: selectedAlgorithmIndex < 0 ? 0 : selectedAlgorithmIndex,
      algorithmLabel: this.getAlgorithmNameById(algorithmId),
      formatVersion: this.getVersionByAlgorithmId(algorithmId),
      decryptResultText: '',
      errorMsg: ''
    })
  },

  getCurrentResultText() {
    if (this.data.activeTab === 'decrypt') return this.data.decryptResultText || ''
    if (this.data.activeTab === 'encrypt') return this.data.encryptResultText || ''
    return ''
  },

  onDeleteHistoryItem(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const historyRecords = (this.data.historyRecords || []).filter(item => item.id !== id)
    this.setData({ historyRecords })
    this.writeHistory(historyRecords)
  },

  onClearHistoryTap() {
    wx.showModal({
      title: '清空历史',
      content: '确认清空全部历史记录？',
      success: ({ confirm }) => {
        if (!confirm) return
        this.setData({ historyRecords: [] })
        this.writeHistory([])
      }
    })
  },

  validateEncryptInput() {
    if (!this.data.plainText || !this.data.plainText.trim()) return '请输入要加密的文本'
    const selected = this.getSelectedAlgorithm()
    if (selected !== 'base64' && (!this.data.passphrase || this.data.passphrase.length < 6)) return '密码短语至少 6 位'
    return ''
  },

  validateDecryptInput() {
    if (!this.data.cipherText || !this.data.cipherText.trim()) return '请输入要解密的密文'
    const parts = String(this.data.cipherText).trim().split('.')
    const version = parts[0]
    if ((version === 'v1' && parts.length === 4) || (version === 'v2' && parts.length === 3) || (version === 'v3' && parts.length === 3) || (version === 'v5' && parts.length === 4)) {
      if (!this.data.passphrase || this.data.passphrase.length < 6) return '密码短语至少 6 位'
      return ''
    }
    if (version === 'v4' && parts.length === 2) return ''
    return '密文格式无效，支持 v1.salt.iv.cipher、v2.salt.cipher、v3.salt.cipher、v4.cipher、v5.salt.iv.cipher'
  },

  getAlgorithmOptions() {
    return ALGORITHM_OPTIONS.map(item => ({ ...item }))
  },

  getAlgorithmNameById(algorithmId) {
    const hit = ALGORITHM_OPTIONS.find(item => item.id === algorithmId)
    if (hit) return hit.name
    return LEGACY_ALGORITHM_NAMES[algorithmId] || '未知算法'
  },

  getVersionByAlgorithmId(algorithmId) {
    return VERSION_MAP[algorithmId] || 'v5'
  },

  getAlgorithmIdByVersion(version) {
    const hit = Object.keys(VERSION_MAP).find(key => VERSION_MAP[key] === version)
    return hit || 'xxtea'
  },

  resolveAlgorithmById(algorithmId) {
    return algorithmId
  },

  getSelectedAlgorithm() {
    const options = Array.isArray(this.data.algorithmOptions) ? this.data.algorithmOptions : []
    const idx = Number(this.data.selectedAlgorithmIndex)
    const picked = Number.isFinite(idx) ? options[idx] : null
    const byIndex = picked && picked.id ? picked.id : ''
    const byState = this.data.selectedAlgorithm || ''
    const resolved = this.resolveAlgorithmById(byIndex || byState)
    return resolved || 'aes-cbc-js'
  },

  getSubtleCrypto() {
    if (typeof wx !== 'undefined' && wx && wx.crypto && wx.crypto.subtle) return wx.crypto.subtle
    if (typeof crypto !== 'undefined' && crypto && crypto.subtle) return crypto.subtle
    if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) return globalThis.crypto.subtle
    return null
  },

  getRandomBytes(length) {
    const bytes = new Uint8Array(length)
    if (typeof wx !== 'undefined' && typeof wx.getRandomValues === 'function') {
      try {
        wx.getRandomValues(bytes)
        if (!this.isAllZeroBytes(bytes)) return bytes
      } catch (err) {}
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      try {
        crypto.getRandomValues(bytes)
        if (!this.isAllZeroBytes(bytes)) return bytes
      } catch (err) {}
    }
    for (let i = 0; i < bytes.length; i++) {
      const random = Math.floor(Math.random() * 256)
      const noise = (Date.now() + i * 17 + ((Math.random() * 0x10000) | 0)) & 0xff
      bytes[i] = (random ^ noise) & 0xff
    }
    if (this.isAllZeroBytes(bytes) && bytes.length) {
      bytes[0] = ((Date.now() ^ 0xa5) & 0xff) || 1
    }
    return bytes
  },

  isAllZeroBytes(bytes) {
    for (let i = 0; i < bytes.length; i++) {
      if (bytes[i] !== 0) return false
    }
    return true
  },

  utf8ToBytes(text) {
    const str = String(text || '')
    const encoded = unescape(encodeURIComponent(str))
    const bytes = new Uint8Array(encoded.length)
    for (let i = 0; i < encoded.length; i++) {
      bytes[i] = encoded.charCodeAt(i)
    }
    return bytes
  },

  bytesToUtf8(bytes) {
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return decodeURIComponent(escape(binary))
  },

  toBase64(bytes) {
    if (typeof wx !== 'undefined' && typeof wx.arrayBufferToBase64 === 'function') {
      return wx.arrayBufferToBase64(bytes.buffer)
    }
    let binary = ''
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    if (typeof btoa === 'function') return btoa(binary)
    throw new Error('缺少 Base64 编码能力')
  },

  fromBase64(base64Text) {
    const value = String(base64Text || '')
    if (typeof wx !== 'undefined' && typeof wx.base64ToArrayBuffer === 'function') {
      return new Uint8Array(wx.base64ToArrayBuffer(value))
    }
    if (typeof atob === 'function') {
      const binary = atob(value)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }
    throw new Error('缺少 Base64 解码能力')
  },

  async deriveKey(passphrase, salt, usages) {
    const subtle = this.getSubtleCrypto()
    if (!subtle) throw new Error('当前环境不支持 AES-GCM')
    const passphraseBytes = this.utf8ToBytes(passphrase)
    const baseKey = await subtle.importKey(
      'raw',
      passphraseBytes,
      'PBKDF2',
      false,
      ['deriveKey']
    )
    return subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt.buffer,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      baseKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      usages
    )
  },

  buildPayloadAes(salt, iv, cipherBytes) {
    return [
      'v1',
      this.toBase64(salt),
      this.toBase64(iv),
      this.toBase64(cipherBytes)
    ].join('.')
  },

  buildPayloadAesCbc(salt, iv, cipherBytes) {
    return [
      'v5',
      this.toBase64(salt),
      this.toBase64(iv),
      this.toBase64(cipherBytes)
    ].join('.')
  },

  parsePayload(payload) {
    const parts = String(payload || '').trim().split('.')
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new Error('密文格式无效，应为 v1.salt.iv.cipher')
    }
    let salt
    let iv
    let cipherBytes
    try {
      salt = this.fromBase64(parts[1])
      iv = this.fromBase64(parts[2])
      cipherBytes = this.fromBase64(parts[3])
    } catch (err) {
      throw new Error('密文格式无效，Base64 解析失败')
    }
    if (salt.length !== SALT_LENGTH || iv.length !== IV_LENGTH || !cipherBytes.length) {
      throw new Error('密文结构无效，请确认输入内容')
    }
    return { salt, iv, cipherBytes }
  },

  parsePayloadAesCbc(payload) {
    const parts = String(payload || '').trim().split('.')
    if (parts.length !== 4 || parts[0] !== 'v5') {
      throw new Error('密文格式无效，应为 v5.salt.iv.cipher')
    }
    let salt
    let iv
    let cipherBytes
    try {
      salt = this.fromBase64(parts[1])
      iv = this.fromBase64(parts[2])
      cipherBytes = this.fromBase64(parts[3])
    } catch (err) {
      throw new Error('密文格式无效，Base64 解析失败')
    }
    if (salt.length !== SALT_LENGTH || iv.length !== CBC_IV_LENGTH || !cipherBytes.length || cipherBytes.length % 16 !== 0) {
      throw new Error('密文结构无效，请确认输入内容')
    }
    return { salt, iv, cipherBytes }
  },

  async encryptText(plainText, passphrase) {
    const selectedAlgorithm = this.getSelectedAlgorithm()
    if (selectedAlgorithm === 'aes-cbc-js') {
      return this.encryptTextAesCbcJs(plainText, passphrase)
    }
    if (selectedAlgorithm === 'aes-gcm') {
      return this.encryptTextAes(plainText, passphrase)
    }
    if (selectedAlgorithm === 'xxtea') return this.encryptTextCompat(plainText, passphrase)
    if (selectedAlgorithm === 'rc4') return this.encryptTextRc4(plainText, passphrase)
    if (selectedAlgorithm === 'base64') return this.encryptTextBase64(plainText)
    throw new Error('当前算法不可用')
  },

  async encryptTextAes(plainText, passphrase) {
    const subtle = this.getSubtleCrypto()
    if (!subtle) throw new Error('当前环境不支持 AES-GCM')
    const salt = this.getRandomBytes(SALT_LENGTH)
    const iv = this.getRandomBytes(IV_LENGTH)
    const key = await this.deriveKey(passphrase, salt, ['encrypt'])
    const plainBytes = this.utf8ToBytes(plainText)
    const encrypted = await subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv.buffer
      },
      key,
      plainBytes
    )
    const cipherBytes = new Uint8Array(encrypted)
    return this.buildPayloadAes(salt, iv, cipherBytes)
  },

  async decryptText(payload, passphrase) {
    const parts = String(payload || '').trim().split('.')
    const version = parts[0]
    const selected = this.data.selectedAlgorithm
    const expectedVersion = this.getVersionByAlgorithmId(this.resolveAlgorithmById(selected))
    if (expectedVersion !== version) {
      throw new Error('当前算法选择与密文版本不匹配，请切换算法后重试')
    }
    if (version === 'v5') return this.decryptTextAesCbcJs(payload, passphrase)
    if (version === 'v1') return this.decryptTextAes(payload, passphrase)
    if (version === 'v2') return this.decryptTextCompat(payload, passphrase)
    if (version === 'v3') return this.decryptTextRc4(payload, passphrase)
    if (version === 'v4') return this.decryptTextBase64(payload)
    throw new Error('密文格式无效，支持 v1/v2/v3/v4/v5')
  },

  async decryptTextAes(payload, passphrase) {
    const subtle = this.getSubtleCrypto()
    if (!subtle) throw new Error('当前环境不支持 v1 格式解密，请在支持 AES-GCM 的环境中操作')
    const { salt, iv, cipherBytes } = this.parsePayload(payload)
    const key = await this.deriveKey(passphrase, salt, ['decrypt'])
    try {
      const decrypted = await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv.buffer
        },
        key,
        cipherBytes
      )
      return this.bytesToUtf8(new Uint8Array(decrypted))
    } catch (err) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
  },

  encryptTextAesCbcJs(plainText, passphrase) {
    const salt = this.getRandomBytes(SALT_LENGTH)
    const iv = this.getRandomBytes(CBC_IV_LENGTH)
    const key = this.deriveAesCbcKey(passphrase, salt)
    const plainBytes = this.utf8ToBytes(plainText)
    const cipherBytes = this.aesCbcEncrypt(plainBytes, key, iv)
    return this.buildPayloadAesCbc(salt, iv, cipherBytes)
  },

  decryptTextAesCbcJs(payload, passphrase) {
    const { salt, iv, cipherBytes } = this.parsePayloadAesCbc(payload)
    const key = this.deriveAesCbcKey(passphrase, salt)
    try {
      const plainBytes = this.aesCbcDecrypt(cipherBytes, key, iv)
      return this.bytesToUtf8(plainBytes)
    } catch (err) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
  },

  encryptTextCompat(plainText, passphrase) {
    const salt = this.getRandomBytes(COMPAT_SALT_LENGTH)
    const saltBase64 = this.toBase64(salt)
    const key = this.deriveCompatKey(passphrase, salt)
    const sign = this.hashToHex(this.fnv1a32(this.utf8ToBytes(`${plainText}|${passphrase}|${saltBase64}`)))
    const packedText = `${sign}${plainText}`
    const packedBytes = this.utf8ToBytes(packedText)
    const encrypted = this.xxteaEncrypt(packedBytes, key)
    return `v2.${saltBase64}.${this.toBase64(encrypted)}`
  },

  decryptTextCompat(payload, passphrase) {
    const parts = String(payload || '').trim().split('.')
    if (parts.length !== 3 || parts[0] !== 'v2') {
      throw new Error('密文格式无效，应为 v2.salt.cipher')
    }
    let salt
    let cipherBytes
    try {
      salt = this.fromBase64(parts[1])
      cipherBytes = this.fromBase64(parts[2])
    } catch (err) {
      throw new Error('密文格式无效，Base64 解析失败')
    }
    if (!salt.length || !cipherBytes.length) {
      throw new Error('密文结构无效，请确认输入内容')
    }
    const key = this.deriveCompatKey(passphrase, salt)
    const decryptedBytes = this.xxteaDecrypt(cipherBytes, key)
    let packedText = ''
    try {
      packedText = this.bytesToUtf8(decryptedBytes)
    } catch (err) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    if (!packedText || packedText.length < 8) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    const sign = packedText.slice(0, 8)
    const plainText = packedText.slice(8)
    const expected = this.hashToHex(this.fnv1a32(this.utf8ToBytes(`${plainText}|${passphrase}|${parts[1]}`)))
    if (sign !== expected) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    return plainText
  },

  encryptTextRc4(plainText, passphrase) {
    const salt = this.getRandomBytes(COMPAT_SALT_LENGTH)
    const saltBase64 = this.toBase64(salt)
    const sign = this.hashToHex(this.fnv1a32(this.utf8ToBytes(`${plainText}|${passphrase}|${saltBase64}`)))
    const packedText = `${sign}${plainText}`
    const keyBytes = this.utf8ToBytes(`${passphrase}|${saltBase64}`)
    const encrypted = this.rc4(this.utf8ToBytes(packedText), keyBytes)
    return `v3.${saltBase64}.${this.toBase64(encrypted)}`
  },

  decryptTextRc4(payload, passphrase) {
    const parts = String(payload || '').trim().split('.')
    if (parts.length !== 3 || parts[0] !== 'v3') {
      throw new Error('密文格式无效，应为 v3.salt.cipher')
    }
    let cipherBytes
    try {
      cipherBytes = this.fromBase64(parts[2])
    } catch (err) {
      throw new Error('密文格式无效，Base64 解析失败')
    }
    const keyBytes = this.utf8ToBytes(`${passphrase}|${parts[1]}`)
    const decryptedBytes = this.rc4(cipherBytes, keyBytes)
    let packedText = ''
    try {
      packedText = this.bytesToUtf8(decryptedBytes)
    } catch (err) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    if (!packedText || packedText.length < 8) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    const sign = packedText.slice(0, 8)
    const plainText = packedText.slice(8)
    const expected = this.hashToHex(this.fnv1a32(this.utf8ToBytes(`${plainText}|${passphrase}|${parts[1]}`)))
    if (sign !== expected) {
      throw new Error('解密失败，请检查密文与密码是否匹配')
    }
    return plainText
  },

  encryptTextBase64(plainText) {
    const plainBytes = this.utf8ToBytes(plainText)
    return `v4.${this.toBase64(plainBytes)}`
  },

  decryptTextBase64(payload) {
    const parts = String(payload || '').trim().split('.')
    if (parts.length !== 2 || parts[0] !== 'v4') {
      throw new Error('密文格式无效，应为 v4.cipher')
    }
    try {
      return this.bytesToUtf8(this.fromBase64(parts[1]))
    } catch (err) {
      throw new Error('解密失败，请检查密文格式')
    }
  },

  deriveCompatKey(passphrase, saltBytes) {
    const passBytes = this.utf8ToBytes(passphrase)
    const material = this.concatBytes(passBytes, saltBytes)
    const key = new Uint8Array(16)
    for (let i = 0; i < 4; i++) {
      const withSalt = new Uint8Array(material.length + 1)
      withSalt.set(material, 0)
      withSalt[material.length] = i + 1
      const hash = this.fnv1a32(withSalt)
      key[i * 4] = hash & 0xff
      key[i * 4 + 1] = (hash >>> 8) & 0xff
      key[i * 4 + 2] = (hash >>> 16) & 0xff
      key[i * 4 + 3] = (hash >>> 24) & 0xff
    }
    return key
  },

  deriveAesCbcKey(passphrase, saltBytes) {
    const passBytes = this.utf8ToBytes(passphrase)
    const material = this.concatBytes(passBytes, saltBytes)
    const out = new Uint8Array(32)
    let prev = 0x811c9dc5
    for (let i = 0; i < 8; i++) {
      const input = new Uint8Array(material.length + 8)
      input.set(material, 0)
      input[material.length] = prev & 0xff
      input[material.length + 1] = (prev >>> 8) & 0xff
      input[material.length + 2] = (prev >>> 16) & 0xff
      input[material.length + 3] = (prev >>> 24) & 0xff
      input[material.length + 4] = i & 0xff
      input[material.length + 5] = (i >>> 8) & 0xff
      input[material.length + 6] = 0xa5
      input[material.length + 7] = 0x5a
      prev = this.fnv1a32(input) >>> 0
      out[i * 4] = prev & 0xff
      out[i * 4 + 1] = (prev >>> 8) & 0xff
      out[i * 4 + 2] = (prev >>> 16) & 0xff
      out[i * 4 + 3] = (prev >>> 24) & 0xff
      prev = ((prev << 13) | (prev >>> 19)) >>> 0
    }
    return out
  },

  getAesTables() {
    if (this._aesTables) return this._aesTables
    const sbox = new Uint8Array(256)
    const invSbox = new Uint8Array(256)
    sbox[0] = 0x63
    invSbox[0x63] = 0
    let p = 1
    let q = 1
    do {
      p = p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)
      p &= 0xff
      q ^= q << 1
      q ^= q << 2
      q ^= q << 4
      q ^= q & 0x80 ? 0x09 : 0
      q &= 0xff
      const x = q ^ this.rotl8(q, 1) ^ this.rotl8(q, 2) ^ this.rotl8(q, 3) ^ this.rotl8(q, 4) ^ 0x63
      sbox[p] = x
      invSbox[x] = p
    } while (p !== 1)
    const rcon = new Uint8Array(15)
    rcon[1] = 0x01
    for (let i = 2; i < rcon.length; i++) {
      rcon[i] = this.gfMul(rcon[i - 1], 0x02)
    }
    this._aesTables = { sbox, invSbox, rcon }
    return this._aesTables
  },

  aesCbcEncrypt(plainBytes, keyBytes, ivBytes) {
    if (keyBytes.length !== 32) throw new Error('AES 密钥长度错误')
    if (ivBytes.length !== CBC_IV_LENGTH) throw new Error('AES IV 长度错误')
    const roundKeys = this.expandAesKey(keyBytes)
    const input = this.pkcs7Pad(plainBytes, 16)
    const out = new Uint8Array(input.length)
    let prev = new Uint8Array(ivBytes)
    for (let offset = 0; offset < input.length; offset += 16) {
      const block = input.slice(offset, offset + 16)
      for (let i = 0; i < 16; i++) block[i] ^= prev[i]
      const encrypted = this.aesEncryptBlock(block, roundKeys)
      out.set(encrypted, offset)
      prev = encrypted
    }
    return out
  },

  aesCbcDecrypt(cipherBytes, keyBytes, ivBytes) {
    if (keyBytes.length !== 32) throw new Error('AES 密钥长度错误')
    if (ivBytes.length !== CBC_IV_LENGTH) throw new Error('AES IV 长度错误')
    if (!cipherBytes.length || cipherBytes.length % 16 !== 0) throw new Error('AES 密文长度错误')
    const roundKeys = this.expandAesKey(keyBytes)
    const out = new Uint8Array(cipherBytes.length)
    let prev = new Uint8Array(ivBytes)
    for (let offset = 0; offset < cipherBytes.length; offset += 16) {
      const block = cipherBytes.slice(offset, offset + 16)
      const decrypted = this.aesDecryptBlock(block, roundKeys)
      for (let i = 0; i < 16; i++) {
        out[offset + i] = decrypted[i] ^ prev[i]
      }
      prev = block
    }
    return this.pkcs7Unpad(out, 16)
  },

  expandAesKey(keyBytes) {
    const { sbox, rcon } = this.getAesTables()
    const nk = 8
    const nr = 14
    const totalWords = 4 * (nr + 1)
    const words = new Uint32Array(totalWords)
    for (let i = 0; i < nk; i++) {
      words[i] = (
        (keyBytes[i * 4] << 24) |
        (keyBytes[i * 4 + 1] << 16) |
        (keyBytes[i * 4 + 2] << 8) |
        keyBytes[i * 4 + 3]
      ) >>> 0
    }
    for (let i = nk; i < totalWords; i++) {
      let temp = words[i - 1]
      if (i % nk === 0) {
        temp = (this.subWord(this.rotWord(temp), sbox) ^ (rcon[i / nk] << 24)) >>> 0
      } else if (i % nk === 4) {
        temp = this.subWord(temp, sbox)
      }
      words[i] = (words[i - nk] ^ temp) >>> 0
    }
    return words
  },

  aesEncryptBlock(input, roundKeys) {
    const state = new Uint8Array(input)
    const nr = 14
    this.addRoundKey(state, roundKeys, 0)
    for (let round = 1; round < nr; round++) {
      this.subBytes(state)
      this.shiftRows(state)
      this.mixColumns(state)
      this.addRoundKey(state, roundKeys, round)
    }
    this.subBytes(state)
    this.shiftRows(state)
    this.addRoundKey(state, roundKeys, nr)
    return state
  },

  aesDecryptBlock(input, roundKeys) {
    const state = new Uint8Array(input)
    const nr = 14
    this.addRoundKey(state, roundKeys, nr)
    for (let round = nr - 1; round > 0; round--) {
      this.invShiftRows(state)
      this.invSubBytes(state)
      this.addRoundKey(state, roundKeys, round)
      this.invMixColumns(state)
    }
    this.invShiftRows(state)
    this.invSubBytes(state)
    this.addRoundKey(state, roundKeys, 0)
    return state
  },

  addRoundKey(state, roundKeys, round) {
    const base = round * 4
    for (let c = 0; c < 4; c++) {
      const word = roundKeys[base + c]
      const idx = c * 4
      state[idx] ^= (word >>> 24) & 0xff
      state[idx + 1] ^= (word >>> 16) & 0xff
      state[idx + 2] ^= (word >>> 8) & 0xff
      state[idx + 3] ^= word & 0xff
    }
  },

  subBytes(state) {
    const { sbox } = this.getAesTables()
    for (let i = 0; i < 16; i++) state[i] = sbox[state[i]]
  },

  invSubBytes(state) {
    const { invSbox } = this.getAesTables()
    for (let i = 0; i < 16; i++) state[i] = invSbox[state[i]]
  },

  shiftRows(state) {
    const t = new Uint8Array(state)
    state[1] = t[5]
    state[5] = t[9]
    state[9] = t[13]
    state[13] = t[1]
    state[2] = t[10]
    state[6] = t[14]
    state[10] = t[2]
    state[14] = t[6]
    state[3] = t[15]
    state[7] = t[3]
    state[11] = t[7]
    state[15] = t[11]
  },

  invShiftRows(state) {
    const t = new Uint8Array(state)
    state[1] = t[13]
    state[5] = t[1]
    state[9] = t[5]
    state[13] = t[9]
    state[2] = t[10]
    state[6] = t[14]
    state[10] = t[2]
    state[14] = t[6]
    state[3] = t[7]
    state[7] = t[11]
    state[11] = t[15]
    state[15] = t[3]
  },

  mixColumns(state) {
    for (let c = 0; c < 4; c++) {
      const i = c * 4
      const a0 = state[i]
      const a1 = state[i + 1]
      const a2 = state[i + 2]
      const a3 = state[i + 3]
      state[i] = (this.gfMul(a0, 2) ^ this.gfMul(a1, 3) ^ a2 ^ a3) & 0xff
      state[i + 1] = (a0 ^ this.gfMul(a1, 2) ^ this.gfMul(a2, 3) ^ a3) & 0xff
      state[i + 2] = (a0 ^ a1 ^ this.gfMul(a2, 2) ^ this.gfMul(a3, 3)) & 0xff
      state[i + 3] = (this.gfMul(a0, 3) ^ a1 ^ a2 ^ this.gfMul(a3, 2)) & 0xff
    }
  },

  invMixColumns(state) {
    for (let c = 0; c < 4; c++) {
      const i = c * 4
      const a0 = state[i]
      const a1 = state[i + 1]
      const a2 = state[i + 2]
      const a3 = state[i + 3]
      state[i] = (this.gfMul(a0, 14) ^ this.gfMul(a1, 11) ^ this.gfMul(a2, 13) ^ this.gfMul(a3, 9)) & 0xff
      state[i + 1] = (this.gfMul(a0, 9) ^ this.gfMul(a1, 14) ^ this.gfMul(a2, 11) ^ this.gfMul(a3, 13)) & 0xff
      state[i + 2] = (this.gfMul(a0, 13) ^ this.gfMul(a1, 9) ^ this.gfMul(a2, 14) ^ this.gfMul(a3, 11)) & 0xff
      state[i + 3] = (this.gfMul(a0, 11) ^ this.gfMul(a1, 13) ^ this.gfMul(a2, 9) ^ this.gfMul(a3, 14)) & 0xff
    }
  },

  pkcs7Pad(dataBytes, blockSize) {
    const remain = dataBytes.length % blockSize
    const padSize = remain === 0 ? blockSize : (blockSize - remain)
    const out = new Uint8Array(dataBytes.length + padSize)
    out.set(dataBytes, 0)
    out.fill(padSize, dataBytes.length)
    return out
  },

  pkcs7Unpad(dataBytes, blockSize) {
    if (!dataBytes.length || dataBytes.length % blockSize !== 0) throw new Error('填充无效')
    const padSize = dataBytes[dataBytes.length - 1]
    if (!padSize || padSize > blockSize) throw new Error('填充无效')
    for (let i = dataBytes.length - padSize; i < dataBytes.length; i++) {
      if (dataBytes[i] !== padSize) throw new Error('填充无效')
    }
    return dataBytes.slice(0, dataBytes.length - padSize)
  },

  rotWord(word) {
    return (((word << 8) | (word >>> 24)) >>> 0)
  },

  subWord(word, sbox) {
    const b0 = sbox[(word >>> 24) & 0xff]
    const b1 = sbox[(word >>> 16) & 0xff]
    const b2 = sbox[(word >>> 8) & 0xff]
    const b3 = sbox[word & 0xff]
    return (((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0)
  },

  rotl8(value, shift) {
    return (((value << shift) | (value >>> (8 - shift))) & 0xff)
  },

  gfMul(a, b) {
    let x = a & 0xff
    let y = b & 0xff
    let result = 0
    while (y > 0) {
      if (y & 1) result ^= x
      const high = x & 0x80
      x = (x << 1) & 0xff
      if (high) x ^= 0x1b
      y >>>= 1
    }
    return result & 0xff
  },

  concatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length)
    out.set(a, 0)
    out.set(b, a.length)
    return out
  },

  fnv1a32(bytes) {
    let hash = 0x811c9dc5
    for (let i = 0; i < bytes.length; i++) {
      hash ^= bytes[i]
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    return hash >>> 0
  },

  hashToHex(hash) {
    return (`00000000${(hash >>> 0).toString(16)}`).slice(-8)
  },

  rc4(dataBytes, keyBytes) {
    if (!keyBytes || !keyBytes.length) return dataBytes
    const s = new Uint8Array(256)
    for (let i = 0; i < 256; i++) s[i] = i
    let j = 0
    for (let i = 0; i < 256; i++) {
      j = (j + s[i] + keyBytes[i % keyBytes.length]) & 0xff
      const tmp = s[i]
      s[i] = s[j]
      s[j] = tmp
    }
    const out = new Uint8Array(dataBytes.length)
    let i = 0
    j = 0
    for (let n = 0; n < dataBytes.length; n++) {
      i = (i + 1) & 0xff
      j = (j + s[i]) & 0xff
      const tmp = s[i]
      s[i] = s[j]
      s[j] = tmp
      const k = s[(s[i] + s[j]) & 0xff]
      out[n] = dataBytes[n] ^ k
    }
    return out
  },

  xxteaEncrypt(dataBytes, keyBytes) {
    const v = this.toUint32Array(dataBytes, true)
    const k = this.toUint32Array(keyBytes, false)
    const n = v.length - 1
    if (n < 1) return dataBytes
    let z = v[n]
    let y = v[0]
    let sum = 0
    const delta = 0x9e3779b9 >>> 0
    let q = Math.floor(6 + 52 / (n + 1))
    while (q-- > 0) {
      sum = (sum + delta) >>> 0
      const e = (sum >>> 2) & 3
      for (let p = 0; p < n; p++) {
        y = v[p + 1]
        const mx = this.xxteaMx(sum, y, z, p, e, k)
        z = v[p] = (v[p] + mx) >>> 0
      }
      y = v[0]
      const mx = this.xxteaMx(sum, y, z, n, e, k)
      z = v[n] = (v[n] + mx) >>> 0
    }
    return this.fromUint32Array(v, false)
  },

  xxteaDecrypt(dataBytes, keyBytes) {
    const v = this.toUint32Array(dataBytes, false)
    const k = this.toUint32Array(keyBytes, false)
    const n = v.length - 1
    if (n < 1) return dataBytes
    const delta = 0x9e3779b9 >>> 0
    let q = Math.floor(6 + 52 / (n + 1))
    let sum = (q * delta) >>> 0
    let y = v[0]
    let z = v[n]
    while (sum !== 0) {
      const e = (sum >>> 2) & 3
      for (let p = n; p > 0; p--) {
        z = v[p - 1]
        const mx = this.xxteaMx(sum, y, z, p, e, k)
        y = v[p] = (v[p] - mx) >>> 0
      }
      z = v[n]
      const mx = this.xxteaMx(sum, y, z, 0, e, k)
      y = v[0] = (v[0] - mx) >>> 0
      sum = (sum - delta) >>> 0
    }
    return this.fromUint32Array(v, true)
  },

  xxteaMx(sum, y, z, p, e, k) {
    return ((((z >>> 5) ^ (y << 2)) + ((y >>> 3) ^ (z << 4))) ^ ((sum ^ y) + (k[(p & 3) ^ e] ^ z))) >>> 0
  },

  toUint32Array(bytes, includeLength) {
    const length = bytes.length
    const n = ((length + 3) >>> 2)
    const result = includeLength ? new Uint32Array(n + 1) : new Uint32Array(n || 1)
    if (includeLength) {
      result[n] = length
    }
    for (let i = 0; i < length; i++) {
      result[i >>> 2] |= bytes[i] << ((i & 3) << 3)
    }
    return result
  },

  fromUint32Array(arr, includeLength) {
    const n = arr.length
    let length = n << 2
    if (includeLength) {
      const m = arr[n - 1]
      if (m < length - 7 || m > length) {
        return new Uint8Array(0)
      }
      length = m
    }
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = (arr[i >>> 2] >>> ((i & 3) << 3)) & 0xff
    }
    return bytes
  },

  formatDateTime(timestamp) {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = `${date.getMonth() + 1}`.padStart(2, '0')
    const d = `${date.getDate()}`.padStart(2, '0')
    const hh = `${date.getHours()}`.padStart(2, '0')
    const mm = `${date.getMinutes()}`.padStart(2, '0')
    const ss = `${date.getSeconds()}`.padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}:${ss}`
  },

  createHistoryId() {
    return `${Date.now()}_${Math.floor(Math.random() * 1000000)}`
  },

  normalizeHistory(records) {
    const list = Array.isArray(records) ? records : []
    const map = new Map()
    list.forEach(item => {
      if (!item || !item.id || !item.payload) return
      const payload = String(item.payload)
      const action = item.action === 'decrypt' ? 'decrypt' : 'encrypt'
      const normalized = {
        id: String(item.id),
        action,
        payload,
        createdAt: Number(item.createdAt) || Date.now(),
        createdAtText: item.createdAtText || this.formatDateTime(Number(item.createdAt) || Date.now()),
        algorithm: item.algorithm || this.data.algorithmLabel,
        version: item.version || this.data.formatVersion
      }
      map.set(`${action}|${payload}`, normalized)
    })
    return [...map.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, HISTORY_LIMIT)
  },

  readHistory() {
    if (typeof wx === 'undefined' || typeof wx.getStorageSync !== 'function') return []
    try {
      const stored = wx.getStorageSync(HISTORY_STORAGE_KEY)
      return this.normalizeHistory(stored)
    } catch (err) {
      return []
    }
  },

  writeHistory(records) {
    if (typeof wx === 'undefined' || typeof wx.setStorageSync !== 'function') return
    try {
      wx.setStorageSync(HISTORY_STORAGE_KEY, records)
    } catch (err) {}
  },

  pushHistoryRecord(action, payload) {
    if (!payload) return
    const version = String(payload).split('.')[0] || this.data.formatVersion
    const algorithmId = this.getAlgorithmIdByVersion(version)
    const record = {
      id: this.createHistoryId(),
      action: action === 'decrypt' ? 'decrypt' : 'encrypt',
      payload: String(payload),
      createdAt: Date.now(),
      createdAtText: this.formatDateTime(Date.now()),
      algorithm: this.getAlgorithmNameById(algorithmId),
      version
    }
    const historyRecords = this.normalizeHistory([record, ...(this.data.historyRecords || [])])
    this.setData({ historyRecords })
    this.writeHistory(historyRecords)
  },

  onShareAppMessage() {
    return {
      title: '加密解密文本工具',
      path: `/${this.route}`
    }
  },

  onShareTimeline() {
    return {
      title: '加密解密文本工具'
    }
  }
})
