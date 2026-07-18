import {
  createContext,
  createElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { AUTH_REQUIRED_EVENT, authTokenStorage } from "../../../shared/api/apiClient";
import { logger } from "../../../shared/utils/logger";
import { authApi } from "../api/authApi";
import { AuthenticationResponse, UserInfoResponse } from "../types";

const AUTH_USER_ID_STORAGE_KEY = "vocab.auth.userId";
const AUTH_USERNAME_STORAGE_KEY = "vocab.auth.username";
const DEFAULT_TOKEN_REFRESH_INTERVAL_HOURS = 12;
const DEFAULT_TOKEN_REFRESH_THRESHOLD_HOURS = 12;

interface TokenRefreshMonitorOptions {
  intervalHours?: number;
  onRefreshFailed: (error: unknown) => void;
  onTokenRefreshed: (token: string) => void;
  readToken: () => string | null;
  refreshThresholdHours?: number;
}

interface AuthContextValue {
  clearSession: () => void;
  closeAuthPrompt: () => void;
  completeLogin: (response: AuthenticationResponse) => void;
  authPromptMessage: string | null;
  isAuthPromptOpen: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  requestAuthPrompt: (message?: string | null) => void;
  token: string | null;
  user: UserInfoResponse | null;
  userId: string | null;
  username: string | null;
  updateSessionUser: (nextUser: UserInfoResponse) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const storage = {
  getUserId: () => window.localStorage.getItem(AUTH_USER_ID_STORAGE_KEY),
  getUsername: () => window.localStorage.getItem(AUTH_USERNAME_STORAGE_KEY),
  setUserId: (userId: string) => window.localStorage.setItem(AUTH_USER_ID_STORAGE_KEY, userId),
  setUsername: (username: string) =>
    window.localStorage.setItem(AUTH_USERNAME_STORAGE_KEY, username),
  clear: () => {
    window.localStorage.removeItem(AUTH_USER_ID_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_USERNAME_STORAGE_KEY);
  }
};

const hoursToMs = (hours: number) => hours * 60 * 60 * 1000;

const decodeJwtPayload = (token: string): { exp?: number } | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const [, payload] = token.split(".");

  if (!payload) {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = normalizedPayload.padEnd(
      normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
      "="
    );

    return JSON.parse(window.atob(paddedPayload)) as { exp?: number };
  } catch (error) {
    logger.warn("Could not decode JWT payload", error instanceof Error ? error.message : undefined);
    return null;
  }
};

const getTokenExpirationTime = (token: string): number | null => {
  const exp = decodeJwtPayload(token)?.exp;

  return typeof exp === "number" ? exp * 1000 : null;
};

const isTokenExpiringWithin = (token: string, thresholdMs: number): boolean => {
  const expirationTime = getTokenExpirationTime(token);

  return expirationTime !== null && expirationTime - Date.now() <= thresholdMs;
};

export const startTokenRefreshMonitor = ({
  intervalHours = DEFAULT_TOKEN_REFRESH_INTERVAL_HOURS,
  onRefreshFailed,
  onTokenRefreshed,
  readToken,
  refreshThresholdHours = DEFAULT_TOKEN_REFRESH_THRESHOLD_HOURS
}: TokenRefreshMonitorOptions) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const intervalMs = Math.max(hoursToMs(intervalHours), 60_000);
  const refreshThresholdMs = hoursToMs(refreshThresholdHours);
  let isRefreshing = false;
  let isStopped = false;

  const refreshIfNeeded = async () => {
    if (isRefreshing || isStopped) {
      return;
    }

    const currentToken = readToken();

    if (!currentToken || !isTokenExpiringWithin(currentToken, refreshThresholdMs)) {
      return;
    }

    isRefreshing = true;

    try {
      const response = await authApi.refreshToken({ token: currentToken });

      if (!response.token) {
        logger.warn("Refresh token response was missing token");
        return;
      }

      authTokenStorage.set(response.token);
      onTokenRefreshed(response.token);
    } catch (error) {
      onRefreshFailed(error);
    } finally {
      isRefreshing = false;
    }
  };

  void refreshIfNeeded();

  const intervalId = window.setInterval(() => {
    void refreshIfNeeded();
  }, intervalMs);

  return () => {
    isStopped = true;
    window.clearInterval(intervalId);
  };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    authTokenStorage.clear();
    storage.clear();
    setToken(null);
    setUserId(null);
    setUsername(null);
    setUser(null);
  }, []);

  const requestAuthPrompt = useCallback((message?: string | null) => {
    setAuthPromptMessage(message ?? "Please sign in or create an account to continue.");
    setIsAuthPromptOpen(true);
  }, []);

  const closeAuthPrompt = useCallback(() => {
    setIsAuthPromptOpen(false);
    setAuthPromptMessage(null);
  }, []);

  const completeLogin = useCallback((response: AuthenticationResponse) => {
    if (!response.token || !response.userId) {
      logger.warn("Login response was missing session fields");
      return;
    }

    authTokenStorage.set(response.token);
    storage.setUserId(response.userId);

    if (response.username) {
      storage.setUsername(response.username);
    }

    setToken(response.token);
    setUserId(response.userId);
    setUsername(response.username ?? null);
    setIsAuthPromptOpen(false);
    setAuthPromptMessage(null);
  }, []);

  const updateSessionUser = useCallback((nextUser: UserInfoResponse) => {
    setUser(nextUser);

    if (nextUser.id) {
      storage.setUserId(nextUser.id);
      setUserId(nextUser.id);
    }

    if (nextUser.username) {
      storage.setUsername(nextUser.username);
      setUsername(nextUser.username);
    }
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      const storedToken = authTokenStorage.get();
      const storedUserId = storage.getUserId();
      const storedUsername = storage.getUsername();

      setToken(storedToken);
      setUserId(storedUserId);
      setUsername(storedUsername);

      if (!storedToken || !storedUserId) {
        setIsLoading(false);
        return;
      }

      try {
        const restoredUser = await authApi.getUserInfo(storedUserId);
        setUser(restoredUser);
        setUsername(restoredUser.username ?? storedUsername);
      } catch (error) {
        logger.warn("Session restore failed", error instanceof Error ? error.message : undefined);
        clearSession();
      } finally {
        setIsLoading(false);
      }
    };

    void restoreSession();
  }, [clearSession]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    return startTokenRefreshMonitor({
      onRefreshFailed: (error) => {
        logger.warn("Token refresh failed", error instanceof Error ? error.message : undefined);
        clearSession();
      },
      onTokenRefreshed: setToken,
      readToken: authTokenStorage.get
    });
  }, [clearSession, token]);

  useEffect(() => {
    const handleAuthRequired = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const storedToken = authTokenStorage.get();
      const storedUserId = storage.getUserId();
      const storedUsername = storage.getUsername();

      if (storedToken || storedUserId || storedUsername || token || userId || username) {
        clearSession();
      }

      requestAuthPrompt(
        detail?.message === "Unauthenticated" || !detail?.message
          ? "Your session has expired. Please sign in again to continue."
          : detail.message
      );
    };

    window.addEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);

    return () => window.removeEventListener(AUTH_REQUIRED_EVENT, handleAuthRequired);
  }, [clearSession, requestAuthPrompt, token, userId, username]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authPromptMessage,
      clearSession,
      closeAuthPrompt,
      completeLogin,
      isAuthPromptOpen,
      isAuthenticated: Boolean(token && userId),
      isLoading,
      requestAuthPrompt,
      token,
      user,
      userId,
      username,
      updateSessionUser
    }),
    [
      authPromptMessage,
      clearSession,
      closeAuthPrompt,
      completeLogin,
      isAuthPromptOpen,
      isLoading,
      requestAuthPrompt,
      token,
      updateSessionUser,
      user,
      userId,
      username
    ]
  );

  return createElement(AuthContext.Provider, { value }, children);
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
