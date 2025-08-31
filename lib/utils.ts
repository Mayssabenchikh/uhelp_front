
export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ')

export const formatDate = (date?: string | null) => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleString()
  } catch {
    return date
  }
}

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'open':
      return 'bg-red-500'
    case 'pending':
      return 'bg-yellow-500'
    case 'resolved':
      return 'bg-green-500'
    default:
      return 'bg-gray-500'
  }
}

export const getRoleColor = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'text-red-500'
    case 'agent':
      return 'text-blue-500'
    default:
      return 'text-gray-500'
  }
}
// lib/utils.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Lecture simple d'un cookie par nom (pour XSRF token stocké dans XSRF-TOKEN)
 */
export function getCookie(name: string): string | null {
  const match = document.cookie.split(';').map(c => c.trim()).find(c => c.startsWith(name + '='))
  if (!match) return null
  const value = match.split('=')[1]
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Récupère le token XSRF depuis les cookies (Laravel met XSRF-TOKEN)
 */
export function getXsrfTokenFromCookie(): string | null {
  return getCookie('XSRF-TOKEN')
}

/**
 * Call /sanctum/csrf-cookie to obtain the CSRF cookie (must be called before stateful requests)
 * returns true if ok, throws otherwise
 */
export async function ensureCsrf(): Promise<void> {
  // appelle l'endpoint Sanctum qui met en place le cookie XSRF-TOKEN
  await fetch(`${API_BASE}/sanctum/csrf-cookie`, {
    credentials: 'include',
    method: 'GET',
  })
}


/**
 * Prepare headers. If you also store a Bearer token (personal access token),
 * keep sending it — Sanctum supports both cookie-based and token-based.
 */
export function getAuthHeaders(withCsrf = false): Record<string,string> {
  const headers: Record<string,string> = {
    Accept: 'application/json',
  }
  if (withCsrf) {
    const xsrf = getCookie('XSRF-TOKEN') // note: Laravel met XSRF-TOKEN cookie
    if (xsrf) headers['X-XSRF-TOKEN'] = xsrf
    headers['Content-Type'] = 'application/json'
  }
  // si tu utilises un Bearer token, ajoute-le ici
  // if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

