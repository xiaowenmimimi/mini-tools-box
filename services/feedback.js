const { request } = require('../utils/request')

function getFeedbackBaseUrl() {
  const app = getApp && getApp()
  const baseUrl = app && app.globalData && app.globalData.feedbackApiBaseUrl
  return String(baseUrl || '').trim().replace(/^[`'"]+|[`'"]+$/g, '')
}

function normalizeContact(contact) {
  const value = (contact || '').trim()
  if (!value) return { mail: '', link: '', text: '未提供' }
  const mail = /.+@.+\..+/.test(value) ? value : ''
  const link = /^https?:\/\//.test(value) ? value : ''
  return { mail, link, text: value }
}

function buildCommentContent(payload) {
  const {
    typeLabel,
    content,
    contactText,
    systemInfo
  } = payload
  return [
    `反馈类型：${typeLabel}`,
    `反馈内容：`,
    content,
    '',
    `联系方式：${contactText}`,
    `设备信息：${systemInfo || '-'}`
  ].join('\n')
}

function buildWalinePayload(payload) {
  const {
    typeLabel,
    content,
    contact,
    systemInfo
  } = payload

  const normalizedContact = normalizeContact(contact)

  return {
    nick: '小程序用户',
    mail: normalizedContact.mail,
    link: normalizedContact.link,
    ua: 'wechat-mini-program',
    url: 'feedback',
    comment: buildCommentContent({
      typeLabel,
      content,
      contactText: normalizedContact.text,
      systemInfo
    })
  }
}

function submitFeedback(payload) {
  const baseUrl = getFeedbackBaseUrl()
  if (!baseUrl) return Promise.reject(new Error('请先在 app.js 配置 feedbackApiBaseUrl'))
  const data = buildWalinePayload(payload)
  return request({
    baseUrl,
    url: '/api/comment',
    method: 'POST',
    data
  })
}

module.exports = {
  submitFeedback
}
