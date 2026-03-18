const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#10B981', '#14B8A6',
  '#06B6D4', '#3B82F6', '#6366F1', '#8B5CF6', '#FF8899',
  '#111827', '#475569', '#94A3B8', '#E2E8F0', '#FFFFFF'
]

Page({
  data: {
    hexInput: '#FF8899',
    rgbInput: '255, 136, 153',
    hslInput: '351, 100%, 77%',
    previewColor: '#FF8899',
    errorMsg: '',
    presetColors: PRESET_COLORS,
    pickerVisible: false,
    pickerH: 351,
    pickerS: 47,
    pickerV: 100,
    pickerPreviewColor: '#FF8899',
    pickerPanelColor: '#FF0026',
    svCursorLeft: 47,
    svCursorTop: 0,
    hueCursorLeft: 97.5
  },
  onLoad() {
    this.syncFromHex(this.data.hexInput)
  },
  onHexInput(e) {
    const hexInput = this.normalizeHexInput(e.detail.value)
    this.setData({ hexInput })
    this.syncFromHex(hexInput)
  },
  onRgbInput(e) {
    const rgbInput = e.detail.value
    this.setData({ rgbInput })
    try {
      const rgb = this.parseRgbInput(rgbInput)
      this.syncFromRgb(rgb)
    } catch (err) {
      this.setData({ errorMsg: err.message || 'RGB 格式无效' })
    }
  },
  onHslInput(e) {
    const hslInput = e.detail.value
    this.setData({ hslInput })
    try {
      const hsl = this.parseHslInput(hslInput)
      this.syncFromHsl(hsl)
    } catch (err) {
      this.setData({ errorMsg: err.message || 'HSL 格式无效' })
    }
  },
  onPresetTap(e) {
    const color = e.currentTarget.dataset.color || '#FF8899'
    this.syncFromHex(color)
  },
  openColorPicker() {
    this.updatePickerFromHex(this.data.previewColor)
    this.setData({
      pickerVisible: true,
      errorMsg: ''
    })
  },
  closeColorPicker() {
    this.setData({ pickerVisible: false })
  },
  confirmColorPicker() {
    this.syncFromHex(this.data.pickerPreviewColor)
    this.setData({ pickerVisible: false })
  },
  onSvTouchStart(e) {
    this.updateSvByTouch(e)
  },
  onSvTouchMove(e) {
    this.updateSvByTouch(e)
  },
  onHueTouchStart(e) {
    this.updateHueByTouch(e)
  },
  onHueTouchMove(e) {
    this.updateHueByTouch(e)
  },
  onPickerTouchMove() {},
  updateSvByTouch(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const query = wx.createSelectorQuery().in(this)
    query.select('#svPanel').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect || !rect.width || !rect.height) return
      const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left))
      const y = Math.max(0, Math.min(rect.height, touch.clientY - rect.top))
      const s = (x / rect.width) * 100
      const v = 100 - (y / rect.height) * 100
      this.setPickerByHsv(this.data.pickerH, s, v)
    })
  },
  updateHueByTouch(e) {
    const touch = e.touches && e.touches[0]
    if (!touch) return
    const query = wx.createSelectorQuery().in(this)
    query.select('#hueBar').boundingClientRect()
    query.exec(res => {
      const rect = res && res[0]
      if (!rect || !rect.width) return
      const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left))
      let h = (x / rect.width) * 360
      if (h >= 360) h = 359
      this.setPickerByHsv(h, this.data.pickerS, this.data.pickerV)
    })
  },
  setPickerByHsv(h, s, v) {
    const safeH = ((Number(h) % 360) + 360) % 360
    const safeS = Math.max(0, Math.min(100, Number(s)))
    const safeV = Math.max(0, Math.min(100, Number(v)))
    const previewRgb = this.hsvToRgb(safeH, safeS, safeV)
    const previewHex = this.rgbToHex(previewRgb.r, previewRgb.g, previewRgb.b)
    const panelRgb = this.hsvToRgb(safeH, 100, 100)
    const panelHex = this.rgbToHex(panelRgb.r, panelRgb.g, panelRgb.b)
    this.setData({
      pickerH: Math.round(safeH),
      pickerS: Math.round(safeS),
      pickerV: Math.round(safeV),
      pickerPreviewColor: previewHex,
      pickerPanelColor: panelHex,
      svCursorLeft: safeS,
      svCursorTop: 100 - safeV,
      hueCursorLeft: (safeH / 360) * 100
    })
  },
  updatePickerFromHex(hex) {
    if (!this.isValidHex(hex)) return
    const rgb = this.hexToRgb(hex)
    const hsv = this.rgbToHsv(rgb.r, rgb.g, rgb.b)
    this.setPickerByHsv(hsv.h, hsv.s, hsv.v)
  },
  copyValue(e) {
    const value = String(e.currentTarget.dataset.value || '')
    wx.setClipboardData({
      data: value,
      success: () => wx.showToast({ title: '已复制' })
    })
  },
  syncFromHex(hexValue) {
    if (!this.isValidHex(hexValue)) {
      this.setData({ errorMsg: 'HEX 格式无效，支持 #RGB 或 #RRGGBB' })
      return
    }
    const rgb = this.hexToRgb(hexValue)
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b)
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b)
    this.setData({
      hexInput: hex,
      rgbInput: this.formatRgb(rgb),
      hslInput: this.formatHsl(hsl),
      previewColor: hex,
      errorMsg: ''
    })
    this.updatePickerFromHex(hex)
  },
  syncFromRgb(rgb) {
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b)
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b)
    this.setData({
      hexInput: hex,
      rgbInput: this.formatRgb(rgb),
      hslInput: this.formatHsl(hsl),
      previewColor: hex,
      errorMsg: ''
    })
    this.updatePickerFromHex(hex)
  },
  syncFromHsl(hsl) {
    const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l)
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b)
    this.setData({
      hexInput: hex,
      rgbInput: this.formatRgb(rgb),
      hslInput: this.formatHsl(hsl),
      previewColor: hex,
      errorMsg: ''
    })
    this.updatePickerFromHex(hex)
  },
  normalizeHexInput(input) {
    const cleaned = String(input || '')
      .trim()
      .replace(/\s/g, '')
      .replace(/^#/, '')
      .replace(/[^0-9a-fA-F]/g, '')
      .slice(0, 6)
      .toUpperCase()
    return cleaned ? `#${cleaned}` : '#'
  },
  isValidHex(hex) {
    const value = String(hex || '').replace('#', '').toUpperCase()
    return /^[0-9A-F]{3}([0-9A-F]{3})?$/.test(value)
  },
  expandHex(hex) {
    const value = String(hex || '').replace('#', '').toUpperCase()
    if (value.length === 3) {
      return value.split('').map(ch => ch + ch).join('')
    }
    return value
  },
  hexToRgb(hex) {
    const full = this.expandHex(hex)
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16)
    }
  },
  rgbToHex(r, g, b) {
    const toHex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0').toUpperCase()
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  },
  parseRgbInput(input) {
    const matches = String(input || '').match(/\d{1,3}/g)
    if (!matches || matches.length < 3) {
      throw new Error('RGB 格式无效，示例：16, 185, 129')
    }
    const r = Number(matches[0])
    const g = Number(matches[1])
    const b = Number(matches[2])
    if (![r, g, b].every(v => Number.isInteger(v) && v >= 0 && v <= 255)) {
      throw new Error('RGB 每个通道需在 0~255')
    }
    return { r, g, b }
  },
  parseHslInput(input) {
    const matches = String(input || '').match(/-?\d+(?:\.\d+)?/g)
    if (!matches || matches.length < 3) {
      throw new Error('HSL 格式无效，示例：160, 84%, 39%')
    }
    let h = Number(matches[0])
    const s = Number(matches[1])
    const l = Number(matches[2])
    if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) {
      throw new Error('HSL 包含无效数值')
    }
    if (s < 0 || s > 100 || l < 0 || l > 100) {
      throw new Error('HSL 中 S/L 需在 0~100')
    }
    h = ((h % 360) + 360) % 360
    return { h, s, l }
  },
  rgbToHsl(r, g, b) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const diff = max - min
    let h = 0
    const l = (max + min) / 2
    let s = 0
    if (diff !== 0) {
      s = diff / (1 - Math.abs(2 * l - 1))
      if (max === rn) h = 60 * (((gn - bn) / diff) % 6)
      else if (max === gn) h = 60 * ((bn - rn) / diff + 2)
      else h = 60 * ((rn - gn) / diff + 4)
    }
    if (h < 0) h += 360
    return {
      h: Math.round(h),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  },
  rgbToHsv(r, g, b) {
    const rn = r / 255
    const gn = g / 255
    const bn = b / 255
    const max = Math.max(rn, gn, bn)
    const min = Math.min(rn, gn, bn)
    const diff = max - min
    let h = 0
    if (diff !== 0) {
      if (max === rn) h = 60 * (((gn - bn) / diff) % 6)
      else if (max === gn) h = 60 * ((bn - rn) / diff + 2)
      else h = 60 * ((rn - gn) / diff + 4)
    }
    if (h < 0) h += 360
    const s = max === 0 ? 0 : (diff / max) * 100
    const v = max * 100
    return {
      h: Math.round(h),
      s: Math.round(s),
      v: Math.round(v)
    }
  },
  hsvToRgb(h, s, v) {
    const hn = ((Number(h) % 360) + 360) % 360
    const sn = Math.max(0, Math.min(100, Number(s))) / 100
    const vn = Math.max(0, Math.min(100, Number(v))) / 100
    const c = vn * sn
    const x = c * (1 - Math.abs((hn / 60) % 2 - 1))
    const m = vn - c
    let rp = 0
    let gp = 0
    let bp = 0
    if (hn < 60) {
      rp = c
      gp = x
    } else if (hn < 120) {
      rp = x
      gp = c
    } else if (hn < 180) {
      gp = c
      bp = x
    } else if (hn < 240) {
      gp = x
      bp = c
    } else if (hn < 300) {
      rp = x
      bp = c
    } else {
      rp = c
      bp = x
    }
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255)
    }
  },
  hslToRgb(h, s, l) {
    const sn = s / 100
    const ln = l / 100
    const c = (1 - Math.abs(2 * ln - 1)) * sn
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = ln - c / 2
    let rp = 0
    let gp = 0
    let bp = 0
    if (h < 60) {
      rp = c
      gp = x
    } else if (h < 120) {
      rp = x
      gp = c
    } else if (h < 180) {
      gp = c
      bp = x
    } else if (h < 240) {
      gp = x
      bp = c
    } else if (h < 300) {
      rp = x
      bp = c
    } else {
      rp = c
      bp = x
    }
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255)
    }
  },
  formatRgb(rgb) {
    return `${rgb.r}, ${rgb.g}, ${rgb.b}`
  },
  formatHsl(hsl) {
    return `${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%`
  },
  onShareAppMessage() {
    return {
      title: '色彩转换器',
      path: `/${this.route}`
    }
  },
  onShareTimeline() {
    return {
      title: '色彩转换器'
    }
  }
})
