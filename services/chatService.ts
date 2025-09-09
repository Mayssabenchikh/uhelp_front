// services/chatService.ts
// Remplace ton fichier existant par celui-ci.

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000/api'
const AUTH_STRATEGY = (process.env.NEXT_PUBLIC_AUTH_STRATEGY ?? 'token').toLowerCase() // "token" or "cookie"
const TOKEN_KEYS = ['token', 'auth_token', 'access_token']

/** Lit le token depuis localStorage (sync-safe) */
function readStoredTokenSync(): string | null {
  if (typeof window === 'undefined') return null
  for (const k of TOKEN_KEYS) {
    try {
      const t = localStorage.getItem(k)
      if (t) return t
    } catch (e) {
      // ignore localStorage read errors
      console.debug('[readStoredTokenSync] localStorage read error', e)
    }
  }
  return null
}

/** Build auth headers depending on configured strategy. For token -> Authorization Bearer */
async function getAuthHeaders(allowJson = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {}
  if (allowJson) headers['Accept'] = 'application/json'

  try {
    if (AUTH_STRATEGY === 'token') {
      const token = readStoredTokenSync()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      } else {
        console.debug('[getAuthHeaders] token missing in localStorage')
      }
    } else {
      // cookie strategy: you may want to explicitly set X-Requested-With
      headers['X-Requested-With'] = 'XMLHttpRequest'
    }
  } catch (e) {
    console.debug('[getAuthHeaders] error reading token', e)
  }

  // IMPORTANT: do not set Content-Type here for FormData calls.
  return headers
}

