# Relay Architecture + GraphQL Removal

**Date:** 2026-05-24  
**Repos affected:** `uhc-claims-frontend`, `uhc-claims-backend`  
**Django (`uhc-agentic-backend`):** unchanged

---

## Goal

All frontend traffic routes through the Node `uhc-claims-backend` relay. No frontend code ever calls Django directly. GraphQL (`@apollo/client`, `apollo-upload-client`, `graphql`) is fully removed. All API calls use TanStack Query.

---

## Current State

```
Frontend
  ├── REST (TanStack Query) → Node relay (port 4000) → Django (port 8000)  ✓ working
  └── GraphQL (Apollo)      → Legacy GraphQL server (port 3000)             ✗ to remove
```

GraphQL is used in:
| File | Operations |
|------|-----------|
| `useWorkflowExecution.ts` | `startRun`, `startStep`, `advanceRun`, `uploadRunFile`, `submitPreflight` |
| `activity/[id]/index.tsx` | `GET_RUN_RESULT_QUERY` |
| `ConfigPanel.tsx` | `LIST_COMBO_TEMPLATES_QUERY` |

Already-working REST paths (through Node relay):
- `/api/builder/**` → Django builder CRUD
- `/api/ingest/**` → Django SOP ingestion
- `/api/agent-tools/**` → Django tool registry
- `/license/**` → Django license

---

## Target Architecture

```
Frontend (React + TanStack Query only)
        │ VITE_API_BASE_URL = http://localhost:4000
        ▼
Node claims-backend (port 4000)
  ├── /auth/**              → own JWT (Prisma User)
  ├── /api/users/**         → own (Prisma User)
  ├── /api/builder/**       → proxy → Django :8000  [existing]
  ├── /api/ingest/**        → proxy → Django :8000  [existing]
  ├── /api/agent-tools/**   → proxy → Django :8000  [existing]
  ├── /license/**           → proxy → Django :8000  [existing]
  ├── /api/runs/**          → proxy → Django :8000  [NEW]
  ├── /api/agents/**        → proxy → Django :8000  [NEW]
  └── /api/combo-templates/**→ proxy → Django :8000 [NEW]
        ▼
Django agentic-backend (port 8000)
  /api/builder/runs/**           ← run CRUD + execution
  /api/builder/agents/**         ← agent status
  /api/builder/combo-templates/**← combo templates
```

---

## claims-backend Changes

### 1. New proxy routes (`src/routes/proxy.ts`)

Add three new proxy mounts (same pattern as existing — `requireAuth` + `makeProxy()`):

```
/api/runs/**            → Django (no path rewrite, Django handles /api/runs/**)
/api/agents/**          → Django
/api/combo-templates/** → Django
```

No other changes to claims-backend. Auth middleware is the same shared-JWT pattern.

---

## Frontend Changes

### 1. Remove GraphQL entirely

Delete:
- `src/graphql/` (all 6 files: `workflow.graphql.ts`, `transaction.graphql.ts`, `agent.graphql.ts`, `auth.graphql.ts`, `dashboard.graphql.ts`, `license.graphql.ts`)
- `src/__generated__/` (all generated files)
- `codegen.ts`

Remove from `package.json`:
- `@apollo/client`
- `apollo-upload-client`
- `graphql`
- `@graphql-codegen/cli` (devDependency)

### 2. Clean `.env` files

Remove stale vars:
- `VITE_BUILDER_API_BASE_URL` (unused, pointed directly to Django)
- `VITE_GRAPHQL_BACKEND_URL`
- `VITE_GRAPHQL_CODEGEN_URL`

### 3. Migrate `useWorkflowExecution.ts`

Replace Apollo `useMutation` calls with TanStack Query `useMutation` against Node relay REST endpoints.

New REST endpoints called:
```
POST /api/workflows/:workflowId/runs/          → start run
POST /api/runs/:runId/start-step/              → start workbench step
POST /api/runs/:runId/advance/                 → advance to next workbench
POST /api/runs/:runId/upload/                  → upload file (multipart)
POST /api/runs/:runId/submit-preflight/        → preflight (multipart: excel, pdf, claimId)
```

Response shapes match existing `WorkflowRunFields` / `WorkbenchRunFields` GraphQL types — same field names, just returned as JSON from REST.

File upload (`uploadRunFile`, `submitPreflight`) uses `fetch` with `FormData` directly — `makeClient` already supports `FormData` bodies (skips `Content-Type: application/json`).

### 4. Migrate `activity/index.tsx`

