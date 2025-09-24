// context/Context.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface UserType {
  id: number;
  name: string;
  email: string;
  role: 'super_admin' | 'admin' | 'agent' | 'client';
  [key: string]: any;
}

interface AuthResult {
  success: boolean;
  message?: string;
  user?: UserType | null;
}

interface AppProviderType {
  isLoading: boolean;
  token: string | null;
  user: UserType | null;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (name: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => void;
}

const AppContext = createContext<AppProviderType | undefined>(undefined);

// configure axios baseURL to point to backend root (without trailing /api)
const API_ROOT = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
axios.defaults.baseURL = API_ROOT;
axios.defaults.withCredentials = false;

const setAxiosAuthHeader = (token?: string | null) => {
  if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  else delete axios.defaults.headers.common['Authorization'];
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('access_token') || localStorage.getItem('token') || null;
    if (t) setAxiosAuthHeader(t);
    return t;
  });

  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    if (!token) return;

    let mounted = true;
    let timeoutId: NodeJS.Timeout;

    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const res = await axios.get('/api/me');
        if (!mounted) return;
        const payload = res.data?.user ?? res.data;
        setUser(payload);
      } catch (err: any) {
        if (!mounted) return;
        const status = err?.response?.status;
        if (status === 401) {
          logout();
          toast.error('Session expiree. Connecte-toi a nouveau.');
        } else if (status === 429) {
          // Rate limited - retry after a delay  
          timeoutId = setTimeout(() => {
            if (mounted) fetchUser();
          }, 2000);
          return;
        } else {
          console.error('Error fetching user:', err);
          toast.error('Impossible de recuperer utilisateur.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    // Debounce the API call to prevent multiple rapid calls
    timeoutId = setTimeout(fetchUser, 100);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [token]);  const login = async (email: string, password: string): Promise<AuthResult> => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/login', { email, password }, {
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' }
      });

      const newToken = res.data?.access_token ?? res.data?.token ?? null;
      if (newToken) {
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setAxiosAuthHeader(newToken);
      }

      const payloadUser: UserType = res.data?.user ?? res.data;
      setUser(payloadUser ?? null);

      return { success: true, message: res.data?.message ?? 'Login successful', user: payloadUser };
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Login failed';
      toast.error(message);
      return { success: false, message, user: null };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<AuthResult> => {
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
        localStorage.setItem('access_token', newToken);
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setAxiosAuthHeader(newToken);
      }

      const payloadUser: UserType = res.data?.user ?? res.data;
      setUser(payloadUser ?? null);

      return { success: true, message: res.data?.message ?? 'Registration successful', user: payloadUser };
    } catch (err: any) {
      const message = err?.response?.data?.message ?? 'Registration failed';
      toast.error(message);
      return { success: false, message, user: null };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    localStorage.removeItem('access_token');
    localStorage.removeItem('token');
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

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
