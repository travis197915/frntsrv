/**
 * When true, dashboard, workflow, and **agents** views use local demo data and skip their GraphQL queries
 * (agents list/detail use `src/routes/agents/demoRegistryAgents.ts`).
 * Login, `licenseStatus`, and user management (settings / users) still use `VITE_GRAPHQL_BACKEND_URL` (claims-node-backend).
 * Set to `false` to drive dashboard, agents, workflows, and transactions from the API when those backends are ready.
 */
export const STATIC_PAGES_MODE = false;
