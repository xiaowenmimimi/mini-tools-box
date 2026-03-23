function joinUrl(baseUrl, path) {
  if (!baseUrl) return path
  if (/^https?:\/\//.test(path)) return path
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}

function request(options = {}) {
  const {
    url = '',
    method = 'GET',
    data = {},
    header = {},
    timeout = 12000,
    baseUrl = ''
  } = options

  const finalUrl = joinUrl(baseUrl, url)
  if (!finalUrl || !/^https?:\/\//.test(finalUrl)) {
    return Promise.reject(new Error(`反馈服务地址无效: ${finalUrl || 'EMPTY_URL'}`))
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalUrl,
      method,
      data,
      timeout,
      header: {
        'content-type': 'application/json',
        ...header
      },
      success: ({ statusCode, data: responseData }) => {
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseData || {})
          return
        }
        const message = (responseData && (responseData.msg || responseData.message || responseData.error)) || `请求失败(${statusCode})`
        reject(new Error(message))
      },
      fail: err => {
        const message = (err && err.errMsg) || '网络请求失败'
        reject(new Error(message))
      }
    })
  })
}

module.exports = {
  request
}
