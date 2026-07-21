/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AUTH_API_BASE_URL?: string;
  readonly VITE_AGENTIC_API_BASE_URL?: string;
  readonly VITE_CLIENT_NAME?: string;
  readonly VITE_CLIENT_LOGO?: string;
  readonly VITE_DEFAULT_WORKFLOW_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
