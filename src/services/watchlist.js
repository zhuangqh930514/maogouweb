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

export function removeWatchStocks(codes) {
  return request('/api/watchlist/batch-delete', {
    method: 'POST',
    body: { codes },
  })
}

export function reorderWatchStocks(codes) {
  return request('/api/watchlist/reorder', {
    method: 'PUT',
    body: { codes },
  })
}
