import { request } from './http'

export function fetchHomeOverview() {
  return request('/api/home/overview')
}
