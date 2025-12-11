import drawQrcode from '../../../../utils/weapp-qrcode.js'

Page({
  data: {
    activeTab: 0,
    inputText: '',
    size: 300, // 默认 300
    sizeType: 'fixed', // 'fixed' | 'custom'
    customSize: 300,
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
    historyList: [],
    
    // 新增状态
    marginType: 2, // 1, 2, 3 (默认2)
    textLocation: 'none', // 'none', 'top', 'bottom'
    textContent: '',
    textColor: '#000000',
    textSize: 16
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
    const type = e.currentTarget.dataset.type
    const size = e.currentTarget.dataset.size
    
    this.setData({ 
      sizeType: type,
      size: Number(size)
    })
    
    // 如果切换到自定义但值为空或不合法，暂时不生成，等待输入
    if (type === 'custom' && (size < 100 || size > 1000)) {
        return
    }
    
    this.generateQR()
  },

  onCustomSizeInput(e) {
    let val = parseInt(e.detail.value)
    if (isNaN(val)) val = 0
    this.setData({ 
        customSize: val,
        size: val
    })
    
    // 防抖生成
    if (this.sizeTimer) clearTimeout(this.sizeTimer)
    this.sizeTimer = setTimeout(() => {
        if (val >= 100 && val <= 1000) {
            this.generateQR()
        }
    }, 500)
  },

  onMarginSelect(e) {
      this.setData({ marginType: e.currentTarget.dataset.margin })
      this.generateQR()
  },

  onTextLocationSelect(e) {
      this.setData({ textLocation: e.currentTarget.dataset.loc })
      // 默认填入输入文本
      if (this.data.textLocation !== 'none' && !this.data.textContent) {
          this.setData({ textContent: this.data.inputText })
      }
      this.generateQR()
  },

  onTextContentInput(e) {
      this.setData({ textContent: e.detail.value })
      if (this.textTimer) clearTimeout(this.textTimer)
      this.textTimer = setTimeout(() => this.generateQR(), 500)
  },

  onTextColorInput(e) {
      this.setData({ textColor: e.detail.value })
      this.generateQR()
  },

  onTextSizeInput(e) {
      let val = parseInt(e.detail.value)
      if (isNaN(val)) val = 16
      this.setData({ textSize: val })
      if (this.textSizeTimer) clearTimeout(this.textSizeTimer)
      this.textSizeTimer = setTimeout(() => this.generateQR(), 500)
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

    const size = this.data.size
    // 计算边距 (伪色块: 假设 module count 约为 37, 每个模块约 size/37)
    // 这里简化处理，直接用像素值：1色块=10px, 2色块=20px, 3色块=30px (基于 size=300 的比例)
    // 动态计算更好：size / 30 * margin
    const marginUnit = Math.round(size / 33) 
    const margin = marginUnit * this.data.marginType
    
    // 二维码实际绘制大小
    const qrSize = size - (margin * 2)
    const qrX = margin
    // 初始 y，如果有文字在顶部，需要偏移
    let qrY = margin

    // 文字相关计算
    const textLoc = this.data.textLocation
    const textContent = this.data.textContent
    const textSize = this.data.textSize
    const textPadding = 10
    let textHeight = 0
    
    if (textLoc !== 'none' && textContent) {
        textHeight = textSize + textPadding * 2
    }
    
    // 画布总大小
    const canvasWidth = size
    const canvasHeight = size + textHeight
    
    // 如果文字在顶部，二维码下移
    if (textLoc === 'top') {
        qrY += textHeight
    }
    
    // 更新 Canvas 尺寸 (在 wxml 中并没有绑定 style height，这里需要注意)
    // wxml 中 canvas 是隐藏的且 fixed size。我们需要修改 wxml 让 canvas 大小动态变化，或者简单地让 canvas 足够大。
    // 目前 wxml: <canvas canvas-id="qrcodeCanvas" style="width: {{size}}px; height: {{size}}px;"></canvas>
    // 我们需要修改 wxml 的 canvas height。但这里不能直接改 wxml 结构。
    // 方案：让 canvas 始终是正方形 size，如果加了文字，图片会变形？不行。
    // 必须修改 data.canvasHeight
    this.setData({
        canvasWidth,
        canvasHeight
    })

    const options = {
      width: qrSize,
      height: qrSize,
      x: qrX,
      y: qrY,
      canvasId: 'qrcodeCanvas',
      text: this.data.inputText,
      foreground: this.data.colorDark,
      background: this.data.colorLight, // 注意：weapp-qrcode 会用这个颜色填充整个 rect (x,y,w,h)
      // 但是我们需要填充整个 canvas 背景。
      // weapp-qrcode 只能控制它画的那块区域背景。
      // 所以我们需要在 callback 里补画背景，或者先画背景。
      // 但是 weapp-qrcode 会清除画布。
      
      _this: this,
      callback: (res) => {
        // 二维码画完了。现在画背景(边距部分)和文字。
        // 由于 weapp-qrcode draw(false) 清除了画布，且只画了 qrSize 的区域 (如果它内部实现了 clip 或者 fillRect 覆盖)。
        // 实际上 weapp-qrcode 通常是画模块。背景色是它遍历画的。
        // 问题：weapp-qrcode 并没有填充 (0,0) 到 (canvasWidth, canvasHeight) 的背景。
        // 它只填充了 (x,y) 到 (x+w, y+h)。
        
        // 补救：在 callback 中，使用 ctx 绘制白色背景到边距区域和文字区域？
        // 不行，ctx.draw(true) 会覆盖在上面？或者垫在下面？
        // 如果 weapp-qrcode 里的 draw 已经执行了，我们现在画会被覆盖吗？
        // 不，canvas 是基于操作队列的。
        // 如果 weapp-qrcode 用了 draw(false)，之前的都没了。
        // 现在的 res 是 draw 的回调。说明绘制已上屏。
        // 我们再次获取 ctx，画边框和文字，然后 draw(true)。
        
        const ctx = wx.createCanvasContext('qrcodeCanvas', this)
        
        // 1. 填充背景色 (补全边距和文字区域)
        // 注意：这会覆盖已有的二维码吗？如果不小心的话。
        // 我们需要避开二维码区域，或者...
        // 更好的办法：先用白色填满整个画布，再画二维码？但 weapp-qrcode 强制清空。
        
        // 只能：画“回”字形背景？太麻烦。
        // 或者：修改 weapp-qrcode 源码支持 padding (最优雅)。
        // 既然不能改源码。
        
        // 妥协：在 draw(true) 模式下，我们只能往上叠。
        // 如果我们画一个带孔的矩形？
        // 或者：直接画文字。边距部分如果是透明的，保存成图片就是透明的（png）。如果用户想要白色边距，那就有问题。
        // 通常保存到相册是 jpg，透明变黑？或者 png 透明变白？小程序 saveImageToPhotosAlbum 存的是 png/jpg。
        // 如果是透明，预览图看起来可能怪怪的。
        
        // 尝试：使用 GlobalCompositeOperation ? 小程序支持 destination-over (在现有内容后面画)
        // ctx.globalCompositeOperation = 'destination-over'
        // ctx.setFillStyle(this.data.colorLight)
        // ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        
        // 绘制文字
        if (textLoc !== 'none' && textContent) {
            ctx.setFillStyle(this.data.textColor)
            ctx.setFontSize(textSize)
            ctx.setTextAlign('center')
            ctx.setTextBaseline('middle')
            
            let textY = 0
            if (textLoc === 'top') {
                textY = textHeight / 2
            } else {
                textY = size + textHeight / 2
            }
            
            ctx.fillText(textContent, size / 2, textY)
        }
        
        // 绘制背景 (使用 destination-over)
        ctx.globalCompositeOperation = 'destination-over'
        ctx.setFillStyle(this.data.colorLight)
        ctx.fillRect(0, 0, canvasWidth, canvasHeight)
        
        ctx.draw(true, () => {
            // 生成图片临时路径
            setTimeout(() => {
              wx.canvasToTempFilePath({
                canvasId: 'qrcodeCanvas',
                width: canvasWidth,
                height: canvasHeight,
                destWidth: canvasWidth, // 保持 1:1 或更高清
                destHeight: canvasHeight,
                success: (res) => {
                  this.setData({ previewImg: res.tempFilePath })
                },
                fail: (err) => {
                  console.error('Preview gen failed', err)
                }
              }, this)
            }, 100)
        })
      }
    }

    if (this.data.logoPath) {
      const logoSize = qrSize * 0.2
      const logoPos = (qrSize - logoSize) / 2
      options.image = {
        imageResource: this.data.logoPath,
        dx: logoPos, // 这里的 dx 是相对于 x 的偏移吗？查看源码 weapp-qrcode-src.js:
        // ctx.drawImage(..., options.image.dx, options.image.dy, ...)
        // 它是直接用 dx, dy。没有加上 options.x。
        // 所以我们需要手动加上 qrX, qrY
        dx: qrX + logoPos,
        dy: qrY + logoPos,
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
    // 微信小程序暂不支持直接通过API识别本地图片二维码
    // 只能调用 wx.scanCode 并在界面中选择相册
    // 为了避免用户先选图后又跳出扫码界面的困惑，直接进入扫码界面
    wx.showToast({
      title: '请点击右下角"相册"',
      icon: 'none',
      duration: 2000
    })
    
    setTimeout(() => {
      wx.scanCode({
        onlyFromCamera: false,
        scanType: ['qrCode', 'barCode', 'datamatrix', 'pdf417'],
        success: (res) => {
          this.handleScanResult(res.result)
        },
        fail: (err) => {
          if (!err.errMsg.includes('cancel')) {
            wx.showToast({ title: '识别失败', icon: 'none' })
          }
        }
      })
    }, 500)
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
