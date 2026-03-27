'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getDefaultRouteForRole, isProtectedPath, isRoleAllowedForPath, type AppRole, type AuthUser } from '@/lib/auth/routes';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include',
      });

      if (!response.ok) {
        setUser(null);
        return null;
      }

      const data = await response.json();
      setUser(data.user as AuthUser);
      return data.user as AuthUser;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function syncUser() {
      setIsLoading(true);
      const currentUser = await refreshUser();

      if (ignore) {
        return;
      }

      if (!currentUser && isProtectedPath(pathname)) {
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }

      setIsLoading(false);
    }

    void syncUser();

    return () => {
      ignore = true;
    };
  }, [pathname, refreshUser, router]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refreshUser,
      logout,
    }),
    [isLoading, logout, refreshUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}

export function useRoleGuard(expectedRole: AppRole) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isRoleAllowedForPath(user.role, pathname)) {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }

    if (user.role !== expectedRole) {
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [expectedRole, isLoading, pathname, router, user]);

  return {
    user,
    isLoading,
    isAuthorized: Boolean(user && user.role === expectedRole && isRoleAllowedForPath(user.role, pathname)),
  };
}
