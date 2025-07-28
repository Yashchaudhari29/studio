
"use client";

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean | null; // null indicates loading/unknown state initially
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_STORAGE_KEY = 'app_authenticated';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Check sessionStorage on initial load (client-side only)
  useEffect(() => {
    try {
        const storedAuth = sessionStorage.getItem(SESSION_STORAGE_KEY);
        setIsAuthenticated(storedAuth === 'true');
        console.log(`[AuthProvider] Initial auth check: ${storedAuth === 'true'}`);
    } catch (error) {
         console.error("[AuthProvider] Error reading sessionStorage:", error);
         setIsAuthenticated(false); // Default to false if storage fails
    }
  }, []); // Run only once on mount

  const login = useCallback(() => {
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
        setIsAuthenticated(true);
        console.log("[AuthProvider] User logged in, session storage set.");
    } catch (error) {
        console.error("[AuthProvider] Error setting sessionStorage on login:", error);
        // Optionally show a toast or alert the user
    }
  }, []);

  const logout = useCallback(() => {
     try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        setIsAuthenticated(false);
        console.log("[AuthProvider] User logged out, session storage removed.");
        router.push('/login'); // Redirect to login after logout
     } catch (error) {
         console.error("[AuthProvider] Error removing sessionStorage on logout:", error);
     }
  }, [router]);

  // Effect to redirect if authentication state changes and user is on a protected page
  useEffect(() => {
    // Wait until authentication status is determined (not null)
    if (isAuthenticated === null) {
      return;
    }

    // If not authenticated and not already on the login page, redirect to login
    if (!isAuthenticated && pathname !== '/login') {
      console.log("[AuthProvider] Not authenticated, redirecting to /login from:", pathname);
      router.push('/login');
    }

    // If authenticated and somehow on the login page, redirect to dashboard
    if (isAuthenticated && pathname === '/login') {
      console.log("[AuthProvider] Authenticated, redirecting from /login to /");
      router.push('/');
    }
  }, [isAuthenticated, pathname, router]); // Depend on auth state and path

  // Memoize context value
  const value = useMemo(() => ({
    isAuthenticated,
    login,
    logout,
  }), [isAuthenticated, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
