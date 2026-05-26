# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

React SPA for the UHC Claims-Audit platform. Auditors design claim-processing workflows on a visual canvas, attach SOP rules and runtime API tools to individual nodes, then execute those workflows live against claim data. All data is live — there is no static/demo mode.

Key characteristic: **the UI is backend-driven**. Sidebar nav, dashboard tiles, canvas palette, and per-shape inspector forms all come from Django REST API responses — nothing about the chrome is hardcoded.

---

## Commands

```bash
yarn dev          # Vite dev server → http://localhost:5173
yarn build        # tsc -b && vite build → dist/
yarn preview      # serve dist/ locally
yarn lint         # ESLint
yarn compile      # tsc -b (type-check only — NOT graphql-codegen; Apollo is gone)
```

Copy `.env.example` to `.env` before starting:
```
VITE_API_BASE_URL=http://localhost:4000   # Node relay (claims-corebackend) root
VITE_CLIENT_NAME=United Health Care       # Brand string in sidebar chrome
```

All API subpaths (`/auth/*`, `/api/builder/*`, `/api/ingest/*`, `/api/users/*`, etc.) are appended to `VITE_API_BASE_URL` by the client factory — there are no separate per-backend env vars anymore.

Adding a shadcn/ui component: `npx shadcn@latest add <component-name>` → lands in `src/components/ui/`.

---

## Architecture

### Data Layer (Apollo is gone — TanStack Query + REST)

The `dev` branch removed Apollo Client and all GraphQL infrastructure entirely. The stack is now:

```
React SPA (TanStack Query + fetch)
      │  REST + Bearer JWT
      ▼
Node relay  (claims-corebackend, :4000)
      ├─ /auth/*               Identity (JWT minting)
      ├─ /api/users/*          User admin (Prisma)
      ├─ /api/dashboard/*      BFF stats aggregation
      └─ /api/builder/*, /api/ingest/*, /api/agent-tools/*,
         /api/agents/*, /api/runs/*, /api/workflows/*, ...
                │  proxied with JWT forwarding
                ▼
         Django agentic-backend (:8000)
```

### HTTP Client Factory

`src/lib/apiClient.ts` — `makeClient(baseUrl)` returns a typed fetch wrapper that auto-attaches `Authorization: Bearer <token>` and redirects to `/login` on 401.

`src/lib/clients.ts` — creates named instances. All route components import exclusively from `@/lib/api` (the public facade), never from `clients.ts` directly.

| Export from `@/lib/api` | Base path | Target |
|---|---|---|
| `authApi` | `/auth` | Node relay — login, me, change-password |
| `api` / `builderClient` | `/api/builder` | Django catalog + workflow graph |
| `ingestApi` | `/api/ingest` | Django SOP ingestion |
| `toolsApi` | `/api/agent-tools` | Django tool registry |
| `usersApi` | `/api/users` | Node relay — user admin |
| `apiClient` | `/api` | Mixed — dashboard, agents, runs |
| `sopExclusionsApi` | `/api/ingest` | SOP exclusion CRUD |

### Backend-Driven Canvas

1. `ShapeCatalogProvider` (`src/routes/workflows/components/nodes/`) fetches `GET /catalog/categories/` once, exposes `bySlug` map via context
2. `NodePalette` renders draggable tiles from the catalog (encodes `shape:<slug>` on dataTransfer)
3. `DynamicShapeNode` looks up the slug in catalog and renders the shape
4. `ConfigPanel` generates the inspector form from `ShapeDefinition.property_schema` — adding a field requires only a Django migration

### Workflow ↔ Django Round-Trip

`src/lib/workflowsApi.ts` (518 lines) adapts between:
- **Django**: hierarchical `work_areas → workbenches → shapes`
- **xyflow**: flat `{ nodes, edges }` array

Edges are **frontend-only** (localStorage); save always sends `connections: []`.

### Type System

Types live in `src/interfaces/` organized by domain — replacing the old GraphQL-generated types:

| File | Contents |
|------|----------|
| `builder.ts` | `ShapeDefinition`, `ShapeCategory`, `BuilderGraph`, `NavItem`, `DashboardWidget` |
| `workflows.ts` | `AttachableSopRule`, `AttachableTool`, `WorkflowAttachable`, `WorkflowSummary` |
| `sop.ts` | `SopSection`, `SopGraph`, `SopExclusion`, `SopHtmlBlock` |
| `identity.ts` | `CorebackendUser`, `AuthResponse` |

### Workflow Execution (currently stubbed)

`useWorkflowExecution.ts` returns a "backend pending" placeholder error — the REST execution endpoints (`/api/runs/*`) exist in Django and are proxied by Node, but the frontend hook has not yet been wired up. `ExecutionPanel.tsx` (850+ lines) contains the full UI but is dormant until the hook is implemented.

### State Management

| Concern | Mechanism |
|---|---|
| Server data / caching | TanStack Query (`QueryClientProvider`, `useQuery`, `useMutation`) |
| Auth | `AuthContext` + `useAuth()` — token in `localStorage.token`, user in `localStorage.auth_user` |
| Canvas nodes/edges | `useWorkflowCanvas` hook + React Flow state |
| Theme (dark/light) | `ThemeProvider` in `src/utils/theme.tsx` — persisted to `localStorage` |

