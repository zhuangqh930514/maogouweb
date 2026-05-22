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
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = localStorage.getItem('maogou_access_token')
  if (token && options.auth !== false) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body,
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
    return { code: -1, message: text }
  }
}
