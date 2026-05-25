import { request } from './http'

export function fetchWatchlist(groupName) {
  const query = groupName && groupName !== '全部' ? `?groupName=${encodeURIComponent(groupName)}` : ''
  return request(`/api/watchlist${query}`)
}

export function addWatchStock(code, groupName = '全部') {
  return request('/api/watchlist', {
    method: 'POST',
    body: { code, groupName },
  })
}

export function removeWatchStock(code) {
  return request(`/api/watchlist/${encodeURIComponent(code)}`, {
    method: 'DELETE',
  })
}
