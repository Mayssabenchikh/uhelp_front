// context/Context.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface AppProviderType {
  isLoading: boolean;
  token: string | null;
  user: any;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppProviderType | undefined>(undefined);

// configure axios baseURL to point to backend root (without trailing /api)
const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
axios.defaults.baseURL = API_ROOT;
axios.defaults.withCredentials = false; // IMPORTANT: false -> no cookies

const setAxiosAuthHeader = (token?: string | null) => {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
};

/**
 * AppProvider - export nommé
 */
export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('access_token') || localStorage.getItem('token') || null;
    if (t) setAxiosAuthHeader(t);
    return t;
  });

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!token) {
      console.log('[AppProvider] no token -> skip fetching /api/me');
      return;
    }

    let mounted = true;
    let attempts = 0;
    const maxRetries = 3;

    const fetchUser = async () => {
      attempts++;
      setIsLoading(true);
      try {
        console.log(`[AppProvider] fetching /api/me (attempt ${attempts})`);
        const res = await axios.get('/api/me');
        if (!mounted) return;
        const payload = res.data?.user ?? res.data;
        setUser(payload);
      } catch (err: any) {
        const status = err?.response?.status;
        console.log('[AppProvider] /api/me error:', err?.response?.data ?? err?.message ?? err);
        if (status === 401) {
          logout();
          toast.error('Session expirée. Connecte-toi à nouveau.');
        } else if (status === 429 && attempts < maxRetries) {
          const retryAfterHeader = err.response?.headers?.['retry-after'];
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Math.min(2 ** attempts, 30);
          setTimeout(() => {
            if (mounted) fetchUser();
          }, retryAfter * 1000);
        } else {
          toast.error('Impossible de récupérer l’utilisateur.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchUser();

    return () => { mounted = false; };
  }, [token]);

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/register', {
        name,
        email,
        password,
        password_confirmation: password,
      }, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
      });

      toast.success(res.data?.message ?? 'Registered');

      const newToken = res.data?.access_token ?? res.data?.token ?? null;
      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('token', newToken);
        }
        setToken(newToken);
        setAxiosAuthHeader(newToken);
      }

      const payloadUser = res.data?.user ?? res.data;
      if (payloadUser) setUser(payloadUser);
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.errors) {
        Object.values(errorData.errors).flat().forEach((m: any) => toast.error(String(m)));
      } else if (errorData?.message) {
        toast.error(String(errorData.message));
      } else {
        toast.error('Registration failed. Please try again.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/login', { email, password }, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
      });

      const newToken = res.data?.access_token ?? res.data?.token ?? null;
      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('token', newToken);
        }
        setToken(newToken);
        setAxiosAuthHeader(newToken);
      }

      const payloadUser = res.data?.user ?? res.data;
      setUser(payloadUser ?? null);

      setIsLoading(false);
      return { success: true, message: res.data?.message ?? 'Login successful' };
    } catch (err: any) {
      setIsLoading(false);
      const validationErrors = err?.response?.data?.errors ?? null;
      const serverMessage = err?.response?.data?.message ?? null;

      if (validationErrors) {
        const first = Object.values(validationErrors).flat()[0] ?? 'Validation error';
        toast.error(String(first));
        return { success: false, message: String(first) };
      }

      if (serverMessage) {
        toast.error(String(serverMessage));
        return { success: false, message: String(serverMessage) };
      }

      const fallback = err?.request ? 'Cannot connect to server.' : 'Network error. Please try again.';
      toast.error(fallback);
      return { success: false, message: fallback };
    }
  };

  const logout = () => {
    axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    setAxiosAuthHeader(null);
    toast.success('Logged out successfully');
  };

  return (
    <AppContext.Provider value={{ isLoading, token, user, login, register, logout }}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * useAppContext - export nommé pour que tes composants puissent l'importer
 */
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
