import { request } from './http'

export function fetchChatSessions() {
  return request('/api/chat/sessions')
}

export function createChatSession(title) {
  return request('/api/chat/sessions', {
    method: 'POST',
    body: { title },
  })
}

export function fetchChatSession(sessionId) {
  return request(`/api/chat/sessions/${sessionId}`)
}

export function sendChatMessage(sessionId, content, options = {}) {
  return request(`/api/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: {
      content,
      webSearchEnabled: Boolean(options.webSearchEnabled),
    },
  })
}

export function deleteChatSession(sessionId) {
  return request(`/api/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

export function fetchChatMemory() {
  return request('/api/chat/memory')
}

export function updateChatMemory(memorySummary) {
  return request('/api/chat/memory', {
    method: 'PUT',
    body: { memorySummary },
  })
}
