import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type {
  AuthApiResponse,
  LoginApiRequest,
  PesaRouteApiClient,
  RegisterApiRequest,
  UserApiResponse,
  UserProfileApiResponse
} from "../api/client";
import type { AuthCredentials } from "../types";
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from "./tokenStorage";

type AuthContextValue = {
  user: UserApiResponse | null;
  authToken: string | null;
  auth: AuthCredentials | null;
  isAnonymous: boolean;
  isAuthenticated: boolean;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  needsPrivacyOnboarding: boolean;
  continueAnonymously: () => void;
  login: (credentials: LoginApiRequest) => Promise<void>;
  register: (payload: RegisterApiRequest) => Promise<void>;
  updateProfile: (profile: Partial<UserProfileApiResponse>) => Promise<void>;
  finishPrivacyOnboarding: () => void;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function safeErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function AuthProvider({
  apiClient,
  children
}: {
  apiClient: PesaRouteApiClient;
  children: ReactNode;
}) {
  const [user, setUser] = useState<UserApiResponse | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsPrivacyOnboarding, setNeedsPrivacyOnboarding] = useState(false);

  const applyAuth = useCallback(
    async (response: AuthApiResponse, requiresOnboarding: boolean) => {
      apiClient.setAuthToken(response.token);
      await setStoredAuthToken(response.token);
      setAuthToken(response.token);
      setUser(response.user);
      setIsAnonymous(false);
      setNeedsPrivacyOnboarding(requiresOnboarding);
    },
    [apiClient]
  );

  useEffect(() => {
    let mounted = true;
    async function restoreToken() {
      const token = await getStoredAuthToken();
      if (!mounted) return;
      if (!token) {
        setInitializing(false);
        return;
      }
      apiClient.setAuthToken(token);
      try {
        const currentUser = await apiClient.me({ username: "", token });
        if (!mounted) return;
        setAuthToken(token);
        setUser(currentUser);
      } catch {
        await clearStoredAuthToken();
        apiClient.setAuthToken(null);
      } finally {
        if (mounted) {
          setInitializing(false);
        }
      }
    }
    void restoreToken();
    return () => {
      mounted = false;
    };
  }, [apiClient]);

  const login = useCallback(
    async (credentials: LoginApiRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.login(credentials);
        await applyAuth(response, false);
      } catch (loginError) {
        setError(safeErrorMessage(loginError, "Login failed"));
        throw loginError;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, applyAuth]
  );

  const register = useCallback(
    async (payload: RegisterApiRequest) => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.register(payload);
        await applyAuth(response, true);
      } catch (registerError) {
        setError(safeErrorMessage(registerError, "Registration failed"));
        throw registerError;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, applyAuth]
  );

  const updateProfile = useCallback(
    async (profile: Partial<UserProfileApiResponse>) => {
      if (!authToken) {
        throw new Error("Login required");
      }
      setLoading(true);
      setError(null);
      try {
        const updatedUser = await apiClient.updateMe(profile, { username: user?.username ?? "", token: authToken });
        setUser(updatedUser);
      } catch (profileError) {
        setError(safeErrorMessage(profileError, "Could not update preferences"));
        throw profileError;
      } finally {
        setLoading(false);
      }
    },
    [apiClient, authToken, user?.username]
  );

  const logout = useCallback(async () => {
    await clearStoredAuthToken();
    apiClient.setAuthToken(null);
    setUser(null);
    setAuthToken(null);
    setIsAnonymous(false);
    setNeedsPrivacyOnboarding(false);
    setError(null);
  }, [apiClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      authToken,
      auth: authToken ? { username: user?.username ?? "", token: authToken } : null,
      isAnonymous,
      isAuthenticated: Boolean(authToken && user),
      initializing,
      loading,
      error,
      needsPrivacyOnboarding,
      continueAnonymously: () => {
        setIsAnonymous(true);
        setError(null);
      },
      login,
      register,
      updateProfile,
      finishPrivacyOnboarding: () => setNeedsPrivacyOnboarding(false),
      logout,
      clearError: () => setError(null)
    }),
    [authToken, error, initializing, isAnonymous, loading, login, logout, needsPrivacyOnboarding, register, updateProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
