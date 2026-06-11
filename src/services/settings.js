import { request } from './http'

export function fetchModelConfig() {
  return request('/api/settings/model')
}

export function saveModelConfig(payload) {
  return request('/api/settings/model', {
    method: 'PUT',
    body: payload,
  })
}

export function testModelConnection(payload) {
  return request('/api/settings/model/test', {
    method: 'POST',
    body: payload,
  })
}

export function fetchSchedulerStatus() {
  return request('/api/settings/scheduler/status')
}

export function fetchSchedulerJobLogs(limit = 20) {
  return request(`/api/settings/scheduler/job-logs?limit=${limit}`)
}

export function toggleAutoClosePipeline(enabled) {
  return request('/api/settings/scheduler/auto-close-pipeline', {
    method: 'PUT',
    body: { enabled },
  })
}

export function fetchPromptTemplates() {
  return request('/api/prompt-templates')
}

export function createPromptTemplate(payload) {
  return request('/api/prompt-templates', {
    method: 'POST',
    body: payload,
  })
}

export function updatePromptTemplate(id, payload) {
  return request(`/api/prompt-templates/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deletePromptTemplate(id) {
  return request(`/api/prompt-templates/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