---

## Project Structure

```
src/
├── main.tsx                          # Entry: QueryClient + Auth + Theme + Router
├── interfaces/                       # Domain types (import from here, not scattered files)
│   ├── builder.ts                    # Catalog, workflow graph, nav types
│   ├── workflows.ts                  # Attachable rules, tools, workflow shapes
│   ├── sop.ts                        # SOP graph, exclusions, HTML blocks
│   └── identity.ts                   # User / auth types
│
├── lib/                              # Data layer
│   ├── api.ts                        # Public facade — import all clients from here
│   ├── apiClient.ts                  # HTTP client factory + ApiError
│   ├── clients.ts                    # Named client instances (do not import directly)
│   ├── workflowsApi.ts               # Django ↔ xyflow adapter (518 lines)
│   ├── catalogApi.ts                 # Catalog + UI metadata TanStack hooks
│   └── staticPages.ts                # Legacy flag (unused)
│
├── utils/
│   ├── auth.ts                       # Token storage + JWT decode helpers
│   ├── user.ts                       # isAdmin, getRoleLabel, permission helpers
│   ├── theme.tsx                     # ThemeProvider + useTheme
│   ├── utils.ts                      # cn() — clsx + tailwind-merge
│   └── query-pagination.ts           # Cursor pagination helpers for TanStack Query
│
├── contexts/
│   └── AuthContext.tsx               # AuthProvider + useAuth hook
│
├── layouts/
│   └── SidebarLayout.tsx             # App shell; nav from GET /ui/navigation/
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── Sidebar/                      # Backend-driven sidebar nav
│   └── ...                           # StatusBadge, Loader, EmptyState, ProtectedRoute
│
└── routes/
    ├── index.tsx                     # AppRoutes + ProtectedRoute wrappers
    ├── login/
    ├── dashboard/
    ├── workflows/
    │   ├── index.tsx                 # Workflow list
    │   ├── [id]/index.tsx            # Workflow builder canvas
    │   ├── types.ts                  # WorkflowNodeType, WorkflowNodeData
    │   ├── workflowCanvasUtils.ts    # Dagre layout + edge routing
    │   ├── hooks/
    │   │   ├── useWorkflowCanvas.ts  # React Flow state (nodes, edges, drag, save)
    │   │   └── useWorkflowUiColors.ts
    │   ├── components/
    │   │   ├── nodes/                # DynamicShapeNode, BaseNode, WorkAreaNode, ShapeCatalogProvider
    │   │   ├── NodePalette.tsx       # Catalog-driven drag palette
    │   │   ├── ConfigPanel.tsx       # property_schema → generated form
    │   │   ├── NodeAttachments.tsx   # SOP rule + tool binding (~1000 lines)
    │   │   ├── SopGraphDialog.tsx    # SOP knowledge-graph viewer
    │   │   ├── SopGraphCanvas.tsx    # Dagre-layouted xyflow SOP viewer
    │   │   ├── SopSectionsPanel.tsx  # SOP section tree
    │   │   ├── ToolRegistryList.tsx  # Tool registry display
    │   │   └── ToolInvokeModal.tsx   # Tool invocation modal
    │   └── execution/
    │       ├── useWorkflowExecution.ts  # STUBBED — wiring pending
    │       ├── ExecutionPanel.tsx       # Step log + input prompts (850+ lines, dormant)
    │       ├── ExecutionOverlay.tsx
    │       ├── ExecutionToolbar.tsx
    │       └── types.ts
    ├── agents/
    ├── activity/
    ├── users/                        # Admin user list + detail
    ├── profile/
    ├── settings/                     # Password change + license info
    └── ai-usage/                     # Mock data only — no backend
```

---

## Routing

All routes except `/login` and `/unauthorized` are wrapped by `<ProtectedRoute>`.

| Path | Notes |
|------|-------|
| `/dashboard` | API-driven tiles from `GET /api/builder/ui/dashboard/` |
| `/workflows` | `GET /api/builder/workflows/` |
| `/workflows/:id` | Canvas builder; live execution currently stubbed |
| `/agents` | `GET /api/agents/` |
| `/activity` | `GET /api/runs/` |
| `/users` | Admin-only — `GET /api/users/` |
| `/profile` | Current user read-only |
| `/settings` | Password change + JWT license decode |
| `/ai-usage` | **Mock data — no backend wired** |

---

## What's Removed vs. the Old Architecture

| Old | New |
|-----|-----|
| Apollo Client + GraphQL | TanStack Query + REST fetch |
| `src/graphql/*.graphql.ts` | Gone |
| `src/__generated__/` | Gone |
| `codegen.ts` | Gone (`yarn compile` = typecheck now) |
| Hardcoded ActionNode, ConditionNode, TriggerNode, OutputNode | Gone — fully backend-driven via catalog |
| Multiple `VITE_*_BASE_URL` env vars | Single `VITE_API_BASE_URL` |
| Types scattered + GraphQL-generated | `src/interfaces/` domain files |
