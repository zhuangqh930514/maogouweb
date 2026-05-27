import { request } from './http'

export function fetchPortfolioPositions() {
  return request('/api/portfolio/positions')
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
