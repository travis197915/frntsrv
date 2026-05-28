# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

React SPA for the UHC Claims-Audit platform. Admins design claim-processing workflows on a visual canvas, attach SOP rules and runtime API tools to individual nodes, then execute those workflows live against claim data. Auditors have read-only access — they can browse workflows, rules, and tools but cannot mutate data.

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

### Data Layer (TanStack Query + REST)

```
React SPA (TanStack Query + fetch)
      │  REST + Bearer JWT
      ▼
Node relay  (claims-corebackend, :4000)
      ├─ /auth/*               Identity (JWT minting, register, login)
      ├─ /api/users/*          User admin (Prisma)
      ├─ /api/dashboard/*      BFF stats aggregation
      └─ /api/builder/*, /api/ingest/*, /api/agent-tools/*,
         /api/agents/*, /api/runs/*, /api/workflows/*, ...
                │  proxied with JWT forwarding
                │  POST/PUT/PATCH/DELETE blocked for AUDITOR role
                ▼
         Django agentic-backend (:8000)
```

### Roles & Permissions

Two roles: **`ADMIN`** (full write access) and **`AUDITOR`** (read-only).

| Helper | Source | Meaning |
|--------|--------|---------|
| `useAuth().isAdmin` | `AuthContext` | `user.role === 'ADMIN'` |
| `useAuth().canWrite` | `AuthContext` | Same as admin — auditors cannot mutate |
| `isAdmin()`, `canWrite()` | `@/utils/user` | Pure functions on role strings |

Legacy JWTs with `MEMBER` are mapped to `AUDITOR` in `AuthContext`.

**Auditor UI patterns:** disable create/save/delete controls; pass `readOnly={!canWrite}` to inspector and attachment pickers; keep browse/view affordances (select nodes, open RulePicker, scroll NodePalette). The Node relay returns **403** on mutating HTTP methods for non-admins even if the UI is bypassed.

**Public routes:** `/login`, `/register` (no auth required). `POST /auth/register` is open; first user becomes ADMIN when `BOOTSTRAP_ADMIN=true`, others default to AUDITOR.

### HTTP Client Factory

`src/lib/apiClient.ts` — `makeClient(baseUrl)` returns a typed fetch wrapper that auto-attaches `Authorization: Bearer <token>` and redirects to `/login` on 401 (except when already on `/login` or `/register`).

`src/lib/clients.ts` — creates named instances. All route components import exclusively from `@/lib/api` (the public facade), never from `clients.ts` directly.

| Export from `@/lib/api` | Base path | Target |
|---|---|---|
| `authApi` | `/auth` | Node relay — login, register, me, change-password |
| `api` / `builderClient` | `/api/builder` | Django catalog + workflow graph |
| `ingestApi` | `/api/ingest` | Django SOP ingestion |
| `toolsApi` | `/api/agent-tools` | Django tool registry |
| `usersApi` | `/api/users` | Node relay — user list/detail |
| `apiClient` | `/api` | Mixed — dashboard, agents, runs |
| `sopExclusionsApi` | `/api/ingest` | SOP exclusion CRUD |

### Backend-Driven Canvas

1. `ShapeCatalogProvider` fetches `GET /catalog/categories/` once, exposes `bySlug` map via context
2. `NodePalette` renders catalog tiles — draggable for admins, view-only for auditors (`readOnly` prop)
3. `DynamicShapeNode` looks up the slug in catalog and renders the shape
4. `ConfigPanel` generates the inspector form from `ShapeDefinition.property_schema` — pass `readOnly={!canWrite}` for auditors

### Workflow ↔ Django Round-Trip

`src/lib/workflowsApi.ts` adapts between:
- **Django**: hierarchical `work_areas → workbenches → shapes`
- **xyflow**: flat `{ nodes, edges }` array

Edges are **frontend-only** (localStorage); save always sends `connections: []`. New edges default to `smoothstep` — there is no edge-type picker UI.

### Sidebar Navigation

`PlatformSection` loads `GET /api/builder/ui/navigation/` and groups items by `section`. **Section order is determined by each item's `order` field** (sorted client-side), not alphabetical section names. Django seed order: Dashboard → Automation → Usage & Cost → Account.

### Type System

Types live in `src/interfaces/` organized by domain:

