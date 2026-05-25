import { request } from './http'

export function searchStocks(keyword, limit = 10) {
  return request(`/api/stocks/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`)
}

export function fetchStockDetail(code) {
  return request(`/api/stocks/${encodeURIComponent(code)}`)
}

export function fetchStockKline(code, period = 'day', limit = 60) {
  return request(`/api/stocks/${encodeURIComponent(code)}/kline?period=${period}&limit=${limit}`)
}
