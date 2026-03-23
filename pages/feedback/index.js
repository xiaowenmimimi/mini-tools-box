const { submitFeedback } = require('../../services/feedback')

const DRAFT_STORAGE_KEY = 'feedback_form_draft_v1'

Page({
  data: {
    typeOptions: [
      { value: 'bug', label: '问题反馈' },
      { value: 'feature', label: '功能建议' },
      { value: 'usage', label: '使用咨询' }
    ],
    typeIndex: 0,
    content: '',
    email: '',
    wantsReply: false,
    contentCount: 0,
    scenePath: '',
    submitting: false
  },

  onLoad(options = {}) {
    const scenePath = options.scene ? decodeURIComponent(options.scene) : ''
    const draft = this.readDraft()
    const content = draft.content || ''
    this.setData({
      typeIndex: Number.isInteger(draft.typeIndex) ? draft.typeIndex : 0,
      content,
      email: draft.email || '',
      wantsReply: !!draft.wantsReply,
      contentCount: content.length,
      scenePath
    })
  },

  onTypeChange(e) {
    this.setData({
      typeIndex: Number(e.detail.value) || 0
    }, () => this.writeDraft())
  },

  onContentInput(e) {
    const content = e.detail.value || ''
    this.setData({
      content,
      contentCount: content.length
    }, () => this.writeDraft())
  },

  onWantsReplyChange(e) {
    this.setData({ wantsReply: !!e.detail.value }, () => this.writeDraft())
  },

  onEmailInput(e) {
    const email = e.detail.value || ''
    this.setData({ email }, () => this.writeDraft())
  },

  async submitForm() {
    if (this.data.submitting) return
    const content = (this.data.content || '').trim()
    if (content.length < 5) {
      wx.showToast({ title: '请至少输入 5 个字', icon: 'none' })
      return
    }
    const email = (this.data.email || '').trim()
    if (this.data.wantsReply && !email) {
      wx.showToast({ title: '请填写邮箱以接收回复', icon: 'none' })
      return
    }
    if (email && !this.isValidEmail(email)) {
      wx.showToast({ title: '邮箱格式不正确', icon: 'none' })
      return
    }
    const typeInfo = this.data.typeOptions[this.data.typeIndex] || this.data.typeOptions[0]
    const systemInfo = this.getSystemInfoText()

    this.setData({ submitting: true })
    try {
      await submitFeedback({
        type: typeInfo.value,
        typeLabel: typeInfo.label,
        content,
        contact: email,
        systemInfo
      })
      this.setData({
        content: '',
        email: '',
        contentCount: 0
      })
      this.clearDraft()
      wx.showToast({ title: '提交成功', icon: 'success' })
    } catch (err) {
      const message = (err && err.message) || '提交失败，请稍后再试'
      wx.showModal({
        title: '提交失败',
        content: message,
        showCancel: false
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  getSystemInfoText() {
    try {
      const info = wx.getSystemInfoSync()
      return `${info.brand || ''} ${info.model || ''} | ${info.system || ''}`
    } catch (e) {
      return ''
    }
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')
  },

  writeDraft() {
    try {
      wx.setStorageSync(DRAFT_STORAGE_KEY, {
        typeIndex: this.data.typeIndex,
        content: this.data.content,
        email: this.data.email,
        wantsReply: this.data.wantsReply
      })
    } catch (e) {}
  },

  readDraft() {
    try {
      const data = wx.getStorageSync(DRAFT_STORAGE_KEY)
      if (!data || typeof data !== 'object') return {}
      return {
        typeIndex: Number(data.typeIndex) || 0,
        content: data.content || '',
        email: data.email || '',
        wantsReply: !!data.wantsReply
      }
    } catch (e) {
      return {}
    }
  },

  clearDraft() {
    try {
      wx.removeStorageSync(DRAFT_STORAGE_KEY)
    } catch (e) {}
  }
})
