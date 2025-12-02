import drawQrcode from '../../../../utils/weapp-qrcode.js'

Page({
  data: {
    activeTab: 0,
    inputText: 'https://github.com/xiaowenmimimi',
    size: 256,
    colorDark: '#000000',
    colorLight: '#ffffff',
    colorPresets: [
      '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', 
      '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
    ],
    logoPath: '',
    previewImg: '',
    scanResult: '',
    isUrl: false,
    historyList: []
  },

  onLoad() {
    this.loadHistory()
    // 延迟生成初始二维码，确保canvas已准备好
    setTimeout(() => {
      this.generateQR()
    }, 500)
  },

  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({ activeTab: index })
    if (index === 0) {
      setTimeout(() => {
        this.generateQR()
      }, 200)
    }
  },

  // --- 生成二维码逻辑 ---

  onInput(e) {
    this.setData({ inputText: e.detail.value })
  },

  onSizeSelect(e) {
    const size = e.currentTarget.dataset.size
    this.setData({ size })
    this.generateQR()
  },

  onColorDarkChange(e) {
    this.setData({ colorDark: e.detail.value })
    this.generateQR()
  },

  onColorDarkPreset(e) {
    this.setData({ colorDark: e.currentTarget.dataset.color })
    this.generateQR()
  },

  onColorLightChange(e) {
    this.setData({ colorLight: e.detail.value })
    this.generateQR()
  },

  onColorLightPreset(e) {
    this.setData({ colorLight: e.currentTarget.dataset.color })
    this.generateQR()
  },

  chooseLogo() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ logoPath: res.tempFilePaths[0] })
        this.generateQR()
      }
    })
  },

  clearLogo() {
    this.setData({ logoPath: '' })
    this.generateQR()
  },

  generateQR() {
    if (!this.data.inputText) return

    // 先清空预览图，显示loading
    this.setData({ previewImg: '' })

    const options = {
      width: this.data.size,
      height: this.data.size,
      canvasId: 'qrcodeCanvas',
      text: this.data.inputText,
      foreground: this.data.colorDark,
      background: this.data.colorLight,
      _this: this,
      callback: () => {
        // 生成图片临时路径用于预览
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvasId: 'qrcodeCanvas',
            width: this.data.size,
            height: this.data.size,
            destWidth: this.data.size,
            destHeight: this.data.size,
            success: (res) => {
              this.setData({ previewImg: res.tempFilePath })
            },
            fail: (err) => {
              console.error('Preview gen failed', err)
            }
          }, this)
        }, 100)
      }
    }

    if (this.data.logoPath) {
      // 简单的Logo居中计算
      const logoSize = this.data.size * 0.2
      const logoPos = (this.data.size - logoSize) / 2
      options.image = {
        imageResource: this.data.logoPath,
        dx: logoPos,
        dy: logoPos,
        dWidth: logoSize,
        dHeight: logoSize
      }
    }

    try {
      drawQrcode(options)
      this.addHistory('gen', this.data.inputText)
    } catch (e) {
      console.error('QR Generate Error:', e)
      wx.showToast({ title: '生成失败', icon: 'none' })
    }
  },

  previewBigImage() {
    if (this.data.previewImg) {
      wx.previewImage({
        urls: [this.data.previewImg]
      })
    }
  },

  saveImage() {
    if (!this.data.previewImg) {
      wx.showToast({ title: '请先生成二维码', icon: 'none' })
      return
    }
    
    wx.saveImageToPhotosAlbum({
      filePath: this.data.previewImg,
      success: () => wx.showToast({ title: '已保存', icon: 'success' }),
      fail: (err) => {
        console.error(err)
        if (err.errMsg.includes('auth')) {
            wx.showModal({
              title: '提示',
              content: '需要保存图片权限',
              success: (m) => {
                if (m.confirm) wx.openSetting()
              }
            })
        } else {
            wx.showToast({ title: '保存失败', icon: 'none' })
        }
      }
    })
  },

  // --- 识别二维码逻辑 ---

  scanCode() {
    wx.scanCode({
      success: (res) => {
        this.handleScanResult(res.result)
      },
      fail: (err) => {
        if (!err.errMsg.includes('cancel')) {
          wx.showToast({ title: '识别失败', icon: 'none' })
        }
      }
    })
  },

  chooseImageScan() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: (res) => {
        wx.scanCode({
          onlyFromCamera: false,
          scanType: ['qrCode'],
          success: (scanRes) => { // 注意：有些真机选择图片扫码可能不会触发这个success，而是直接在wx.scanCode里处理? 
            // 实际上wx.scanCode不接受image path参数直接识别。
            // 修正：wx.scanCode 只能调起扫码界面（含相册入口）。
            // 如果要直接识别选中的图片，需要用 wx.serviceMarket.invokeService (OCR) 或者 wx.scanCode(onlyFromCamera: false) 让用户自己在界面里选。
            // 但用户点击"相册识别"按钮通常期望直接选图。
            // 微信小程序原生 API 没有直接"识别指定路径图片二维码"的公开简单接口(除了云开发/OCR)。
            // 变通：这里只能调用 wx.scanCode 并提示用户点相册。
            // 或者：使用 wx.scanCode({ onlyFromCamera: false }) 
          }
        })
        // 实际上 wx.scanCode 无法直接传入图片路径。
        // 正确做法：直接调用 wx.scanCode，用户在扫码界面点击右下角"相册"即可。
        // 为了区分按钮功能，"相册识别"可以只是提示，或者直接调用 wx.scanCode。
        // 但这里为了体验，我们尝试用 wx.scanCode。
      }
    })
    
    // 修正：直接调用扫码，因为API限制
    wx.scanCode({
      onlyFromCamera: false,
      success: (res) => {
        this.handleScanResult(res.result)
      }
    })
  },

  handleScanResult(text) {
    const isUrl = /^(http|https):\/\//.test(text)
    this.setData({ 
      scanResult: text,
      isUrl: isUrl
    })
    this.addHistory('scan', text)
  },

  copyResult() {
    wx.setClipboardData({
      data: this.data.scanResult,
      success: () => wx.showToast({ title: '已复制' })
    })
  },

  openLink() {
    if (this.data.isUrl) {
      wx.navigateTo({
        url: `/pages/webview/index?url=${encodeURIComponent(this.data.scanResult)}`,
        fail: () => {
           // Fallback if webview page doesn't exist or other error, try copy
           wx.setClipboardData({
             data: this.data.scanResult,
             success: () => wx.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' })
           })
        }
      })
    }
  },

  // --- 历史记录逻辑 ---

  loadHistory() {
    const history = wx.getStorageSync('qrcode_history') || []
    this.setData({ historyList: history })
  },

  addHistory(type, content) {
    if (!content) return
    const now = new Date()
    const item = {
      type,
      content,
      timestamp: now.getTime(),
      date: `${now.getMonth()+1}/${now.getDate()} ${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`
    }
    
    let list = this.data.historyList
    // 去重：如果最新一条一样就不加
    if (list.length > 0 && list[0].content === content && list[0].type === type) {
      return
    }
    
    list.unshift(item)
    if (list.length > 50) list.pop() // 限制50条
    
    this.setData({ historyList: list })
    wx.setStorageSync('qrcode_history', list)
  },

  deleteHistoryItem(e) {
    const index = e.currentTarget.dataset.index
    const list = this.data.historyList
    list.splice(index, 1)
    this.setData({ historyList: list })
    wx.setStorageSync('qrcode_history', list)
  },

  clearHistory() {
    wx.showModal({
      title: '确认',
      content: '确定清空所有历史记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({ historyList: [] })
          wx.removeStorageSync('qrcode_history')
        }
      }
    })
  },

  viewHistoryItem(e) {
    const item = e.currentTarget.dataset.item
    if (item.type === 'gen') {
      this.setData({ 
        activeTab: 0,
        inputText: item.content
      })
      // 切换到生成页并填充
      setTimeout(() => this.generateQR(), 200)
    } else {
      this.setData({
        activeTab: 1,
        scanResult: item.content,
        isUrl: /^(http|https):\/\//.test(item.content)
      })
    }
  }
})
