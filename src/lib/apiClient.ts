/**
 * Lightweight fetch-based REST client factory.
 * - Attaches `Authorization: Bearer <jwt>` automatically.
 * - Throws `ApiError` on non-2xx.
 * - Bounces to /login on 401.
 *
 * Two backends (same pattern as audit-review-dashboard):
 *   AUTH_BASE    — Node claims-corebackend (auth, users, dashboard BFF)
 *   API_BASE     — Django agentic-backend (builder, ingest, execute, tools, …)
 *
 * Usage:
 *   const api = makeClient(API_BASE, '/api/builder');
 *   const data = await api.get<MyType>('/workflows/');
 */

import { clearAuth, getToken } from "@/utils/auth";
import { runtimeEnv } from "@/lib/runtimeConfig";

const rstrip = (s: string) => s.replace(/\/+$/, "");

/** Node `claims-corebackend` — identity, users, dashboard aggregation. */
export const AUTH_BASE = rstrip(
  runtimeEnv(
    "VITE_AUTH_API_BASE_URL",
    import.meta.env.VITE_AUTH_API_BASE_URL,
    "http://localhost:4000",
  ),
);

/** Django `agentic-backend` — builder / ingest / execute / agent-tools / runs. */
export const API_BASE = rstrip(
  runtimeEnv(
    "VITE_AGENTIC_API_BASE_URL",
    import.meta.env.VITE_AGENTIC_API_BASE_URL,
    "http://localhost:8000",
  ),
);

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export function makeClient(origin: string, subPath = "") {
  const base = `${rstrip(origin)}${subPath}`;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    init?: RequestInit,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(init?.headers as Record<string, string> | undefined),
    };
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
      ...init,
    });

    let payload: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (res.status === 401) {
      clearAuth();
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isPublicAuth =
        path === "/login" || path === "/register" || path === "/health";
      if (typeof window !== "undefined" && !isPublicAuth) {
        window.location.replace("/login");
      }
    }

    if (!res.ok) {
      const message =
        payload &&
        typeof payload === "object" &&
        ("error" in (payload as Record<string, unknown>) ||
          "detail" in (payload as Record<string, unknown>))
          ? String(
              (payload as Record<string, unknown>).error ??
                (payload as Record<string, unknown>).detail,
            )
          : `Request failed: ${res.status}`;
      throw new ApiError(res.status, message, payload);
    }

    return payload as T;
  }

  return {
    get: <T = unknown>(path: string, init?: RequestInit) =>
      request<T>("GET", path, undefined, init),
    post: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>("POST", path, body, init),
    put: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>("PUT", path, body, init),
    patch: <T = unknown>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>("PATCH", path, body, init),
    delete: <T = unknown>(path: string, init?: RequestInit) =>
      request<T>("DELETE", path, undefined, init),
  };
}
