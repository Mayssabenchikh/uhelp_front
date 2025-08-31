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

// axios defaults
axios.defaults.baseURL = '/';
axios.defaults.withCredentials = true; // utile si tu utilises cookie-based (Sanctum)

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);

  // initialisation synchrone du token (evite requêtes côté serveur/client mismatch)
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const t = localStorage.getItem('access_token') || localStorage.getItem('token') || null;
    if (t) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    }
    return t;
  });

  const [user, setUser] = useState<any>(null);

  // Fonction pour récupérer le cookie CSRF (pour Sanctum)
  const getCsrfToken = async () => {
    try {
      await axios.get('/sanctum/csrf-cookie');
    } catch (_error) {
      // on ignore l'erreur ici (optionnel: afficher toast)
    }
  };

  // Récupérer l'utilisateur uniquement si token présent
  useEffect(() => {
    if (!token) {
      console.log('[AppProvider] no token -> skip fetching /api/users');
      return;
    }

    let mounted = true;
    let attempts = 0;
    const maxRetries = 3;

    const fetchUser = async () => {
      attempts++;
      setIsLoading(true);
      try {
        console.log(`[AppProvider] fetching /api/users (attempt ${attempts})`);
const res = await axios.get('/api/me');
setUser(res.data.user);
        if (!mounted) return;
        // backend peut renvoyer user sous res.data.user ou directement res.data
        const payload = res.data?.user ?? res.data;
        console.log('[AppProvider] /api/users payload:', payload);
        setUser(payload);
      } catch (err: any) {
        const status = err?.response?.status;
        console.log('[AppProvider] /api/users error:', err?.response?.data ?? err?.message ?? err);
        if (status === 401) {
          // token invalide -> logout
          console.log('[AppProvider] 401 from /api/users -> logout');
          logout();
          toast.error('Session expired. Please login again.');
        } else if (status === 429 && attempts < maxRetries) {
          // throttled -> retry with backoff
          const retryAfterHeader = err.response?.headers?.['retry-after'];
          const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : Math.min(2 ** attempts, 30);
          console.log(`[AppProvider] 429 -> retry in ${retryAfter}s (attempt ${attempts})`);
          setTimeout(() => {
            if (mounted) fetchUser();
          }, retryAfter * 1000);
        } else {
          if (status === 429) {
            toast.error('Trop de requêtes vers le serveur. Réessaye plus tard.');
          } else {
            // cas générique
            toast.error('Impossible de récupérer l’utilisateur.');
          }
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, [token]);

  // register
  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await getCsrfToken(); // si tu utilises Sanctum
      const res = await axios.post(
        '/api/register',
        { name, email, password, password_confirmation: password },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );

      toast.success(res.data?.message ?? 'Registered');

      // si backend renvoie un token
      const newToken = res.data?.access_token ?? res.data?.token ?? null;
      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('token', newToken);
        }
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }

      // set user si présent dans la réponse
      const payloadUser = res.data?.user ?? res.data;
      if (payloadUser) {
        setUser(payloadUser);
      }
    } catch (err: any) {
      const errorData = err?.response?.data;
      if (errorData?.errors) {
        Object.values(errorData.errors).flat().forEach((m: any) => toast.error(String(m)));
      } else if (errorData?.message) {
        toast.error(String(errorData.message));
      } else {
        toast.error('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // login
  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      await getCsrfToken();

      const res = await axios.post(
        '/api/login',
        { email, password },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      const newToken = res.data?.access_token ?? res.data?.token ?? null;

      if (newToken) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('access_token', newToken);
          localStorage.setItem('token', newToken);
        }
        setToken(newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
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

  // logout
  
  const logout = () => {
    // Essaye d'appeler le logout sur le backend (silencieux si échec)
    axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('token');
    }
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
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