| File | Contents |
|------|----------|
| `builder.ts` | `ShapeDefinition`, `ShapeCategory`, `BuilderGraph`, `NavItem`, `DashboardWidget` |
| `workflows.ts` | `AttachableSopRule`, `AttachableTool`, `WorkflowAttachable`, `WorkflowSummary` |
| `sop.ts` | `SopSection`, `SopGraph`, `SopExclusion`, `SopHtmlBlock` |
| `identity.ts` | `CorebackendUser`, `AuthResponse`, `UserRole` (`ADMIN` \| `AUDITOR`) |

### Workflow Execution (currently stubbed)

`useWorkflowExecution.ts` returns a "backend pending" placeholder error — the REST execution endpoints (`/api/runs/*`) exist in Django and are proxied by Node, but the frontend hook has not yet been wired up. `ExecutionPanel.tsx` contains the full UI but is dormant until the hook is implemented.

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
├── main.tsx                          # Entry: QueryClient + Auth + Theme + AppRoutes
├── interfaces/                       # Domain types
│   ├── builder.ts
│   ├── workflows.ts
│   ├── sop.ts
│   └── identity.ts
│
├── lib/                              # Data layer
│   ├── api.ts                        # Public facade — import all clients from here
│   ├── apiClient.ts
│   ├── clients.ts
│   ├── workflowsApi.ts
│   ├── catalogApi.ts
│   └── staticPages.ts                # Legacy flag (unused)
│
├── utils/
│   ├── auth.ts
│   ├── user.ts                       # isAdmin, canWrite, getRoleLabel
│   ├── theme.tsx
│   ├── utils.ts
│   └── query-pagination.ts
│
├── contexts/
│   └── AuthContext.tsx               # login, register, logout, canWrite, isAdmin
│
├── layouts/
│   ├── AuthLayout.tsx                # Split-pane shell for /login and /register
│   └── SidebarLayout.tsx             # App shell; nav from GET /ui/navigation/
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── Sidebar/                      # PlatformSection (backend-driven nav)
│   └── ProtectedRoute.tsx
│
└── routes/
    ├── index.tsx                     # AppRoutes
    ├── login/index.tsx
    ├── register/index.tsx
    ├── unauthorized/
    ├── dashboard/
    ├── workflows/
    │   ├── index.tsx
    │   ├── [id]/index.tsx            # Canvas builder (read-only for auditors)
    │   ├── hooks/useWorkflowCanvas.ts
    │   ├── components/
    │   │   ├── NodePalette.tsx
    │   │   ├── ConfigPanel.tsx
    │   │   ├── NodeAttachments/      # RulePicker, HtmlFullscreenPicker, …
    │   │   └── nodes/
    │   └── execution/                # Stubbed live execution UI
    ├── agents/
    ├── activity/
    ├── users/                        # List + detail (admin controls gated)
    ├── settings/                     # Password change (admin only)
    └── ai-usage/                     # Mock data only — no backend
```

---

## Routing

Public: `/login`, `/register`, `/unauthorized`. Everything else requires auth via `<ProtectedRoute>`.

| Path | Notes |
|------|-------|
| `/dashboard` | API-driven tiles from `GET /api/builder/ui/dashboard/` |
| `/workflows` | List; create/duplicate/delete hidden for auditors |
| `/workflows/:id` | Canvas builder; save/execute/edit locked when `!canWrite` |
| `/agents` | `GET /api/agents/` |
| `/activity` | `GET /api/runs/` |
| `/users` | User list — visible per Django nav `min_role` |
| `/users/:id` | User detail; role/status controls admin-only |
| `/settings` | Password change (admin only) + appearance |
| `/ai-usage` | **Mock data — no backend wired** |

Sidebar "Profile" navigates to `/users/:id` for the current user (no separate `/profile` route).

---

## What's Removed vs. the Old Architecture

| Old | New |
|-----|-----|
| Apollo Client + GraphQL | TanStack Query + REST fetch |
| `src/graphql/*`, `src/__generated__/`, `codegen.ts` | Gone |
| Hardcoded node types (ActionNode, etc.) | Backend-driven catalog |
| Multiple `VITE_*_BASE_URL` env vars | Single `VITE_API_BASE_URL` |
| `MEMBER` role | `AUDITOR` role |
| `src/App.tsx` scaffold | Gone — `main.tsx` mounts `AppRoutes` directly |
| Edge type picker (Bezier/Straight/Step/Smooth) | Removed — fixed `smoothstep` default |