Use `useRuns` hook already in `lib/queries/runs.ts`. Remove any remaining GraphQL imports.

### 5. Migrate `activity/[id]/index.tsx`

Replace `useQuery(GET_RUN_RESULT_QUERY)` with:
- `useRun(id)` — run detail
- `useRunAgentLogs(runId, enabled)` — agent logs
- `useRunResult(runId, enabled)` — final result

All hooks already exist in `lib/queries/runs.ts`.

### 6. Migrate `agents/index.tsx` + `agents/[id]/index.tsx`

Use `useAgents` / `useAgent` hooks from `lib/queries/agents.ts`. Remove GraphQL.

### 7. Migrate `ConfigPanel.tsx`

Replace `useQuery(LIST_COMBO_TEMPLATES_QUERY)` with `useComboTemplates()` from `lib/queries/agents.ts`.

### 8. Migrate `catalogApi.ts`

Replace custom `useFetched` hook with TanStack `useQuery`. New hooks:

```ts
export const useShapeCategories = () => useQuery({ queryKey: ['catalog', 'categories'], queryFn: () => api.get('/catalog/categories/') });
export const useShapeDefinitions = () => useQuery({ queryKey: ['catalog', 'shapes'],     queryFn: () => api.get('/catalog/shapes/') });
export const useNavigation       = () => useQuery({ queryKey: ['ui', 'navigation'],      queryFn: () => api.get('/ui/navigation/') });
export const useDashboard        = () => useQuery({ queryKey: ['ui', 'dashboard'],       queryFn: () => api.get('/ui/dashboard/') });
```

### 9. Add TanStack Query hooks to `workflowsApi.ts`

Add `useWorkflows`, `useWorkflow(id)`, `useCreateWorkflow`, `useUpdateWorkflow`, `useDeleteWorkflow` hooks wrapping the existing `workflowsApi.*` functions. `catalogApi.ts` and `workflowsApi.ts` are the only two lib files still using raw promises with no React hooks.

### 10. Fix `lib/queries/runs.ts` + `lib/queries/agents.ts` base paths

Both currently use `makeClient("/api")` — paths like `/runs/`, `/agents/` resolve to `http://localhost:4000/api/runs/` which will match the new proxy routes. **No path changes needed.**

---

## Execution Flow — Deferred

Django does **not** have execution endpoints (`start-step`, `advance`, `submit-preflight`, `upload`). These will be implemented in Django in a future task.

**Current approach (Option A):** Remove Apollo now. Stub `useWorkflowExecution.ts` — the hook exists but all mutations return `{ error: 'Execution API not yet available' }` immediately. The Run button in the workflow builder remains visible but disabled with a tooltip explaining the feature is pending backend support.

Proxy routes for execution endpoints are added to Node now so Django can start returning real responses without any frontend changes once implemented:
```
POST /api/workflows/:id/runs/      → Django (future)
POST /api/runs/:id/start-step/     → Django (future)
POST /api/runs/:id/advance/        → Django (future)
POST /api/runs/:id/upload/         → Django (future)
POST /api/runs/:id/submit-preflight/ → Django (future)
```

---

## Files Changed Summary

### `uhc-claims-backend`
- `src/routes/proxy.ts` — add 3 proxy mounts

### `uhc-claims-frontend`
- **Delete:** `src/graphql/`, `src/__generated__/`, `codegen.ts`
- **Remove deps:** `@apollo/client`, `apollo-upload-client`, `graphql`, `@graphql-codegen/cli`
- **Stub:** `src/routes/workflows/execution/useWorkflowExecution.ts` (remove Apollo, return disabled stub)
- **Update:** `src/routes/activity/index.tsx`
- **Update:** `src/routes/activity/[id]/index.tsx`
- **Update:** `src/routes/agents/index.tsx`
- **Update:** `src/routes/agents/[id]/index.tsx`
- **Update:** `src/routes/workflows/components/ConfigPanel.tsx`
- **Update:** `src/lib/catalogApi.ts` (custom hooks → TanStack Query)
- **Update:** `src/lib/workflowsApi.ts` (add TanStack Query hooks)
- **Update:** `.env` + `.env.example` (remove stale vars)

---

## Constraints

- No changes to Django (`uhc-agentic-backend`)
- No new Prisma models — existing `WorkflowRun`/`WorkbenchRun` models are unused for now
- All auth stays on the shared-JWT pattern (claims-backend validates, forwards to Django)
- File uploads use native `FormData` — `makeClient` already handles this
- `main.tsx` has no `ApolloProvider` — Apollo was already broken; this makes the removal explicit
