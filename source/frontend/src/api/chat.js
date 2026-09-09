import { createApiClient } from './client'
import { getApiBaseUrl } from './baseUrl'

const client = createApiClient(getApiBaseUrl('/chat'), 15000)

export const sendChat = (payload) => client.post('/', payload)

export const listSessions = () => client.get('/sessions')
export const getSessionMessages = (sessionId) => client.get(`/sessions/${sessionId}/messages`)
export const deleteSession = (sessionId) => client.delete(`/sessions/${sessionId}`)

export async function streamChat(payload, { onMeta, onReasoning, onDelta, onDone, onError, signal } = {}) {
  const token = localStorage.getItem('token')
  const streamUrl = getApiBaseUrl('/chat/stream')
  const response = await fetch(streamUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload), signal })
  if (!response.ok || !response.body) {
    let detail = `stream request failed: ${response.status}`
    try {
      const payload = await response.json()
      detail = payload.detail || detail
    } catch { /* keep the status fallback */ }
    throw new Error(detail)
  }
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
  while (true) {
    const { value, done } = await reader.read(); if (done) break
    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n'); buffer = blocks.pop() || ''
    for (const block of blocks) {
      const event = block.match(/^event: (.+)$/m)?.[1]; const raw = block.match(/^data: (.+)$/m)?.[1]
      if (!event || !raw) continue
      const data = JSON.parse(raw)
      if (event === 'meta') onMeta?.(data)
      else if (event === 'reasoning') onReasoning?.(data)
      else if (event === 'delta') onDelta?.(data)
      else if (event === 'done') onDone?.(data)
      else if (event === 'error') onError?.(data)
    }
  }
}
