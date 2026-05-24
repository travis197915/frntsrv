# UHG Claims Agent Orchestration — Frontend

A React SPA for managing AI-driven claims workflows, agents, and run activity. All data is live — there is no static/demo mode.

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
yarn dev          # http://localhost:5173
yarn build        # production build → dist/
yarn compile      # tsc -b (typecheck only)
```

Set `VITE_API_BASE_URL` in `.env` to point at the Node relay (`claims-corebackend`, default `http://localhost:4000`).

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
      ▼
Django REST API  (uhc-agentic-backend / sop_backend, port 8000)
```

Authentication: the Node relay mints HS256 JWTs; every proxied Django request carries `Authorization: Bearer <jwt>` (both services share `JWT_SECRET`).

---

## Environment

| Variable            | Used by                                                         | Default               |
| ------------------- | --------------------------------------------------------------- | --------------------- |
| `VITE_API_BASE_URL` | All REST — auth, users, proxied Django routes                   | `http://localhost:4000` |
| `VITE_CLIENT_NAME`  | Brand string in the chrome                                      | `United Health Care`  |
| `VITE_CLIENT_LOGO`  | Optional logo URL in sidebar                                    | —                     |

Subpaths are appended to `VITE_API_BASE_URL` by the client factory — e.g. `/api/builder`, `/api/ingest`, `/api/users`.

---

## Project Structure

```
src/
├── main.tsx                        # Entry — QueryClient + Auth + Theme + Router
│
├── routes/                         # Route-level page components (no pages/ dir)
│   ├── index.tsx                   # AppRoutes
│   ├── login/index.tsx             # Login (Wipro branding)
│   ├── unauthorized/               # Role-mismatch landing
│   ├── dashboard/index.tsx         # Stats + recent runs
│   │
│   ├── workflows/
│   │   ├── index.tsx               # Workflow list
│   │   ├── [id]/index.tsx          # Builder canvas + execution shell
│   │   ├── types.ts                # Canvas types
│   │   ├── workflowCanvasUtils.ts  # Layout + edge routing
│   │   ├── hooks/
│   │   │   ├── useWorkflowCanvas.ts
│   │   │   └── useWorkflowUiColors.ts
│   │   ├── components/
│   │   │   ├── nodes/              # DynamicShapeNode, WorkAreaNode, nodeTypes
│   │   │   ├── NodePalette.tsx     # Catalog-driven drag palette
│   │   │   ├── ConfigPanel.tsx     # Inspector from ShapeDefinition.property_schema
│   │   │   ├── WorkflowCard.tsx    # List card (shape-count pills when config present)
│   │   │   ├── CreateWorkflowDialog.tsx
│   │   │   ├── WorkflowContextPanel.tsx
│   │   │   ├── NodeAttachments.tsx
│   │   │   ├── SopGraphDialog.tsx / SopGraphCanvas.tsx / SopSectionsPanel.tsx
│   │   │   └── ToolRegistryList.tsx / ToolInvokeModal.tsx
│   │   └── execution/
│   │       ├── useWorkflowExecution.ts   # Stub — backend execution pending
│   │       ├── ExecutionPanel.tsx
│   │       ├── ExecutionToolbar.tsx
│   │       └── types.ts
│   │
│   ├── agents/                     # Agent registry
│   ├── activity/                   # Run history
│   ├── ai-usage/                   # Token usage (mock data — no backend yet)
│   ├── settings/                   # Password + user management
│   ├── users/                      # Admin user list + detail
│   └── profile/                    # Current-user profile
│
├── layouts/
│   └── SidebarLayout.tsx           # App shell; nav driven by /ui/navigation/
│
├── components/                     # Shared UI (ui/, Sidebar/, Loader, …)
│
├── contexts/
│   └── AuthContext.tsx             # AuthProvider — login via authApi (Node)
│
├── interfaces/                     # Domain types (preferred)
│   ├── builder.ts                  # Catalog + Django graph types
│   ├── workflows.ts                # SPA workflow shapes + attachable rules
│   ├── sop.ts                      # SOP graph + exclusion types
│   └── identity.ts                 # Auth/user types from Node
│
├── lib/                            # Data layer
│   ├── api.ts                      # Public facade — import from here in routes
│   ├── apiClient.ts                # makeClient() factory + ApiError
│   ├── clients.ts                  # Singleton HTTP clients (relay, builder, …)
│   ├── workflowsApi.ts             # Builder graph ↔ xyflow adapter + CRUD
│   ├── catalogApi.ts               # Catalog hooks + /ui/* fetchers
│   └── staticPages.ts              # Legacy flag (unused)
│
└── utils/
    ├── auth.ts                     # Token storage, decodeJwtPayload
    ├── user.ts                     # User, isAdmin, getRoleLabel
    ├── theme.tsx                   # ThemeProvider + useTheme
    ├── utils.ts                    # cn() — clsx + tailwind-merge
    ├── query-pagination.ts         # Cursor pagination helpers for useQuery
    └── debounce.ts, compare-values.ts, …
```

