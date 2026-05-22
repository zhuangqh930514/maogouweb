import { request } from './http'

const TOKEN_KEY = 'maogou_access_token'
const USER_KEY = 'maogou_user'

export function isAuthenticated() {
  return Boolean(localStorage.getItem(TOKEN_KEY))
}

export function getStoredUser() {
  const value = localStorage.getItem(USER_KEY)
  if (!value) {
    return null
  }
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

export async function login(payload) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    auth: false,
    body: payload,
  })
  persistAuth(data)
  return data
}

export async function register(payload) {
  const data = await request('/api/auth/register', {
    method: 'POST',
    auth: false,
    body: payload,
  })
  persistAuth(data)
  return data
}

export async function fetchCurrentUser() {
  const user = await request('/api/auth/me')
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function persistAuth(data) {
  localStorage.setItem(TOKEN_KEY, data.token)
  localStorage.setItem(USER_KEY, JSON.stringify(data.user))
}
