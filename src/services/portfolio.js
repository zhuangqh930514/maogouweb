import { request } from './http'

export function fetchPortfolioPositions({ page = 1, pageSize = 50 } = {}) {
  return request(`/api/portfolio/positions?page=${page}&pageSize=${pageSize}`)
}

export function createBuyTrade(payload) {
  return request('/api/portfolio/trades', {
    method: 'POST',
    body: payload,
  })
}

export function removePortfolioPositions(codes) {
  return request('/api/portfolio/positions/batch-delete', {
    method: 'POST',
    body: { codes },
  })
}
