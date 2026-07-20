'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Interception globale de fetch côté client pour injecter le basePath /comi et rafraîchir silencieusement si 401
if (typeof window !== 'undefined' && !(window as any).__comiFetchIntercepted) {
  (window as any).__comiFetchIntercepted = true;
  const originalFetch = window.fetch;

  window.fetch = async function (input, init) {
    let url = input;
    if (typeof input === 'string' && input.startsWith('/api/')) {
      url = `/comi${input}`;
    }

    let response = await originalFetch(url, init);

    const inputStr = typeof input === 'string' ? input : '';
    const isAuthEndpoint =
      inputStr.includes('/api/auth/login') ||
      inputStr.includes('/api/auth/register') ||
      inputStr.includes('/api/auth/logout') ||
      inputStr.includes('/api/auth/refresh');

    // Si la requête renvoie 401 sur une route API hors auth, tenter le rafraîchissement silencieux
    if (response.status === 401 && !isAuthEndpoint) {
      try {
        const refreshRes = await originalFetch('/comi/api/auth/refresh', {
          method: 'POST',
        });
        if (refreshRes.ok) {
          // Rejouer la requête d'origine
          response = await originalFetch(url, init);
        }
      } catch (err) {
        console.error('Erreur rafraîchissement automatique:', err);
      }
    }

    return response;
  };
}

interface User {
  id: number;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!active) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        router.push('/');
        router.refresh();
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Erreur lors de la connexion' };
      }
    } catch {
      return { success: false, error: 'Une erreur réseau est survenue' };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        router.push('/');
        router.refresh();
        return { success: true };
      } else {
        return { success: false, error: data.error || "Erreur lors de l'inscription" };
      }
    } catch {
      return { success: false, error: 'Une erreur réseau est survenue' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erreur lors du logout:', err);
    } finally {
      setUser(null);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
