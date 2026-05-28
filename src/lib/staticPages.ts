/**
 * When true, dashboard, workflow, and **agents** views use local demo data and skip their GraphQL queries
 * (agents list/detail use `src/routes/agents/demoRegistryAgents.ts`).
 * Legacy note: auth and user management use the Node relay (`VITE_API_BASE_URL`).
 * Set to `false` to drive dashboard, agents, workflows, and transactions from the API when those backends are ready.
 */
export const STATIC_PAGES_MODE = false;
