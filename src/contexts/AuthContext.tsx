import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, RoleRequirement } from '@/utils/user';
import { isAdmin } from '@/utils/user';
import { AUTH_USER_KEY, clearToken, getToken, setToken } from '@/utils/auth';
import { authApi, type AuthResponse, type CorebackendUser } from '@/lib/api';

/**
 * Auth flows talk REST to the **Node** `claims-corebackend` (identity
 * service: `/auth/login`, `/auth/me`).  Builder data — workflows, catalog,
 * sidebar, dashboard — comes from the Django builder app, but uses the
 * **same** JWT since both services share `JWT_SECRET`.
 */

function adaptUser(u: CorebackendUser): User {
  return {
    id:        u.id,
    email:     u.email,
    name:      u.name || u.email,
    // Corebackend roles are ADMIN / MEMBER; the existing UI knows ADMIN / USER.
    role:      u.role === 'ADMIN' ? 'ADMIN' : 'USER',
    status:    u.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt: u.createdAt,
  };
}

function loadUserFromStorage(): User | null {
  try {
    const raw = window.localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function saveUserToStorage(user: User | null) {
  try {
    if (user) {
      window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    /* ignore */
  }
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (roleRequired: RoleRequirement) => boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

type AuthProviderProps = { children: ReactNode };

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(() => loadUserFromStorage());
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const payload = await authApi.post<AuthResponse>('/auth/login', { email, password });
        if (!payload?.token || !payload.user) throw new Error('Invalid login response');
        const u = adaptUser(payload.user);
        setToken(payload.token);
        setUser(u);
        saveUserToStorage(u);
        navigate('/dashboard', { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    saveUserToStorage(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const hasPermission = useCallback(
    (roleRequired: RoleRequirement) => {
      if (!user) return false;
      if (roleRequired === 'ADMIN') return isAdmin(user.role);
      return true;
    },
    [user],
  );

  useEffect(() => {
    const token = getToken();
    if (!token) {
      if (user) {
        setUser(null);
        saveUserToStorage(null);
      }
      return;
    }
    // Refresh /me in the background so a stale localStorage user is healed.
    if (user) return;
    authApi
      .get<{ user: CorebackendUser }>('/auth/me')
      .then((res) => {
        const u = adaptUser(res.user);
        setUser(u);
        saveUserToStorage(u);
      })
      .catch(() => {
        clearToken();
        saveUserToStorage(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      login,
      logout,
      hasPermission,
      isAdmin: user ? isAdmin(user.role) : false,
    }),
    [user, isLoading, login, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
