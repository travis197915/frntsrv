# UHG Claims Agent Orchestration — Frontend

A React SPA for managing AI-driven claims workflows, agents, and run activity. Admins build and edit workflows; auditors browse in read-only mode. All catalog and workflow data is live — there is no static/demo mode except `/ai-usage`.

---

## Tech Stack

| Layer           | Technology                                                      |
| --------------- | --------------------------------------------------------------- |
| Framework       | React 19 + TypeScript                                           |
| Build           | Vite 7 (`@vitejs/plugin-react`)                                 |
| Styling         | Tailwind CSS 4 + shadcn/ui (New York variant, Radix primitives) |
| Data            | TanStack Query 5 + native `fetch` via `@/lib/apiClient`           |
| Routing         | React Router DOM 7                                              |
| Canvas          | React Flow (`@xyflow/react`) for the workflow node editor       |
| Icons           | lucide-react                                                    |
| Package Manager | Yarn                                                            |

---

## Quick Start

```bash
yarn install
cp .env.example .env    # set VITE_API_BASE_URL
yarn dev                # http://localhost:5173
yarn build              # production build → dist/
yarn compile            # tsc -b (typecheck only)
```

Requires the Node relay (`claims-corebackend`, default `http://localhost:4000`) and Django agentic backend running. See sibling repos `uhc-claims-backend` and `uhc-agentic-backend`.

---

## Backend Architecture

The frontend never calls Django directly. All REST traffic goes through the Node relay:

```
React (fetch + TanStack Query)
      │  REST + JWT Bearer
      ▼
Node relay  (claims-corebackend, port 4000)
      │  Identity: Prisma + JWT minting  (/auth/*, /api/users/*)
      │  BFF:      orchestration         (/api/dashboard/stats)
      │  Proxy:    forward with JWT      (/api/builder/*, /api/ingest/*, …)
      │            POST/PUT/PATCH/DELETE → 403 for AUDITOR role
      ▼
Django REST API  (uhc-agentic-backend, port 8000)
```

Authentication: the Node relay mints HS256 JWTs; every proxied Django request carries `Authorization: Bearer <jwt>` (both services share `JWT_SECRET`).

---

## Roles & Access Control

| Role     | Capabilities |
| -------- | ------------ |
| `ADMIN`  | Full read/write — create workflows, save canvas, attach rules, manage users |
| `AUDITOR`| Read-only — browse workflows, view attachments and tools; mutations blocked in UI and at the relay (403) |

- Sign up at `/register` — first user becomes admin when `BOOTSTRAP_ADMIN=true`; others default to auditor.
- `useAuth().canWrite` / `useAuth().isAdmin` gate write controls across the app.
- Legacy JWTs with role `MEMBER` are treated as `AUDITOR`.

---

## Environment

| Variable            | Used by                                      | Default               |
| ------------------- | -------------------------------------------- | --------------------- |
| `VITE_API_BASE_URL` | All REST — auth, users, proxied Django routes | `http://localhost:4000` |
| `VITE_CLIENT_NAME`  | Brand string in sidebar chrome               | `United Health Care`  |
| `VITE_CLIENT_LOGO`  | Optional logo URL in sidebar                 | —                     |

---

## Project Structure

```
src/
├── main.tsx                        # QueryClient + Auth + Theme + AppRoutes
├── layouts/
│   ├── AuthLayout.tsx              # Split-pane login/register shell
│   └── SidebarLayout.tsx           # App shell; backend-driven nav
├── routes/
│   ├── index.tsx                   # Route table
│   ├── login/                      # Sign in
│   ├── register/                   # Public signup
│   ├── dashboard/
│   ├── workflows/                  # List + builder canvas + execution shell
│   ├── agents/                     # Agent registry
│   ├── activity/                   # Run history
│   ├── ai-usage/                   # Mock token usage (no backend)
│   ├── settings/                   # Password + license info
│   └── users/                      # User list + detail
├── components/                     # Shared UI (Sidebar/, ui/, Loader, …)
├── contexts/AuthContext.tsx
├── interfaces/                     # builder, workflows, sop, identity types
└── lib/                            # api.ts facade, apiClient, workflowsApi, catalogApi
```

Entry point is `main.tsx` → `AppRoutes` — there is no root `App.tsx`.

---

## HTTP Clients

Defined in `src/lib/clients.ts`, re-exported from `@/lib/api`:

| Export          | Base path          | Backend                         |
| --------------- | ------------------ | ------------------------------- |
| `authApi`       | `` (relay root)    | Node — `/auth/*`                |
| `usersApi`      | `/api/users`       | Node — user list/detail         |
| `api`           | `/api/builder`     | Django builder (proxied)        |
| `ingestApi`     | `/api/ingest`      | Django SOP ingestion (proxied)  |
| `toolsApi`      | `/api/agent-tools` | Django tool registry (proxied)  |
| `apiClient`     | `/api`             | Mixed — dashboard, agents, runs |

Import from `@/lib/api` in routes — not from `@/lib/clients` directly.

---

## Routing Map

