/**
 * Shared HTTP client instances.
 *
 * Every module that needs to hit the relay imports from here instead of
 * calling `makeClient` ad-hoc. This guarantees one base-URL per service.
 */

import { makeClient } from "./apiClient";

/** Identity routes — /auth/* (Node, no proxy). */
export const relayClient = makeClient("");

/** Builder REST — /api/builder/* (proxied to Django). */
export const builderClient = makeClient("/api/builder");

/** SOP ingestion — /api/ingest/* (proxied to Django). */
export const ingestClient = makeClient("/api/ingest");

/** Tool registry — /api/agent-tools/* (proxied to Django). */
export const toolsClient = makeClient("/api/agent-tools");

/** Execution engine — /api/execute/* (proxied to Django). */
export const executeClient = makeClient("/api/execute");

/** User management — /api/users/* (Node, no proxy). */
export const usersClient = makeClient("/api/users");

/** Generic /api/* — used by query hooks (agents, runs, dashboard). */
export const apiClient = makeClient("/api");
