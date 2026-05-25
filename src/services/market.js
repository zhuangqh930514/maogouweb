import { request } from './http'

export function fetchLatestNews(limit = 20) {
  return request(`/api/news/latest?limit=${limit}`)
}

export function fetchMarketIndexes() {
  return request('/api/market/indexes')
}

export function fetchIndexIntraday(code) {
  return request(`/api/market/indexes/${encodeURIComponent(code)}/intraday`)
}
