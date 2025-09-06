export const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(' ');

export const formatDate = (date?: string | null) => {
  if (!date) return '';
  try {
    return new Date(date).toLocaleString();
  } catch {
    return date;
  }
};

export const getStatusColor = (status?: string) => {
  switch (status) {
    case 'open':
      return 'bg-red-500';
    case 'pending':
      return 'bg-yellow-500';
    case 'resolved':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
};

export const getRoleColor = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'text-red-500';
    case 'agent':
      return 'text-blue-500';
    default:
      return 'text-gray-500';
  }
};

// API base (front -> backend root, sans /api)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

/**
 * Retourne le token stocké (localStorage) si présent.
 */
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token') ?? localStorage.getItem('token') ?? null;
}

/**
 * Prépare les headers pour fetch/axios. N'inclut PAS de XSRF ni cookie.
 * Si contentTypeJson = true, ajoute 'Content-Type: application/json'.
 */
export function getAuthHeaders(contentTypeJson = false): Record<string, string> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (contentTypeJson) headers['Content-Type'] = 'application/json';
  return headers;
}