---

## HTTP Clients

Defined in `src/lib/clients.ts`, re-exported from `@/lib/api`:

| Export          | Base path           | Backend                         |
| --------------- | ------------------- | ------------------------------- |
| `authApi`       | `` (relay root)     | Node — `/auth/*`                |
| `usersApi`      | `/api/users`        | Node — user CRUD                |
| `api`           | `/api/builder`      | Django builder (proxied)        |
| `ingestApi`     | `/api/ingest`       | Django SOP ingestion (proxied)  |
| `toolsApi`      | `/api/agent-tools`  | Django tool registry (proxied)  |
| `apiClient`     | `/api`              | Mixed — dashboard, agents, runs |

Every client attaches `Authorization: Bearer <jwt>` and redirects to `/login` on 401.

**Import convention:** routes and components should import clients, types, and adapters from `@/lib/api`. Avoid reaching into `@/lib/clients` or `@/lib/workflowsApi` directly unless you are editing the lib layer itself.

---

## Routing Map

| Path              | Component            | Data source                                              |
| ----------------- | -------------------- | -------------------------------------------------------- |
| `/login`          | Login                | `authApi.post('/auth/login')`                            |
| `/dashboard`      | Dashboard            | `GET /api/dashboard/stats`, `GET /api/runs/?limit=5`     |
| `/workflows`      | Workflow list        | `workflowsApi.list()` → `GET /api/builder/workflows/`    |
| `/workflows/:id`  | Workflow builder     | `workflowsApi.get/update()` → graph + attachable         |
| `/agents`         | Agent list           | `GET /api/agents/`                                       |
| `/agents/:id`     | Agent detail         | `GET /api/agents/` (filtered client-side)                |
| `/activity`       | Run list             | `GET /api/runs/`                                         |
| `/activity/:runId`| Run trace            | `GET /api/runs/{id}/`                                    |
| `/ai-usage`       | AI usage             | Hardcoded demo data                                      |
| `/settings`       | Settings             | JWT license decode + `usersApi`                          |
| `/users`          | User admin           | `usersApi`                                               |

Pages call `useQuery` / `useMutation` inline — there are no separate query-hook wrapper modules.

---

## Workflow Builder — Key Concepts

### Node Types

The canvas uses **catalog-driven shapes**, not hardcoded executor types:

| Canvas `nodeType` | Renderer            | Notes                                           |
| ----------------- | ------------------- | ----------------------------------------------- |
| `shape`           | `DynamicShapeNode`  | Looks up `data.definitionSlug` in the catalog   |
| `workarea`        | `WorkAreaNode`      | Grouping container (Django work-area hierarchy) |

Palette tiles, SVG paths, ports, and inspector fields all come from `GET /api/builder/catalog/categories/`. Nothing about node appearance is hardcoded in the SPA.

### Django Graph ↔ xyflow Adapter

`workflowsApi.ts` translates between Django's nested graph and flat xyflow lists:

