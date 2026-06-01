import { createContext, useContext, useState, useCallback, ReactNode } from "react";

type User = { id: number; email: string; name: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  updateUser: (u: Partial<User>) => void;
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("user") ?? "null"); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [, setRefreshTokenState] = useState<string | null>(() => localStorage.getItem("refreshToken"));
  const [isLoading, setIsLoading] = useState(false);

  function persist(u: User, t: string, rt: string) {
    setUser(u);
    setToken(t);
    setRefreshTokenState(rt);
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("token", t);
    localStorage.setItem("refreshToken", rt);
  }

  function clearSession() {
    setUser(null);
    setToken(null);
    setRefreshTokenState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  }

  const logout = useCallback(() => clearSession(), []);

  function updateUser(partial: Partial<User>) {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem("user", JSON.stringify(updated));
      return updated;
    });
  }

  /**
   * Authenticated fetch.
   * - Attaches Bearer token from localStorage.
   * - On 401: tries to refresh the access token once, then retries.
   * - If refresh fails: clears session (forces re-login).
   * Reads from localStorage directly to avoid stale closure issues.
   */
  const authFetch = useCallback(async (
    input: RequestInfo,
    init: RequestInit = {}
  ): Promise<Response> => {
    const getToken = () => localStorage.getItem("token");

    const buildHeaders = (t: string | null) => {
      const h = new Headers(init.headers);
      if (t) h.set("Authorization", `Bearer ${t}`);
      return h;
    };

    let res = await fetch(input, { ...init, headers: buildHeaders(getToken()) });

    if (res.status === 401) {
      const rt = localStorage.getItem("refreshToken");
      let newToken: string | null = null;

      if (rt) {
        try {
          const refreshRes = await fetch("/api/auth/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: rt }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            newToken = data.token as string;
            setToken(newToken);
            localStorage.setItem("token", newToken);
          }
        } catch { /* network error — fall through to clearSession */ }
      }

      if (newToken) {
        res = await fetch(input, { ...init, headers: buildHeaders(newToken) });
      } else {
        clearSession();
      }
    }

    return res;
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Login failed"); }
      const data = await res.json();
      persist(data.user, data.token, data.refreshToken ?? "");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Registration failed"); }
      return await res.json();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
