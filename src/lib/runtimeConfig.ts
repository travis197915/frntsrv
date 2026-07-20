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

/**
 * Validates that all required runtime configuration variables are provided.
 * Throws an error if any required variables are missing.
 * Call this during app initialization to ensure proper configuration before using API endpoints.
 */
export function validateRuntimeConfig(): void {
  const config = getRuntimeConfig();
  const required: (keyof RuntimeConfig)[] = [
    "VITE_AUTH_API_BASE_URL",
    "VITE_AGENTIC_API_BASE_URL",
  ];

  const missing: string[] = [];
  for (const key of required) {
    const value = config[key];
    if (!value || value.trim() === "") {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const envVarExamples = missing
      .map((k) => {
        const unprefixed = k.replace("VITE_", "");
        return `-e ${unprefixed}=https://your-api.optum.com`;
      })
      .join(" ");

    throw new Error(
      `Missing required runtime environment variables: ${missing.join(", ")}\n\n` +
      `When running in Docker, provide them:\n` +
      `  docker run ${envVarExamples} claims-frontend:latest\n\n` +
      `Or in Azure App Services:\n` +
      `  Configuration → Application Settings → add the above variables`
    );
  }
}
