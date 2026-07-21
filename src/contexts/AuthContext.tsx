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
import type { User, UserRole } from '@/utils/user';
import { canWrite, hasPermission as checkPermission, isAdmin } from '@/utils/user';
import { AUTH_USER_KEY, clearToken, getToken, setToken } from '@/utils/auth';
import { authApi, type AuthResponse, type CorebackendUser } from '@/lib/api';

/**
 * Auth flows talk REST to the **Node** `claims-corebackend` (identity
 * service: `/auth/login`, `/auth/register`, `/auth/me`).  Builder data —
 * workflows, catalog, sidebar, dashboard — comes from the Django builder app,
 * but uses the **same** JWT since both services share `JWT_SECRET`.
 */

function toUserRole(role: CorebackendUser['role'] | 'MEMBER'): UserRole {
  return role === 'ADMIN' ? 'ADMIN' : 'AUDITOR';
}

export const ADMIN_ONLY_MESSAGE =
  'This platform is restricted to admin users. Please use the Claims Audit Review application.';

function assertAdminAccess(u: User): void {
  if (!isAdmin(u.role)) {
    clearToken();
    saveUserToStorage(null);
    throw new Error(ADMIN_ONLY_MESSAGE);
  }
}

function adaptUser(u: CorebackendUser): User {
  return {
    id:          u.id,
    email:       u.email,
    name:        u.name || u.email,
    role:        toUserRole(u.role),
    permissions: u.permissions ?? [],
    status:      u.isActive ? 'ACTIVE' : 'INACTIVE',
    createdAt:   u.createdAt,
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
  register: (email: string, password: string, name?: string) => Promise<void>;
  completeMicrosoftLogin: (token: string) => Promise<void>;
  logout: () => void;
  /** Checks a resource-scoped permission key (e.g. "workflows:edit") against the current user's grants. */
  hasPermission: (permissionKey: string) => boolean;
  isAdmin: boolean;
  canWrite: boolean;
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
  const [user, setUser] = useState<User | null>(() => {
    const stored = loadUserFromStorage();
    if (stored && !isAdmin(stored.role)) {
      clearToken();
      saveUserToStorage(null);
      return null;
    }
    return stored;
  });
  const [isLoading, setIsLoading] = useState(false);

  /** Shared tail once we have a verified user + token, regardless of which login path produced them. */
  const applySession = useCallback((u: User, token: string) => {
    assertAdminAccess(u);
    setToken(token);
    setUser(u);
    saveUserToStorage(u);
    return u;
  }, []);

  const persistSession = useCallback(
    (payload: AuthResponse) => {
      if (!payload?.token || !payload.user) throw new Error('Invalid auth response');
      return applySession(adaptUser(payload.user), payload.token);
    },
    [applySession],
  );

  const completeMicrosoftLogin = useCallback(
    async (token: string) => {
      setIsLoading(true);
      try {
        setToken(token);
        const res = await authApi.get<{ user: CorebackendUser }>('/auth/me');
        applySession(adaptUser(res.user), token);
        navigate('/workflows', { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [applySession, navigate],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const payload = await authApi.post<AuthResponse>('/auth/login', { email, password });
        persistSession(payload);
        navigate('/workflows', { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, persistSession],
  );

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setIsLoading(true);
      try {
        const payload = await authApi.post<AuthResponse>('/auth/register', {
          email,
          password,
          name,
        });
        persistSession(payload);
        navigate('/workflows', { replace: true });
      } finally {
        setIsLoading(false);
      }
    },
    [navigate, persistSession],
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    saveUserToStorage(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const hasPermission = useCallback(
    (permissionKey: string) => {
      if (!user) return false;
      return checkPermission(user.permissions, permissionKey);
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
        assertAdminAccess(u);
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
      register,
      completeMicrosoftLogin,
      logout,
      hasPermission,
      isAdmin: user ? isAdmin(user.role) : false,
      canWrite: user ? canWrite(user.role) : false,
    }),
    [user, isLoading, login, register, completeMicrosoftLogin, logout, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