```
Django                          SPA (xyflow)
work_areas                      nodes[] (type: "shape" | "workarea")
  └ workbenches                   data.definitionSlug, data.properties
      └ shapes                    position, style
connections                     edges[]
```

- **Read:** `GET /workflows/{id}/graph/` → flatten to nodes/edges
- **Write:** `PUT /workflows/{id}/graph/` ← buildGraphPayload from canvas state

### Attachments

Per-shape SOP rules and tool bindings live in `Shape.properties`, hydrated by Django from binding tables. The attachable picker reads `GET /workflows/{id}/attachable/`.

### Live Execution

`useWorkflowExecution` is currently **stubbed** — it sets status `failed` with a "backend pending" message. Proxy routes for runs exist in the Node relay; wire the hook once Django execution endpoints are ready.

---

## REST Endpoints (via Node relay)

### Auth & Users (Node-owned)

| Method | Path                      | Notes                    |
| ------ | ------------------------- | ------------------------ |
| POST   | `/auth/register`          | First user → ADMIN       |
| POST   | `/auth/login`             | Returns JWT              |
| GET    | `/auth/me`                | Current user             |
| POST   | `/auth/change-password`   |                          |
| GET    | `/api/users/`             | Admin user list          |
| POST   | `/api/users/`             | Create user              |

### Builder (Django, proxied at `/api/builder`)

| Method | Path                              | Used by                    |
| ------ | --------------------------------- | -------------------------- |
| GET    | `/workflows/`                     | Workflow list              |
| POST   | `/workflows/`                     | Create                     |
| GET    | `/workflows/{id}/graph/`          | Load canvas                |
| PUT    | `/workflows/{id}/graph/`          | Save canvas                |
| GET    | `/workflows/{id}/attachable/`     | SOP rules + tools picker   |
| POST   | `/workflows/{id}/attach/`         | Link SOPs + runtime agents |
| POST   | `/workflows/{id}/duplicate/`      | Duplicate                  |
| DELETE | `/workflows/{id}/`                | Delete                     |
| GET    | `/catalog/categories/`            | Node palette               |
| GET    | `/catalog/shapes/`                | Flat shape list            |
| GET    | `/ui/navigation/`                 | Sidebar (server-driven)    |
| GET    | `/ui/dashboard/`                  | Dashboard widget defs      |

### Orchestration (Node BFF)

| Method | Path                    | Notes                                      |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/api/dashboard/stats`  | Aggregates agents + workflows from Django  |

### Runs & Agents (Django, proxied at `/api`)

| Method | Path                | Used by              |
| ------ | ------------------- | -------------------- |
| GET    | `/agents/`          | Agent registry       |
| GET    | `/runs/`            | Activity list        |
| GET    | `/runs/{id}/`       | Run detail           |

### SOP Ingestion (Django, proxied at `/api/ingest`)

Exclusion CRUD and HTML-block helpers are exposed via `sopExclusionsApi` in `@/lib/api`.

---

## Development Notes

### Adding a New Page

1. Create `src/routes/<domain>/index.tsx`
2. Add types to `src/interfaces/` if needed
3. Call `useQuery` / `useMutation` with a client from `@/lib/api`
4. Register the route in `src/routes/index.tsx`
5. Add a sidebar entry in Django catalog seed (`/ui/navigation/`) or hardcode if temporary

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`.

### Theme

Dark/light mode via `ThemeProvider` (`src/utils/theme.tsx`). Toggle with `ThemeToggleButton`. Persisted to `localStorage`.

### License Status

Read from the JWT payload via `decodeJwtPayload()` in `@/utils/auth` — no separate license API call.

### What is NOT yet integrated

- **Workflow live execution** — hook stubbed; Django run/step/advance endpoints pending
- `GET /api/runs/{id}/steps/` — per-run step log
- `GET /api/runs/{id}/agent-logs/` — merged agent execution logs
- `GET /api/runs/{id}/result/` — final outcome context
- Agent Prompts CRUD (`/api/agent-prompts/`)
- Workflow list shape summaries — `WorkflowCard` supports a `config` field but the Node BFF enrichment is not wired yet
# UHG Claims Agent Orchestration — Frontend

