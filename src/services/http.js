const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  if (!headers.has('Content-Type') && options.body && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  const token = localStorage.getItem('maogou_access_token')
  if (token && options.auth !== false) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' && !isFormData ? JSON.stringify(options.body) : options.body,
  })

  const payload = await readPayload(response)
  if (response.status === 401) {
    clearAuthStorage()
    redirectToLogin()
    throw new ApiError(payload?.message || '请先登录', response.status, payload)
  }
  if (!response.ok || payload?.code !== 0) {
    throw new ApiError(payload?.message || '请求失败', response.status, payload)
  }
  return payload.data
}

function clearAuthStorage() {
  localStorage.removeItem('maogou_access_token')
  localStorage.removeItem('maogou_user')
}

function redirectToLogin() {
  if (window.location.pathname === '/login') {
    return
  }
  const redirect = encodeURIComponent(`${window.location.pathname}${window.location.search}`)
  window.location.href = `/login?redirect=${redirect}`
}

async function readPayload(response) {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return { code: -1, message: readableHttpFailure(response.status, text) }
  }
}

function readableHttpFailure(status, text) {
  const statusMessages = {
    502: '服务网关暂时无法连接后端，请稍后重试',
    503: '后端服务暂时不可用，请稍后重试',
    504: '请求处理超过网关等待时间；若刚提交的是分析任务，任务可能仍在后台运行，请查看任务进度',
  }
  if (statusMessages[status]) {
    return statusMessages[status]
  }
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  const looksLikeHtml = /<!doctype|<html|<head|<body|<title|<center/i.test(normalized)
  if (!looksLikeHtml && normalized && normalized.length <= 300) {
    return normalized
  }
  return `请求失败（HTTP ${status || '未知状态'}）`
}