| Path               | Notes                                                    |
| ------------------ | -------------------------------------------------------- |
| `/login`           | Sign in (`AuthLayout`)                                   |
| `/register`        | Public signup (`AuthLayout`)                             |
| `/dashboard`       | Stats + recent runs                                      |
| `/workflows`       | Workflow list; create/delete disabled for auditors       |
| `/workflows/:id`   | Builder canvas; save/execute locked for auditors         |
| `/agents`          | Agent registry                                           |
| `/agents/:id`      | Agent detail                                             |
| `/activity`        | Run list                                                 |
| `/activity/:runId` | Run trace                                                |
| `/ai-usage`        | Hardcoded demo data                                      |
| `/settings`        | License decode; password change (admin only)             |
| `/users`           | User list (sidebar visibility from Django `min_role`)    |
| `/users/:id`       | User detail; role/status edits admin-only                |

Sidebar nav is loaded from `GET /api/builder/ui/navigation/`. `PlatformSection` sorts items by the backend `order` field before grouping into sections (Dashboard → Automation → Usage & Cost → Account).

---

## Workflow Builder

### Catalog-driven shapes

Palette tiles, inspector fields, and node rendering come from `GET /api/builder/catalog/categories/`. `NodePalette` supports `readOnly` for auditors (browse only, no drag).

### Django graph ↔ xyflow

`workflowsApi.ts` translates Django's nested `work_areas → workbenches → shapes` into flat xyflow `nodes`/`edges`. Edges are stored in **localStorage** per workflow; saves send `connections: []`. New edges use `smoothstep` routing.

### Attachments

SOP rules and tool bindings live in shape `properties`. The attachable picker (`NodeAttachments/RulePicker/`) reads `GET /workflows/{id}/attachable/` and respects `readOnly` for auditors.

### Live execution

`useWorkflowExecution` is **stubbed** — proxy routes for runs exist; wire the hook when Django execution endpoints are ready.

---

## REST Endpoints (via Node relay)

### Auth & Users (Node-owned)

| Method | Path                    | Auth     | Notes                              |
| ------ | ----------------------- | -------- | ---------------------------------- |
| POST   | `/auth/register`        | Public   | First user → ADMIN (if bootstrap)  |
| POST   | `/auth/login`           | Public   | Returns JWT                        |
| GET    | `/auth/me`              | Bearer   | Current user                       |
| POST   | `/auth/change-password` | Bearer   | Admin only (403 for auditors)      |
| GET    | `/api/users/`           | Bearer   | Paginated user list                |
| GET    | `/api/users/:id`        | Bearer   | User detail                        |
| PATCH  | `/api/users/:id/role`   | Admin    | Role change                        |
| PATCH  | `/api/users/:id/status` | Admin    | Activate/deactivate                |

### Builder (Django, proxied at `/api/builder`)

| Method | Path                          | Used by                  |
| ------ | ----------------------------- | ------------------------ |
| GET    | `/workflows/`                 | Workflow list            |
| POST   | `/workflows/`                 | Create (admin)           |
| GET    | `/workflows/{id}/graph/`      | Load canvas              |
| PUT    | `/workflows/{id}/graph/`      | Save canvas (admin)      |
| GET    | `/workflows/{id}/attachable/` | SOP rules + tools picker |
| POST   | `/workflows/{id}/duplicate/`  | Duplicate (admin)        |
| DELETE | `/workflows/{id}/`            | Delete (admin)           |
| GET    | `/catalog/categories/`        | Node palette             |
| GET    | `/ui/navigation/`             | Sidebar                  |
| GET    | `/ui/dashboard/`              | Dashboard widget defs    |

Mutating builder/ingest/agent-tools routes return **403** for auditor JWTs at the relay.

### Orchestration (Node BFF)

| Method | Path                   | Notes                                     |
| ------ | ---------------------- | ----------------------------------------- |
| GET    | `/api/dashboard/stats` | Aggregates agents + workflows from Django |

### Runs & Agents (Django, proxied at `/api`)

| Method | Path          | Used by        |
| ------ | ------------- | -------------- |
| GET    | `/agents/`    | Agent registry |
| GET    | `/runs/`      | Activity list  |
| GET    | `/runs/{id}/` | Run detail     |

---

## Development Notes

### Adding a new page

1. Create `src/routes/<domain>/index.tsx`
2. Add types to `src/interfaces/` if needed
3. Use `useQuery` / `useMutation` with a client from `@/lib/api`
4. Register in `src/routes/index.tsx`
5. Add a sidebar row in Django `builder/catalog_seed.py` (`SIDEBAR_NAV`) and run `seed_builder_catalog`

### Adding a shadcn/ui component

```bash
npx shadcn@latest add <component-name>
```

### Theme

Dark/light via `ThemeProvider` (`src/utils/theme.tsx`), persisted to `localStorage`.

### Not yet integrated

- **Workflow live execution** — hook stubbed
- `/ai-usage` — mock data only
- Agent Prompts CRUD, per-run step/agent-log endpoints
- Workflow list shape summaries on cards (BFF enrichment pending)