A React SPA for managing AI-driven claims workflows, agents, and run activity. All data is live — there is no static/demo mode.

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
yarn dev          # http://localhost:5173
yarn build        # production build → dist/
yarn compile      # tsc -b (typecheck only)
```

Set `VITE_API_BASE_URL` in `.env` to point at the Node relay (`claims-corebackend`, default `http://localhost:4000`).

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
      ▼
Django REST API  (uhc-agentic-backend / sop_backend, port 8000)
```

Authentication: the Node relay mints HS256 JWTs; every proxied Django request carries `Authorization: Bearer <jwt>` (both services share `JWT_SECRET`).

---

## Environment

| Variable            | Used by                                                         | Default               |
| ------------------- | --------------------------------------------------------------- | --------------------- |
| `VITE_API_BASE_URL` | All REST — auth, users, proxied Django routes                   | `http://localhost:4000` |
| `VITE_CLIENT_NAME`  | Brand string in the chrome                                      | `United Health Care`  |
| `VITE_CLIENT_LOGO`  | Optional logo URL in sidebar                                    | —                     |

Subpaths are appended to `VITE_API_BASE_URL` by the client factory — e.g. `/api/builder`, `/api/ingest`, `/api/users`.

---

## Project Structure

```
src/
├── main.tsx                        # Entry — QueryClient + Auth + Theme + Router
│
├── routes/                         # Route-level page components (no pages/ dir)
│   ├── index.tsx                   # AppRoutes
│   ├── login/index.tsx             # Login (Wipro branding)
│   ├── unauthorized/               # Role-mismatch landing
│   ├── dashboard/index.tsx         # Stats + recent runs
│   │
│   ├── workflows/
│   │   ├── index.tsx               # Workflow list
│   │   ├── [id]/index.tsx          # Builder canvas + execution shell
│   │   ├── types.ts                # Canvas types
│   │   ├── workflowCanvasUtils.ts  # Layout + edge routing
│   │   ├── hooks/
│   │   │   ├── useWorkflowCanvas.ts
│   │   │   └── useWorkflowUiColors.ts
│   │   ├── components/
│   │   │   ├── nodes/              # DynamicShapeNode, WorkAreaNode, nodeTypes
│   │   │   ├── NodePalette.tsx     # Catalog-driven drag palette
│   │   │   ├── ConfigPanel.tsx     # Inspector from ShapeDefinition.property_schema
│   │   │   ├── WorkflowCard.tsx    # List card (shape-count pills when config present)
│   │   │   ├── CreateWorkflowDialog.tsx
│   │   │   ├── WorkflowContextPanel.tsx
│   │   │   ├── NodeAttachments.tsx
│   │   │   ├── SopGraphDialog.tsx / SopGraphCanvas.tsx / SopSectionsPanel.tsx
│   │   │   └── ToolRegistryList.tsx / ToolInvokeModal.tsx
│   │   └── execution/
│   │       ├── useWorkflowExecution.ts   # Stub — backend execution pending
│   │       ├── ExecutionPanel.tsx
│   │       ├── ExecutionToolbar.tsx
│   │       └── types.ts
│   │
│   ├── agents/                     # Agent registry
│   ├── activity/                   # Run history
│   ├── ai-usage/                   # Token usage (mock data — no backend yet)
│   ├── settings/                   # Password + user management
│   ├── users/                      # Admin user list + detail
│   └── profile/                    # Current-user profile
│
├── layouts/
│   └── SidebarLayout.tsx           # App shell; nav driven by /ui/navigation/
│
├── components/                     # Shared UI (ui/, Sidebar/, Loader, …)
│
├── contexts/
│   └── AuthContext.tsx             # AuthProvider — login via authApi (Node)
│
├── interfaces/                     # Domain types (preferred)
│   ├── builder.ts                  # Catalog + Django graph types
│   ├── workflows.ts                # SPA workflow shapes + attachable rules
│   ├── sop.ts                      # SOP graph + exclusion types
│   └── identity.ts                 # Auth/user types from Node
│
├── lib/                            # Data layer
│   ├── api.ts                      # Public facade — import from here in routes
│   ├── apiClient.ts                # makeClient() factory + ApiError
│   ├── clients.ts                  # Singleton HTTP clients (relay, builder, …)
│   ├── workflowsApi.ts             # Builder graph ↔ xyflow adapter + CRUD
│   ├── catalogApi.ts               # Catalog hooks + /ui/* fetchers
│   └── staticPages.ts              # Legacy flag (unused)
│
└── utils/
    ├── auth.ts                     # Token storage, decodeJwtPayload
    ├── user.ts                     # User, isAdmin, getRoleLabel
    ├── theme.tsx                   # ThemeProvider + useTheme
    ├── utils.ts                    # cn() — clsx + tailwind-merge
    ├── query-pagination.ts         # Cursor pagination helpers for useQuery
    └── debounce.ts, compare-values.ts, …
```