/** ensureCsrf is required when using cookies (Laravel Sanctum) */
async function ensureCsrf(): Promise<void> {
  if (AUTH_STRATEGY !== 'cookie') return
  try {
    const origin = API_BASE.replace(/\/api\/?$/, '')
    await fetch(`${origin}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include'
    })
  } catch (e) {
    console.debug('ensureCsrf failed (ignored):', e)
  }
}

async function handleResponse(res: Response) {
  if (res.ok) {
    const ct = res.headers.get('content-type') ?? ''
    if (ct.includes('application/json')) return res.json()
    // No content
    if (res.status === 204) return null
    return res.text()
  } else {
    let bodyText = '<unable to read response body>'
    try { bodyText = await res.text() } catch {}
    const err = new Error(`${res.status} ${res.statusText}: ${bodyText}`)
    ;(err as any).status = res.status
    ;(err as any).body = bodyText
    throw err
  }
}

/** small helper that centralizes fetch options (headers + credentials) */
async function fetchWithAuth(url: string, opts: RequestInit = {}) {
  // If opts.headers already contain Accept: application/json or method != GET, we pass allowJson = true
  const allowJson = Boolean((opts.headers && (opts.headers as any)['Accept'] === 'application/json') || (opts.method && opts.method !== 'GET'))
  const headers = await getAuthHeaders(allowJson)
  // merge headers (don't overwrite existing)
  opts.headers = { ...(opts.headers ?? {}), ...headers }
  // include credentials for cookie strategy
  if (AUTH_STRATEGY === 'cookie') (opts as any).credentials = 'include'
  return fetch(url, opts)
}

export const chatService = {
  /** login avec credentials: pour Bearer token */
  async loginWithCredentials(credentials: { email: string; password: string }) {
    // if using cookie strategy, ensure CSRF first
    if (AUTH_STRATEGY === 'cookie') await ensureCsrf()

    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined,
      body: JSON.stringify(credentials)
    })
    const data = await handleResponse(res)

    // Store token if provided
    if (data && (data.token || data.access_token || data.auth_token)) {
      const token = data.token ?? data.access_token ?? data.auth_token
      if (typeof window !== 'undefined') {
        try { localStorage.setItem('token', token) } catch (e) { console.debug('Failed to set token in localStorage', e) }
      }
    }
    return data
  },

  async logout() {
    if (typeof window !== 'undefined') {
      // For Bearer token: just remove token locally
      if (AUTH_STRATEGY === 'token') {
        try { localStorage.removeItem('token') } catch (e) { /* ignore */ }
      }
    }

    try {
      if (AUTH_STRATEGY === 'cookie') await ensureCsrf()
      const res = await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: await getAuthHeaders(true),
        credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
      })
      return handleResponse(res)
    } catch {
      return { ok: true }
    }
  },

  async fetchConversations(params: { status?: string; search?: string } = {}) {
    const qs = new URLSearchParams()
    if (params.status) qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    const url = `${API_BASE}/conversations?${qs.toString()}`
    const res = await fetchWithAuth(url, { headers: await getAuthHeaders(true) })
    return handleResponse(res)
  },

  async fetchMessages(conversationId: string | number) {
    const url = `${API_BASE}/conversations/${conversationId}/messages`
    const res = await fetchWithAuth(url, { headers: await getAuthHeaders(true) })
    return handleResponse(res)
  },

  // removed duplicate createConversation definition

  async createConversation(payload: { title?: string; participants: number[]; type?: 'private' | 'group'; group_id?: number }) {
    const url = `${API_BASE}/conversations`
    if (AUTH_STRATEGY === 'cookie') await ensureCsrf()
    const headers = await getAuthHeaders(true)
    headers['Content-Type'] = 'application/json'
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
    })
    return handleResponse(res)
  },

  async fetchQuickResponses() {
    const url = `${API_BASE}/quick-responses`
    const res = await fetchWithAuth(url, { headers: await getAuthHeaders(true) })
    return handleResponse(res)
  },

  /**
   * Send message: uses FormData.
   * Important: call ensureCsrf() first when using cookie auth.
   */
  async sendMessage(conversationId: string | number | null, body: string, files: File[] = []) {
    const url = `${API_BASE}/chat/send`

    // Ensure CSRF (if cookie strategy)
    if (AUTH_STRATEGY === 'cookie') await ensureCsrf()

    const form = new FormData()
    form.append('conversation_id', String(conversationId))

    let messageBody = body && body.trim() ? body.trim() : ''
    if (!messageBody && files && files.length > 0) messageBody = '[Fichier(s) joint(s)]'
    form.append('body', messageBody || 'Message vide')

    if (files && files.length > 0) {
      for (const file of files) {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(`File "${file.name}" is too large. Maximum size is 50MB.`)
        }
        form.append('files[]', file)
      }
    }

    if ((!body || !body.trim()) && (!files || files.length === 0)) {
      throw new Error('Message must contain either text or attachments')
    }

    // Do NOT set Content-Type for FormData - browser will set boundary.
    let headers = await getAuthHeaders(true) // ensure Accept: application/json

    // Safety: ensure we never set Content-Type when sending FormData
    if (headers['Content-Type']) delete headers['Content-Type']

    // Quick assert: warn if Authorization missing when using token strategy
    if (AUTH_STRATEGY === 'token' && !headers['Authorization']) {
      console.warn('[sendMessage] Authorization header is missing. Ensure token is in localStorage and AUTH_STRATEGY === "token".')
    }

    const res = await fetch(url, {
      method: 'POST',
      body: form,
      headers,
      credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
    })
    return handleResponse(res)
  },
async generateFAQ(ticket: string) {
  const url = `${API_BASE}/gemini/faq`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(await getAuthHeaders(true))
    },
    body: JSON.stringify({ content: ticket }),
    credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
  })
  return handleResponse(res)
}

,
  async generateQuickResponses(context: string, language = 'fr') {
    const url = `${API_BASE}/gemini/suggest`
    const payload = { context: context ?? '', language }

    if (AUTH_STRATEGY === 'cookie') await ensureCsrf()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 20000)

    try {
      const headers = await getAuthHeaders(true)
      headers['Content-Type'] = 'application/json'
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
        credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
      })
      clearTimeout(timeout)
      return handleResponse(res)
    } catch (err: any) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') throw new Error('AI request timed out')
      throw err
    }
  },

  async me() {
    const url = `${API_BASE}/me`
    const res = await fetchWithAuth(url, {
      headers: await getAuthHeaders(true)
    })
    return handleResponse(res)
  },

  async fetchConversationDetails(conversationId: string | number) {
    const url = `${API_BASE}/conversations/${conversationId}/details`
    const res = await fetchWithAuth(url, {
      headers: await getAuthHeaders(true)
    })
    return handleResponse(res)
  },

  async joinConversation(conversationId: string | number) {
    const url = `${API_BASE}/conversations/${conversationId}/join`
    if (AUTH_STRATEGY === 'cookie') await ensureCsrf()
    const res = await fetch(url, {
      method: 'POST',
      headers: await getAuthHeaders(true),
      credentials: AUTH_STRATEGY === 'cookie' ? 'include' : undefined
    })
    return handleResponse(res)
  },

  setToken(token: string) {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('token', token) } catch (e) { console.debug('Failed to set token in localStorage', e) }
    }
  },

  clearToken() {
    if (typeof window !== 'undefined') {
      try { localStorage.removeItem('token') } catch (e) { /* ignore */ }
    }
  }
}

export default chatService
