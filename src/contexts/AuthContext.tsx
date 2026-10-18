'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface AuthUser {
  email: string;
  createdAt: string;
  /** Jour de début de semaine : 0 = lundi … 6 = dimanche */
  weekStartDay: number;
  /** Nom d'affichage ; null tant qu'il n'a pas été choisi (popup obligatoire). */
  pseudo: string | null;
  photoUrl: string | null;
}

type AuthResult = { success: boolean; error?: string };

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, pseudo: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  /** Met à jour des champs de l'utilisateur déjà connecté (ex : réglages). */
  updateUser: (changes: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Utilisateur de la session en cours, ou `null`. */
async function fetchMe(): Promise<AuthUser | null> {
  try {
    const res = await apiFetch('/api/auth/me');
    if (!res.ok) return null;
    return (await res.json()).user ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    fetchMe().then((me) => {
      if (!active) return;
      setUser(me);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  /** Connexion ou inscription : le cache d'un éventuel compte précédent ne doit pas survivre. */
  const authenticate = useCallback(
    async (endpoint: string, credentials: Record<string, string>, fallbackError: string): Promise<AuthResult> => {
      try {
        const res = await apiFetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
        const data = await res.json();
        if (!res.ok) return { success: false, error: data.error || fallbackError };
        queryClient.clear();
        setUser(data.user);
        router.push('/');
        return { success: true };
      } catch {
        return { success: false, error: 'Une erreur réseau est survenue' };
      }
    },
    [queryClient, router]
  );

  const login = useCallback(
    (email: string, password: string) =>
      authenticate('/api/auth/login', { email, password }, 'Erreur lors de la connexion'),
    [authenticate]
  );
  const register = useCallback(
    (email: string, password: string, pseudo: string) =>
      authenticate('/api/auth/register', { email, password, pseudo }, "Erreur lors de l'inscription"),
    [authenticate]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Erreur lors du logout:', err);
    } finally {
      queryClient.clear();
      setUser(null);
      router.push('/login');
    }
  }, [queryClient, router]);

  const updateUser = useCallback((changes: Partial<AuthUser>) => {
    setUser((current) => (current ? { ...current, ...changes } : current));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  return context;
}
