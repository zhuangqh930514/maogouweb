import { request } from './http'

export function fetchLatestNews(limit = 20) {
  return request(`/api/news/latest?limit=${limit}`)
}

export function fetchMarketIndexes() {
  return request('/api/market/indexes')
}

export function fetchMarketBreadth() {
  return request('/api/market/breadth')
}

export function fetchSectorHeatmap() {
  return request('/api/market/sectors/heatmap')
}

export function fetchSectorHotStocks(code, limit = 10) {
  return request(`/api/market/sectors/${encodeURIComponent(code)}/hot-stocks?limit=${limit}`)
}

export function fetchIndexIntraday(code) {
  return request(`/api/market/indexes/${encodeURIComponent(code)}/intraday`)
}

export function fetchIndexKline(code, period = 'day', limit = 120) {
  return request(`/api/market/indexes/${encodeURIComponent(code)}/kline?period=${period}&limit=${limit}`)
}
