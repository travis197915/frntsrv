/**
 * Build the browser-facing runtime config payload from process.env.
 * Accepts both VITE_* names and unprefixed aliases (Docker-friendly).
 */
export function buildRuntimeConfig(env = process.env) {
  const pick = (...keys) => {
    for (const key of keys) {
      const value = typeof env[key] === 'string' ? env[key].trim() : '';
      if (value) return value;
    }
    return '';
  };

  return {
    VITE_AUTH_API_BASE_URL: pick(
      'VITE_AUTH_API_BASE_URL',
      'AUTH_API_BASE_URL',
    ),
    VITE_AGENTIC_API_BASE_URL: pick(
      'VITE_AGENTIC_API_BASE_URL',
      'AGENTIC_API_BASE_URL',
    ),
    VITE_CLIENT_NAME: pick('VITE_CLIENT_NAME', 'CLIENT_NAME'),
    VITE_CLIENT_LOGO: pick('VITE_CLIENT_LOGO', 'CLIENT_LOGO'),
  };
}

/** JS body for GET /config.js — sets window.__RUNTIME_CONFIG__. */
export function renderConfigJs(env = process.env) {
  const config = buildRuntimeConfig(env);
  return `window.__RUNTIME_CONFIG__=${JSON.stringify(config)};`;
}
