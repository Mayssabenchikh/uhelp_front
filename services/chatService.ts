// /services/chatService.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? '/api'

async function getAuthHeaders(allowJson = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) headers['Authorization'] = `Bearer ${token}`
  } catch (e) {
    // ignore
  }
  if (allowJson) headers['Accept'] = 'application/json'
  return headers
}

export const chatService = {
  async fetchConversations(params: { status?: string; search?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    const url = `${API_BASE}/conversations?${qs.toString()}`
    const res = await fetch(url, { headers: await getAuthHeaders(true), credentials: 'include' })
    return res.json()
  },

  async fetchMessages(conversationId: string | number) {
    const url = `${API_BASE}/conversations/${conversationId}/messages`
    const res = await fetch(url, { headers: await getAuthHeaders(true), credentials: 'include' })
    return res.json()
  },

  async fetchQuickResponses() {
    const url = `${API_BASE}/quick-responses`
    const res = await fetch(url, { headers: await getAuthHeaders(true), credentials: 'include' })
    return res.json()
  },

  async sendMessage(conversationId: string | number | null, body: string, files: File[] = []) {
    const url = `${API_BASE}/chat/send`
    const form = new FormData()
    form.append('conversation_id', String(conversationId))
    form.append('body', body ?? '')
    files.forEach((f) => form.append('files[]', f))

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers: await getAuthHeaders(false), // don't override Content-Type for multipart
      credentials: 'include'
    })
    return res.json()
  },

  /**
   * generateQuickResponses
   * Calls POST /api/gemini/suggest with { context, language }
   * Returns whatever the backend responds with (string or object). Throws on non-2xx.
   */
  async generateQuickResponses(context: string, language = 'fr') {
    const url = `${API_BASE}/gemini/suggest`
    const payload = { context: context ?? '', language }

    // AbortController timeout (20s)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const headers = await getAuthHeaders(true)
      // We send JSON
      headers['Content-Type'] = 'application/json'

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: 'include'
      })

      clearTimeout(timeout)

      // non-OK: try to read body for debugging
      if (!res.ok) {
        let bodyText: string
        try {
          bodyText = await res.text()
        } catch (e) {
          bodyText = '<unable to read response body>'
        }
        console.error(`generateQuickResponses: server returned ${res.status}`, bodyText)
        throw new Error(`AI endpoint error ${res.status}: ${bodyText}`)
      }

      // Try parse JSON; if not JSON, return text
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        // Backend might return { suggestion: '...' } or { suggestions: [...] } or a plain string
        return data
      } else {
        const text = await res.text()
        return text
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error('generateQuickResponses: request timed out')
        throw new Error('AI request timed out')
      }
      // Re-throw with helpful message after logging
      console.error('generateQuickResponses ERROR:', err)
      throw err
    } finally {
      clearTimeout(timeout)
    }
  },
   async fetchConversationDetails(conversationId: string | number) {
    const url = `${API_BASE}/conversations/${conversationId}/details`
    const res = await fetch(url, {
      headers: await getAuthHeaders(true),
      credentials: 'include',
    })
    if (!res.ok) {
      let bodyText: string
      try {
        bodyText = await res.text()
      } catch {
        bodyText = '<unable to read response body>'
      }
      throw new Error(`fetchConversationDetails failed ${res.status}: ${bodyText}`)
    }
    return res.json()
  },
}
