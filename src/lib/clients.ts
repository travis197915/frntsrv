/**
 * Shared HTTP client instances.
 *
 * Auth / users / dashboard BFF → Node (AUTH_BASE).
 * Builder / ingest / execute / tools / agents / runs → Django (API_BASE).
 */

import { AUTH_BASE, API_BASE, makeClient } from "./apiClient";

/** Identity routes — /auth/* (Node). */
export const relayClient = makeClient(AUTH_BASE);

/** User management — /api/users/* (Node). */
export const usersClient = makeClient(AUTH_BASE, "/api/users");

/** ACL administration — /api/roles/* (Node). */
export const rolesClient = makeClient(AUTH_BASE, "/api/roles");

/** ACL administration — /api/permissions/* (Node). */
export const permissionsClient = makeClient(AUTH_BASE, "/api/permissions");

/** Dashboard BFF aggregation — /api/dashboard/* (Node). */
export const dashboardClient = makeClient(AUTH_BASE, "/api/dashboard");

/** Builder REST — /api/builder/* (Django agentic). */
export const builderClient = makeClient(API_BASE, "/api/builder");

/** SOP ingestion — /api/ingest/* (Django agentic). */
export const ingestClient = makeClient(API_BASE, "/api/ingest");

/** Tool registry — /api/agent-tools/* (Django agentic). */
export const toolsClient = makeClient(API_BASE, "/api/agent-tools");

/** Execution engine — /api/execute/* (Django agentic). */
export const executeClient = makeClient(API_BASE, "/api/execute");

/** Generic Django /api/* — agents, runs, etc. */
export const apiClient = makeClient(API_BASE, "/api");
