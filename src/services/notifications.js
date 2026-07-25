import { request } from './http'

export function fetchNotifications(limit = 20) {
  return request(`/api/ai/notifications?limit=${limit}`)
}

export function fetchUnreadNotificationCount() {
  return request('/api/ai/notifications/unread-count')
}

export function markNotificationRead(notificationId) {
  return request(`/api/ai/notifications/${notificationId}/read`, { method: 'POST' })
}