---

## HTTP Clients

Defined in `src/lib/clients.ts`, re-exported from `@/lib/api`:

| Export          | Base path           | Backend                         |
| --------------- | ------------------- | ------------------------------- |
| `authApi`       | `` (relay root)     | Node — `/auth/*`                |
| `usersApi`      | `/api/users`        | Node — user CRUD                |
| `api`           | `/api/builder`      | Django builder (proxied)        |
| `ingestApi`     | `/api/ingest`       | Django SOP ingestion (proxied)  |
| `toolsApi`      | `/api/agent-tools`  | Django tool registry (proxied)  |
| `apiClient`     | `/api`              | Mixed — dashboard, agents, runs |

Every client attaches `Authorization: Bearer <jwt>` and redirects to `/login` on 401.

**Import convention:** routes and components should import clients, types, and adapters from `@/lib/api`. Avoid reaching into `@/lib/clients` or `@/lib/workflowsApi` directly unless you are editing the lib layer itself.

---

## Routing Map

| Path              | Component            | Data source                                              |
| ----------------- | -------------------- | -------------------------------------------------------- |
| `/login`          | Login                | `authApi.post('/auth/login')`                            |
| `/dashboard`      | Dashboard            | `GET /api/dashboard/stats`, `GET /api/runs/?limit=5`     |
| `/workflows`      | Workflow list        | `workflowsApi.list()` → `GET /api/builder/workflows/`    |
| `/workflows/:id`  | Workflow builder     | `workflowsApi.get/update()` → graph + attachable         |
| `/agents`         | Agent list           | `GET /api/agents/`                                       |
| `/agents/:id`     | Agent detail         | `GET /api/agents/` (filtered client-side)                |
| `/activity`       | Run list             | `GET /api/runs/`                                         |
| `/activity/:runId`| Run trace            | `GET /api/runs/{id}/`                                    |
| `/ai-usage`       | AI usage             | Hardcoded demo data                                      |
| `/settings`       | Settings             | JWT license decode + `usersApi`                          |
| `/users`          | User admin           | `usersApi`                                               |

Pages call `useQuery` / `useMutation` inline — there are no separate query-hook wrapper modules.

---

## Workflow Builder — Key Concepts

### Node Types

The canvas uses **catalog-driven shapes**, not hardcoded executor types:

| Canvas `nodeType` | Renderer            | Notes                                           |
| ----------------- | ------------------- | ----------------------------------------------- |
| `shape`           | `DynamicShapeNode`  | Looks up `data.definitionSlug` in the catalog   |
| `workarea`        | `WorkAreaNode`      | Grouping container (Django work-area hierarchy) |

Palette tiles, SVG paths, ports, and inspector fields all come from `GET /api/builder/catalog/categories/`. Nothing about node appearance is hardcoded in the SPA.

### Django Graph ↔ xyflow Adapter

`workflowsApi.ts` translates between Django's nested graph and flat xyflow lists:

```
Django                          SPA (xyflow)
work_areas                      nodes[] (type: "shape" | "workarea")
  └ workbenches                   data.definitionSlug, data.properties
      └ shapes                    position, style
connections                     edges[]
```

