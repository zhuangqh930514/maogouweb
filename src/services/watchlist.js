import { request } from './http'

export function fetchWatchlist(groupName) {
  const query = groupName && groupName !== '全部' ? `?groupName=${encodeURIComponent(groupName)}` : ''
  return request(`/api/watchlist${query}`)
}

export function fetchWatchlistPage({
  page = 1,
  pageSize = 50,
  view = '全部',
  keyword = '',
  sort = 'MANUAL',
  pinnedOnly = false,
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    view,
  })
  if (sort && sort !== 'MANUAL') query.set('sort', sort)
  if (keyword) query.set('keyword', keyword)
  if (pinnedOnly) query.set('pinnedOnly', 'true')
  return request(`/api/watchlist/page?${query.toString()}`)
}

export function fetchWatchlistCodes(groupName) {
  const query = groupName && groupName !== '全部' ? `?groupName=${encodeURIComponent(groupName)}` : ''
  return request(`/api/watchlist/codes${query}`)
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

export function pinWatchStock(code, pinned) {
  return request(`/api/watchlist/${encodeURIComponent(code)}/pin`, {
    method: 'PUT',
    body: { pinned },
  })
}
