# Relay Architecture + GraphQL Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route all frontend traffic through the Node `uhc-claims-backend` relay and remove every Apollo/GraphQL dependency from the frontend.

**Architecture:** Frontend calls Node relay (port 4000) only. Node JWT-validates and proxies to Django (port 8000). Three new proxy mounts are added for `/api/runs`, `/api/agents`, and `/api/combo-templates`. Execution endpoints are stubbed in the frontend (Django doesn't have them yet) — proxy routes are added now so Django can implement them without frontend changes.

**Tech Stack:** Node/Express + http-proxy-middleware (claims-backend), React + TanStack Query v5 (frontend), no Apollo Client

---

## File Map

### `uhc-claims-backend`
| File | Change |
|------|--------|
| `src/routes/proxy.ts` | Add 3 new proxy mounts + 5 execution endpoint mounts |

### `uhc-claims-frontend`
| File | Change |
|------|--------|
| `src/routes/workflows/execution/useWorkflowExecution.ts` | Remove Apollo mutations, replace with stub |
| `src/routes/workflows/components/ConfigPanel.tsx` | Replace Apollo `useQuery` with `useComboTemplates` |
| `src/lib/catalogApi.ts` | Replace custom `useFetched` hook with TanStack `useQuery` |
| `src/lib/workflowsApi.ts` | Add TanStack Query wrapper hooks |
| `src/apollo-upload-client.d.ts` | Delete |
| `src/graphql/` (6 files) | Delete entire directory |
| `src/__generated__/` (4 files) | Delete entire directory |
| `codegen.ts` | Delete |
| `package.json` | Remove 4 Apollo/GraphQL packages |
| `.env` + `.env.example` | Remove 3 stale env vars |

---

## Task 1: Add proxy routes to claims-backend

**Files:**
- Modify: `uhc-claims-backend/src/routes/proxy.ts`

- [ ] **Step 1: Open `src/routes/proxy.ts`**

Current `mountProxies` function has 4 mounts. Replace the entire `mountProxies` function with:

```typescript
export function mountProxies(app: Application): void {
  // ── Builder REST ───────────────────────────────────────────────────────────
  app.use("/api/builder", requireAuth, makeProxy());

  // ── SOP ingestion REST ─────────────────────────────────────────────────────
  app.use("/api/ingest", requireAuth, makeProxy());

  // ── Agent-tools REST ───────────────────────────────────────────────────────
  app.use("/api/agent-tools", requireAuth, makeProxy());

  // ── License REST (upload + status) ────────────────────────────────────────
  app.use("/license", requireAuth, makeProxy());

  // ── Agent registry + combo templates ──────────────────────────────────────
  app.use("/api/agents", requireAuth, makeProxy());
  app.use("/api/combo-templates", requireAuth, makeProxy());

  // ── Run tracking ───────────────────────────────────────────────────────────
  app.use("/api/runs", requireAuth, makeProxy());

  // ── Workflow execution (Django endpoints — future implementation) ──────────
  app.use("/api/workflows", requireAuth, makeProxy());
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/uhc-claims-backend
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/routes/proxy.ts
git commit -m "feat: add proxy routes for runs, agents, combo-templates, and workflow execution"
```

---

## Task 2: Remove GraphQL files and packages

**Files:**
- Delete: `src/graphql/` (directory)
- Delete: `src/__generated__/` (directory)
- Delete: `codegen.ts`
- Delete: `src/apollo-upload-client.d.ts`
- Modify: `package.json`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Delete GraphQL source directories and files**

```bash
cd /path/to/uhc-claims-frontend
rm -rf src/graphql src/__generated__ codegen.ts src/apollo-upload-client.d.ts
```

- [ ] **Step 2: Remove Apollo and GraphQL packages**

Open `package.json`. Remove these entries from `dependencies`:
- `"@apollo/client": "..."`
- `"apollo-upload-client": "..."`
- `"graphql": "..."`

Remove from `devDependencies`:
- `"@graphql-codegen/cli": "..."` (and any `@graphql-codegen/*` plugins)

Then run:

```bash
npm install
```

Expected: `node_modules/@apollo` and `node_modules/graphql` are gone; `npm install` exits 0.

- [ ] **Step 3: Remove stale env vars from `.env`**

Remove these lines (they no longer exist in the relay architecture):
```
VITE_BUILDER_API_BASE_URL=...
VITE_GRAPHQL_BACKEND_URL=...
VITE_GRAPHQL_CODEGEN_URL=...
```

- [ ] **Step 4: Remove same vars from `.env.example`**

Same three lines removed.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .env .env.example
git status  # confirm deleted files show as deleted
git add -u  # stage deletions
git commit -m "chore: remove Apollo/GraphQL packages, generated files, and stale env vars"
```

---

## Task 3: Stub `useWorkflowExecution.ts`

**Files:**
- Modify: `src/routes/workflows/execution/useWorkflowExecution.ts`

The execution APIs don't exist in Django yet. Keep the same public interface — all callers (`ExecutionPanel`, `WorkflowBuilder`) expect the same return shape. Remove Apollo, make `startLiveExecution` immediately set status to `'failed'` with a clear message.

- [ ] **Step 1: Replace the entire file content**

```typescript
import { useCallback, useRef, useState } from 'react';
import type { NodeExecutionState, EdgeExecutionStatus } from './types';

export type RunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface PreflightInput {
  excelFile?: File;
  pdfFile?: File;
  claimId?: string;
}

export interface SopInput {
  htmlFiles: File[];
}

export interface WorkbenchRunState {
  id: string;
  workbenchId: string;
  name: string;
  executorType: string;
  status: 'pending' | 'running' | 'waiting_input' | 'completed' | 'failed';
  awaitingInput: boolean;
  inputPrompt: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  error?: string;
  claimIdsForResolution?: string[];
}

export interface ExecutionState {
  runId: string | null;
  status: RunStatus;
  nodeStates: Map<string, NodeExecutionState>;
  edgeStates: Map<string, EdgeExecutionStatus>;
  currentNodeId: string | null;
  stepOrder: string[];
  startedAt: number | null;
  completedAt: number | null;
  elapsedMs: number;
  error: string | null;
  workbenchRuns: WorkbenchRunState[];
  isLive: boolean;
}

const INITIAL_STATE: ExecutionState = {
  runId: null,
  status: 'idle',
  nodeStates: new Map(),
  edgeStates: new Map(),
  currentNodeId: null,
  stepOrder: [],
  startedAt: null,
  completedAt: null,
  elapsedMs: 0,
  error: null,
  workbenchRuns: [],
  isLive: false,
};

export function useWorkflowExecution() {
  const [state, setState] = useState<ExecutionState>(INITIAL_STATE);

  const liveInputResolver = useRef<((input: string | null) => void) | null>(null);
  const preflightInputResolver = useRef<((input: PreflightInput | null) => void) | null>(null);
  const sopInputResolver = useRef<((input: SopInput | null) => void) | null>(null);

  const startLiveExecution = useCallback(async (_workflowId: string) => {
    // Execution API not yet implemented in Django backend.
    // Proxy routes exist in Node relay — enable this once Django adds the endpoints.
    setState({
      ...INITIAL_STATE,
      status: 'failed',
      error: 'Workflow execution is not yet available. Backend support is pending.',
    });
  }, []);

  const cancel = useCallback(() => {
    liveInputResolver.current?.(null);
    liveInputResolver.current = null;
    preflightInputResolver.current?.(null);
    preflightInputResolver.current = null;
    sopInputResolver.current?.(null);
    sopInputResolver.current = null;
    setState((prev) => ({
      ...prev,
      status: 'cancelled',
      currentNodeId: null,
      completedAt: Date.now(),
    }));
  }, []);

  const reset = useCallback(() => {
    liveInputResolver.current?.(null);
    preflightInputResolver.current?.(null);
    sopInputResolver.current?.(null);
    setState(INITIAL_STATE);
  }, []);

  const submitInteraction = useCallback((_nodeId: string, _data: Record<string, unknown>) => {}, []);
  const submitPreflightInput = useCallback((_data: PreflightInput) => {}, []);
  const submitSopInput = useCallback((_data: SopInput) => {}, []);

  return {
    execution: state,
    startLiveExecution,
    cancel,
    reset,
    submitInteraction,
    submitPreflightInput,
    submitSopInput,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors referencing `useWorkflowExecution.ts`

- [ ] **Step 3: Commit**

```bash
git add src/routes/workflows/execution/useWorkflowExecution.ts
git commit -m "feat: stub useWorkflowExecution — remove Apollo, return error until Django endpoints land"
```

---

## Task 4: Migrate `ConfigPanel.tsx`

**Files:**
- Modify: `src/routes/workflows/components/ConfigPanel.tsx`

Replace the Apollo `useQuery(LIST_COMBO_TEMPLATES_QUERY)` block with `useComboTemplates()` from TanStack.

- [ ] **Step 1: Edit the imports at the top of `ConfigPanel.tsx`**

Remove these two lines:
```typescript
import { useQuery } from '@apollo/client/react';
import { LIST_COMBO_TEMPLATES_QUERY } from '@/graphql/agent.graphql';
```

Add this import (after the existing imports):
```typescript
import { useComboTemplates } from '@/lib/queries/agents';
```

- [ ] **Step 2: Replace the Apollo useQuery call (around line 191)**

Remove:
```typescript
const { data: comboData } = useQuery(LIST_COMBO_TEMPLATES_QUERY, {
  skip: isDynamicShape || data.nodeType !== 'agent_combo',
  fetchPolicy: 'cache-and-network',
});
const comboTemplates: Array<{ id: string; label: string; description: string }> =
  (comboData as any)?.comboTemplates ?? [];
```

Replace with:
```typescript
const { data: comboRaw } = useComboTemplates();
const comboTemplates: Array<{ id: string; label: string; description: string }> =
  isDynamicShape || data.nodeType !== 'agent_combo' ? [] : (comboRaw ?? []);
```

Note: `useComboTemplates()` always fires but the result is only used when `nodeType === 'agent_combo'`. TanStack Query caches the result so the extra call is free after the first render.

- [ ] **Step 3: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/routes/workflows/components/ConfigPanel.tsx
git commit -m "feat: migrate ConfigPanel from Apollo useQuery to useComboTemplates (TanStack)"
```

---

## Task 5: Migrate `catalogApi.ts` to TanStack Query

**Files:**
- Modify: `src/lib/catalogApi.ts`

Replace the custom `useFetched` hook (returns `{data, loading, error}`) with TanStack `useQuery` (returns `{data, isLoading, error}`). **Important:** consumers use `loading` not `isLoading`. Check all call sites before committing.

- [ ] **Step 1: Find all consumers of the catalog hooks**

```bash
grep -rn "useShapeCategories\|useShapeDefinitions\|useNavigation\|useDashboard\|\.loading" \
  src --include="*.ts" --include="*.tsx"
```

Note each file and whether it reads `.loading` or `.isLoading` — you'll need to update consumers.

- [ ] **Step 2: Replace `catalogApi.ts` hook implementations**

Remove the `useFetched` function and the four hook exports that call it. Replace with:

```typescript
import { useQuery } from '@tanstack/react-query';
```

Add this import at the top (alongside the existing `useEffect, useState` — remove those since they're no longer needed):

Replace the four export lines at the bottom of the file:

```typescript
// ── TanStack Query hooks ────────────────────────────────────────────────────

export const useShapeCategories = () =>
  useQuery({ queryKey: ['catalog', 'categories'], queryFn: catalogApi.categories });

export const useShapeDefinitions = () =>
  useQuery({ queryKey: ['catalog', 'shapes'], queryFn: catalogApi.shapes });

export const useNavigation = () =>
  useQuery({ queryKey: ['ui', 'navigation'], queryFn: catalogApi.navigation });

export const useDashboard = () =>
  useQuery({ queryKey: ['ui', 'dashboard'], queryFn: catalogApi.dashboard });
```

Also remove the `useEffect` and `useState` imports since `useFetched` is gone. The top import block becomes:

```typescript
import { useQuery } from '@tanstack/react-query';

import {
  api,
  type DashboardWidget,
  type NavItem,
  type ShapeCategory,
  type ShapeDefinition,
} from './api';
```

- [ ] **Step 3: Update all consumers — change `.loading` → `.isLoading`**

For every file found in Step 1 that uses `.loading`, replace:
```tsx
const { data, loading, error } = useShapeCategories();
```
with:
```tsx
const { data, isLoading: loading, error } = useShapeCategories();
```
(alias `isLoading` as `loading` to minimise diff — or rename throughout if you prefer)

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalogApi.ts
# add consumer files too
git commit -m "feat: migrate catalogApi hooks from custom useFetched to TanStack useQuery"
```

---

## Task 6: Add TanStack Query hooks to `workflowsApi.ts`

**Files:**
- Modify: `src/lib/workflowsApi.ts`

`workflowsApi` is a plain object of async functions. Components that call it directly can't benefit from caching or loading state. Add TanStack wrappers at the bottom of the file.

- [ ] **Step 1: Add the import at the top of `workflowsApi.ts`**

Add after the existing imports:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

- [ ] **Step 2: Add query key factory after the `workflowsApi` object**

```typescript
export const workflowKeys = {
  all:    ['workflows'] as const,
  lists:  () => [...workflowKeys.all, 'list'] as const,
  detail: (id: string) => [...workflowKeys.all, id] as const,
};
```

- [ ] **Step 3: Add query hooks after the key factory**

```typescript
export function useWorkflows() {
  return useQuery({
    queryKey: workflowKeys.lists(),
    queryFn:  () => workflowsApi.list(),
  });
}

export function useWorkflow(id: string | undefined) {
  return useQuery({
    queryKey: workflowKeys.detail(id!),
    queryFn:  () => workflowsApi.get(id!),
    enabled:  !!id,
  });
}
```

- [ ] **Step 4: Add mutation hooks after the query hooks**

```typescript
export function useCreateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Parameters<typeof workflowsApi.create>[0]) =>
      workflowsApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.lists() }),
  });
}

export function useUpdateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof workflowsApi.update>[1] }) =>
      workflowsApi.update(id, input),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeleteWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.lists() }),
  });
}

export function useDuplicateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) =>
      workflowsApi.duplicate(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: workflowKeys.lists() }),
  });
}

export function useActivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.activate(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function useDeactivateWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workflowsApi.deactivate(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: workflowKeys.lists() });
      qc.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}
```

- [ ] **Step 5: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add src/lib/workflowsApi.ts
git commit -m "feat: add TanStack Query wrapper hooks to workflowsApi"
```

---

## Task 7: Final cleanup — TypeScript + build verification

- [ ] **Step 1: Full TypeScript check**

```bash
cd /path/to/uhc-claims-frontend
npx tsc --noEmit
```

Expected: 0 errors. If errors reference deleted GraphQL files or Apollo types, they're stale imports — find them with:
```bash
grep -rn "@apollo\|graphql\|__generated__" src --include="*.ts" --include="*.tsx"
```
Fix any remaining imports.

- [ ] **Step 2: Build check**

```bash
npm run build
```

Expected: build completes without errors. Vite will warn if any `@apollo` or `graphql` imports remain in the bundle.

- [ ] **Step 3: Final commit if any cleanup fixes were needed**

```bash
git add -u
git commit -m "chore: fix remaining Apollo/GraphQL import cleanup after migration"
```

---

## Self-Review

**Spec coverage:**

| Spec requirement | Task |
|---|---|
| Add proxy routes for `/api/runs`, `/api/agents`, `/api/combo-templates` | Task 1 |
| Add proxy routes for 5 execution endpoints (future Django) | Task 1 |
| Delete `src/graphql/`, `src/__generated__/`, `codegen.ts` | Task 2 |
| Remove `@apollo/client`, `apollo-upload-client`, `graphql`, `@graphql-codegen/cli` | Task 2 |
| Remove stale env vars | Task 2 |
| Stub `useWorkflowExecution.ts` | Task 3 |
| Migrate `ConfigPanel.tsx` `LIST_COMBO_TEMPLATES_QUERY` → `useComboTemplates` | Task 4 |
| Migrate `catalogApi.ts` hooks to TanStack | Task 5 |
| Add TanStack hooks to `workflowsApi.ts` | Task 6 |
| `activity/index.tsx` — already migrated, no work needed | — |
| `activity/[id]/index.tsx` — already migrated, no work needed | — |
| `agents/index.tsx` + `agents/[id]/index.tsx` — already use `useAgents`/`useAgent` | — |
| No Django changes | Confirmed — all tasks target Node relay + frontend |

**Placeholders:** None. All code blocks are complete and runnable.

**Type consistency:** `useComboTemplates` returns `ComboTemplate[]` (from `lib/queries/agents.ts`). `ConfigPanel.tsx` casts to `Array<{ id, label, description }>` which matches the `ComboTemplate` interface. `workflowKeys` strings are `const`-typed throughout. `useFetched` return `{data, loading, error}` consumers are updated in Task 5 Step 3.
