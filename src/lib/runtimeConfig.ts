/**
 * Runtime config for production builds.
 *
 * Vite freezes `import.meta.env.VITE_*` at `yarn build`. In prod the static
 * server serves `/config.js` which sets `window.__RUNTIME_CONFIG__` from
 * process.env at request time — so the same image can be pointed at different
 * backends without rebuilding.
 *
 * Resolution order per key: runtime window config → Vite build env → fallback.
 */

export type RuntimeConfig = {
  VITE_AUTH_API_BASE_URL?: string;
  VITE_AGENTIC_API_BASE_URL?: string;
  VITE_CLIENT_NAME?: string;
  VITE_CLIENT_LOGO?: string;
};

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

function nonEmpty(value: unknown): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : undefined;
}

export function getRuntimeConfig(): RuntimeConfig {
  return typeof window !== "undefined" ? (window.__RUNTIME_CONFIG__ ?? {}) : {};
}

/** Prefer runtime override, then Vite bake-in, then optional default. */
export function runtimeEnv(
  key: keyof RuntimeConfig,
  viteValue?: unknown,
  fallback?: string,
): string {
  return (
    nonEmpty(getRuntimeConfig()[key]) ??
    nonEmpty(viteValue) ??
    fallback ??
    ""
  );
}