- **Read:** `GET /workflows/{id}/graph/` → flatten to nodes/edges
- **Write:** `PUT /workflows/{id}/graph/` ← buildGraphPayload from canvas state

### Attachments

Per-shape SOP rules and tool bindings live in `Shape.properties`, hydrated by Django from binding tables. The attachable picker reads `GET /workflows/{id}/attachable/`.

### Live Execution

`useWorkflowExecution` is currently **stubbed** — it sets status `failed` with a "backend pending" message. Proxy routes for runs exist in the Node relay; wire the hook once Django execution endpoints are ready.

---

## REST Endpoints (via Node relay)

### Auth & Users (Node-owned)

| Method | Path                      | Notes                    |
| ------ | ------------------------- | ------------------------ |
| POST   | `/auth/register`          | First user → ADMIN       |
| POST   | `/auth/login`             | Returns JWT              |
| GET    | `/auth/me`                | Current user             |
| POST   | `/auth/change-password`   |                          |
| GET    | `/api/users/`             | Admin user list          |
| POST   | `/api/users/`             | Create user              |

### Builder (Django, proxied at `/api/builder`)

| Method | Path                              | Used by                    |
| ------ | --------------------------------- | -------------------------- |
| GET    | `/workflows/`                     | Workflow list              |
| POST   | `/workflows/`                     | Create                     |
| GET    | `/workflows/{id}/graph/`          | Load canvas                |
| PUT    | `/workflows/{id}/graph/`          | Save canvas                |
| GET    | `/workflows/{id}/attachable/`     | SOP rules + tools picker   |
| POST   | `/workflows/{id}/attach/`         | Link SOPs + runtime agents |
| POST   | `/workflows/{id}/duplicate/`      | Duplicate                  |
| DELETE | `/workflows/{id}/`                | Delete                     |
| GET    | `/catalog/categories/`            | Node palette               |
| GET    | `/catalog/shapes/`                | Flat shape list            |
| GET    | `/ui/navigation/`                 | Sidebar (server-driven)    |
| GET    | `/ui/dashboard/`                  | Dashboard widget defs      |

### Orchestration (Node BFF)

| Method | Path                    | Notes                                      |
| ------ | ----------------------- | ------------------------------------------ |
| GET    | `/api/dashboard/stats`  | Aggregates agents + workflows from Django  |

### Runs & Agents (Django, proxied at `/api`)

| Method | Path                | Used by              |
| ------ | ------------------- | -------------------- |
| GET    | `/agents/`          | Agent registry       |
| GET    | `/runs/`            | Activity list        |
| GET    | `/runs/{id}/`       | Run detail           |

### SOP Ingestion (Django, proxied at `/api/ingest`)

Exclusion CRUD and HTML-block helpers are exposed via `sopExclusionsApi` in `@/lib/api`.

---

## Development Notes

### Adding a New Page

1. Create `src/routes/<domain>/index.tsx`
2. Add types to `src/interfaces/` if needed
3. Call `useQuery` / `useMutation` with a client from `@/lib/api`
4. Register the route in `src/routes/index.tsx`
5. Add a sidebar entry in Django catalog seed (`/ui/navigation/`) or hardcode if temporary

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`.

### Theme

Dark/light mode via `ThemeProvider` (`src/utils/theme.tsx`). Toggle with `ThemeToggleButton`. Persisted to `localStorage`.

### License Status

Read from the JWT payload via `decodeJwtPayload()` in `@/utils/auth` — no separate license API call.

### What is NOT yet integrated

- **Workflow live execution** — hook stubbed; Django run/step/advance endpoints pending
- `GET /api/runs/{id}/steps/` — per-run step log
- `GET /api/runs/{id}/agent-logs/` — merged agent execution logs
- `GET /api/runs/{id}/result/` — final outcome context
- Agent Prompts CRUD (`/api/agent-prompts/`)
- Workflow list shape summaries — `WorkflowCard` supports a `config` field but the Node BFF enrichment is not wired yet
