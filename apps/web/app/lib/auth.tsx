"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiBaseUrl } from "./api";

export type AuthUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
};

export type RegisterPayload = {
  username: string;
  password: string;
  email?: string;
  invite_code?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  ready: boolean;
  isAuthenticated: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  signOut: () => void;
};

const TOKEN_KEY = "pesaroute_token";
const USER_KEY = "pesaroute_user";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);
      if (storedToken) setToken(storedToken);
      if (storedUser) setUser(JSON.parse(storedUser) as AuthUser);
    } catch {
      // Ignore storage errors (private mode, etc.) and continue anonymously.
    }
    setReady(true);
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    const response = await fetch(`${apiBaseUrl()}/api/accounts/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      throw new Error("Could not sign in. Check your username and password.");
    }
    const data = (await response.json()) as { token: string; user: AuthUser };
    setToken(data.token);
    setUser(data.user);
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      // Non-fatal: session stays in memory for this tab.
    }
  }, []);

  const persist = useCallback((data: { token: string; user: AuthUser }) => {
    setToken(data.token);
    setUser(data.user);
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    } catch {
      // Non-fatal: session stays in memory for this tab.
    }
  }, []);

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await fetch(`${apiBaseUrl()}/api/accounts/register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...payload, role: "consumer" })
      });
      if (!response.ok) {
        // Surface a useful message (e.g. invite-code required, username taken).
        let detail = "Could not create your account.";
        try {
          const data = (await response.json()) as Record<string, unknown>;
          const firstKey = Object.keys(data)[0];
          const firstValue = firstKey ? data[firstKey] : undefined;
          if (Array.isArray(firstValue) && firstValue.length > 0) {
            detail = `${firstKey === "non_field_errors" ? "" : `${firstKey}: `}${String(firstValue[0])}`;
          } else if (typeof firstValue === "string") {
            detail = firstValue;
          }
        } catch {
          // keep default
        }
        throw new Error(detail);
      }
      persist((await response.json()) as { token: string; user: AuthUser });
    },
    [persist]
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // Ignore.
    }
  }, []);

  const value = useMemo<AuthState>(
    () => ({ token, user, ready, isAuthenticated: Boolean(token), signIn, register, signOut }),
    [token, user, ready, signIn, register, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
