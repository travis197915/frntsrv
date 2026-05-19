# UHG Claims Agent Orchestration — Frontend

A React SPA for designing claims-audit workflows on a visual canvas, attaching SOP rules + runtime API agents to each step, and executing those workflows live against real claim data. All data is live — there is no static / demo mode.

The UI itself is **catalog-driven**: the sidebar nav, the dashboard tiles, the workflow-canvas palette, and every per-shape inspector form are all defined in the Django backend and arrive over REST. Nothing about the chrome is hardcoded.

---

## Tech Stack

| Layer           | Technology                                                                  |
| --------------- | --------------------------------------------------------------------------- |
| Framework       | React 19 + TypeScript 5.9                                                   |
| Build           | Vite 7 (`@vitejs/plugin-react`)                                             |
| Styling         | Tailwind CSS 4 (via `@tailwindcss/vite`) + shadcn/ui (New York, Radix)      |
| Data — Builder  | `fetch`-based REST clients (`src/lib/api.ts`) → Django                      |
| Data — Identity | `fetch`-based REST client → Node `claims-corebackend`                       |
| Data — Run-time | Apollo Client 4 + `apollo-upload-client` → legacy GraphQL relay (execution) |
| Routing         | React Router DOM 7                                                          |
| Canvas          | React Flow (`@xyflow/react`) + Dagre (auto-layout for SOP graph)            |
| Icons           | lucide-react                                                                |
| Package Manager | Yarn (`.npmrc` shipped)                                                     |

---

## Quick Start

```bash
yarn install
yarn dev        # http://localhost:5173
yarn build      # tsc -b && vite build → dist/
yarn preview    # serve the production build
yarn lint       # eslint .
yarn compile    # graphql-codegen — regenerates __generated__/ from VITE_GRAPHQL_CODEGEN_URL
```

Copy `.env.example` to `.env` and point the variables at your services (see [Environment](#environment) below).

---

## Backend Architecture

Two backends sit behind the SPA. They share a `JWT_SECRET`, so a token minted by the identity service is accepted by every other service unchanged.

```
                                     ┌─────────────────────────────────────────────────┐
                                     │            React SPA (this repo)                 │
                                     │  fetch (REST)             Apollo Client (GraphQL)│
                                     └────────┬─────────────────────────────────┬──────┘
                                              │                                 │
                  Identity ◄───────────────────┤                                 │
   /auth/login    Node `claims-corebackend`    │                                 │
   /auth/me       (Prisma)                     │                                 │
                                              │                                 │
                  Builder + SOP ingestion ◄────┤                                 │
   /catalog/*     Django `sop_backend`         │                                 │
   /ui/*          ├─ builder/ app              │                                 │
   /workflows/*   └─ sop_ingestion/ app        │                                 │
   /ingest/*                                                                     │
                                                                                 │
                  Legacy execution relay ◄──────────────────────────────────────┘
                  Node GraphQL relay → Django REST (startRun / startStep /
                  advanceRun / uploadRunFile / submitPreflight)
```

Workflows, the shape catalog, the sidebar, the dashboard widgets, and the SOP knowledge-graph viewer all hit Django over REST. Live execution still goes through the original GraphQL relay; that path will be migrated next.

---

## Environment

All variables are read at build-time via `import.meta.env.*` and are optional — sensible localhost defaults live in `src/lib/api.ts`.

| Variable                       | Used by                                                                  | Default                          |
| ------------------------------ | ------------------------------------------------------------------------ | -------------------------------- |
| `VITE_AUTH_API_BASE_URL`       | `authApi` → Node identity service (`/auth/*`)                            | `http://localhost:4000`          |
| `VITE_BUILDER_API_BASE_URL`    | `api` → Django builder (`/catalog/*`, `/ui/*`, `/workflows/*`)           | `http://localhost:8000/api/builder` |
| `VITE_API_BASE_URL`            | Legacy fallback for the identity URL — kept until callers are migrated   | mirrors `VITE_AUTH_API_BASE_URL` |
| `VITE_GRAPHQL_BACKEND_URL`     | Apollo Client (execution mutations: `startRun`, `advanceRun`, …)         | required for `Execute`           |
| `VITE_GRAPHQL_CODEGEN_URL`     | `yarn compile` schema source                                             | same as `VITE_GRAPHQL_BACKEND_URL` |
| `VITE_CLIENT_NAME`             | Brand string shown in the chrome                                         | `United Health Care`             |

The Django origin (no path) is derived from `VITE_BUILDER_API_BASE_URL` and used to talk to the SOP-ingestion app at `/api/ingest/`.

---

## Project Structure

```
src/
├── main.tsx                                # Entry — Apollo (UploadHttpLink) + Auth + Theme + Router
├── App.tsx                                 # Standalone marketing shell (not part of authed routes)
├── App.css / index.css                     # Tailwind layers + globals
│
├── routes/
│   ├── index.tsx                           # Route table — wraps protected routes in <ProtectedRoute>
│   ├── login/                              # Wipro-branded login form (calls authApi)
│   ├── unauthorized/                       # Role-mismatch landing page
│   │
│   ├── dashboard/                          # Dashboard tiles (data-driven from /ui/dashboard/)
│   ├── workflows/                          # Workflow list + builder (see "Workflow Builder" below)
│   ├── agents/                             # Agent registry list + detail
│   ├── activity/                           # Run history list + per-run trace
│   ├── ai-usage/                           # Token usage dashboard (mock data — no backend yet)
│   ├── settings/                           # User-facing settings shell
│   ├── users/                              # User list + detail (admin)
│   └── profile/                            # Current-user profile page
│
├── lib/                                    # Backend clients — the "data layer"
│   ├── api.ts                              # fetch wrapper + ApiError + authApi/api/ingestApi
│   │                                       #   shared types: SOP graph, SOP sections, shape catalog,
│   │                                       #   builder graph (workflows + workareas + workbenches)
│   ├── catalogApi.ts                       # /catalog/* + /ui/* helpers + useNavigation/useDashboard
│   ├── workflowsApi.ts                     # CRUD + duplicate/activate/attach + Builder↔xyflow adapter
│   ├── theme.tsx                           # ThemeProvider + useTheme (dark/light)
│   ├── utils.ts                            # `cn()` — clsx + tailwind-merge
│   └── staticPages.ts                      # Legacy flag (no longer used for data gating)
│
├── components/                             # Shared UI
│   ├── ui/                                 # shadcn primitives: button, dialog, input, popover, …
│   ├── Sidebar/
│   │   ├── PlatformSection.tsx             # ENTIRELY backend-driven (icons, sections, order)
│   │   └── SidebarNavItem.tsx
│   ├── FormPanel/                          # Login + form shells
│   ├── ProtectedRoute.tsx                  # Auth guard → /login
│   ├── StatusBadge.tsx, EmptyState.tsx, ErrorAlert.tsx, Loader.tsx,
│   ├── NotFound.tsx, ThemeToggleButton.tsx, TextField.tsx
│
├── routes/workflows/                       # Workflow builder — the heart of the app
│   ├── index.tsx                           # List page → workflowsApi.list()
│   ├── [id]/index.tsx                      # Builder shell (React Flow + execution + side panels)
│   ├── types.ts                            # Canvas types + NODE_TYPE_CONFIG legend
│   ├── workflowCanvasUtils.ts              # Layout + edge-routing helpers
│   ├── hooks/
│   │   ├── useWorkflowCanvas.ts            # React Flow state: nodes/edges, drag, save, edge labels
│   │   └── useWorkflowUiColors.ts          # Theme-aware canvas palette
│   ├── components/
│   │   ├── NodePalette.tsx                 # Catalog-driven palette — categories from /catalog/categories/
│   │   ├── ConfigPanel.tsx                 # Selected-node inspector (form generated from
│   │   │                                   #   ShapeDefinition.property_schema)
│   │   ├── NodeAttachments.tsx             # Attach SOP rules + tools to a single shape
│   │   ├── WorkflowContextPanel.tsx        # Right rail when nothing is selected — SOPs + agents
│   │   ├── WorkflowCard.tsx                # Card on the list page
│   │   ├── CreateWorkflowDialog.tsx        # Name + SOP URLs + runtime agents
│   │   ├── SopGraphDialog.tsx              # Full-screen SOP knowledge-graph viewer
│   │   ├── SopGraphCanvas.tsx              # Dagre-layouted xyflow render of the SOP graph
│   │   ├── SopSectionsPanel.tsx            # Right column on the SOP dialog — tabular SOP view
│   │   ├── edges/                          # (custom edge components)
│   │   └── nodes/
│   │       ├── ShapeCatalogProvider.tsx    # Single fetch of /catalog/categories/ for the canvas
│   │       ├── DynamicShapeNode.tsx        # The renderer for every catalog shape
│   │       ├── nodeTypes.ts                # xyflow nodeTypes map (shape, workarea, + legacy types)
│   │       ├── BaseNode.tsx                # Shared chrome — selection ring, handles
│   │       ├── WorkAreaNode.tsx            # Hardcoded container (hierarchy parent in Django)
│   │       └── TriggerNode.tsx,
│   │           ActionNode.tsx,
│   │           ConditionNode.tsx,
│   │           OutputNode.tsx              # Legacy hardcoded renderers — still used by older seeds
│   └── execution/
│       ├── useWorkflowExecution.ts         # Live execution hook (start → step → advance loop)
│       ├── ExecutionOverlay.tsx            # Canvas overlay during a run
│       ├── ExecutionPanel.tsx              # Right-rail step log + input forms
│       ├── ExecutionToolbar.tsx            # Floating status bar
│       ├── NodeInteractionPrompt.tsx       # Per-node "waiting for input" prompt
│       └── types.ts                        # NodeExecutionState, EdgeExecutionStatus, InteractionType
│
├── graphql/                                # GraphQL ops still consumed by the execution path
│   ├── workflow.graphql.ts                 # StartRun / StartStep / AdvanceRun / UploadRunFile / SubmitPreflight
│   ├── agent.graphql.ts                    # ListAgents / GetAgent / ListComboTemplates
│   ├── activity, dashboard, license, auth.*.ts  (kept until callers fully migrate to REST)
│
├── __generated__/                          # Output of `yarn compile` — do not edit
├── contexts/AuthContext.tsx                # AuthProvider + useAuth (calls authApi)
├── utils/auth.ts                           # token storage helpers + getAuthorizationHeader
├── types/                                  # Shared cross-route types
├── data/                                   # Static lookups (e.g. agents.ts seed data)
├── layouts/SidebarLayout.tsx               # App chrome (sidebar + main pane)
└── apollo-upload-client.d.ts               # Shim for the JS-only UploadHttpLink module
```

---

## Routing Map

| Path                | Component                | Notes                                                                                |
| ------------------- | ------------------------ | ------------------------------------------------------------------------------------ |
| `/login`            | `routes/login`           | POST `/auth/login` → token + user                                                    |
| `/unauthorized`     | `routes/unauthorized`    | Shown when a role check fails                                                        |
| `/` → `/dashboard`  | `routes/dashboard`       | Tiles come from `/api/builder/ui/dashboard/`                                          |
| `/workflows`        | `routes/workflows`       | `workflowsApi.list()` — Django `/workflows/`                                          |
| `/workflows/:id`    | `routes/workflows/[id]`  | Full builder — see below                                                              |
| `/workflows/new`    | `routes/workflows/[id]`  | Same component, no `id` — creates on first save                                       |
| `/agents`           | `routes/agents`          | Agent registry list                                                                   |
| `/agents/:id`       | `routes/agents/[id]`     | Agent detail                                                                          |
| `/activity`         | `routes/activity`        | Run history                                                                           |
| `/activity/:runId`  | `routes/activity/[id]`   | Per-run trace                                                                         |
| `/ai-usage`         | `routes/ai-usage`        | Hardcoded mock — no backend yet                                                       |
| `/settings`         | `routes/settings`        | User-facing settings                                                                  |
| `/users`            | `routes/users`           | Admin user list                                                                       |
| `/users/:id`        | `routes/users/[id]`      | User detail                                                                           |
| `/profile`          | `routes/profile`         | Logged-in user's profile                                                              |
| `*`                 | `components/NotFound`    | 404                                                                                   |

Everything except `/login` and `/unauthorized` is wrapped by `<ProtectedRoute>`, which redirects to `/login` when no user is in context.

---

## Workflow Builder

### Catalog → Canvas

`ShapeCatalogProvider` fetches `GET /catalog/categories/` once and exposes:

- `categories[]` — palette sections in their backend-defined order
- `shapes[]` — flat list of every `ShapeDefinition`
- `bySlug` — `Record<slug, ShapeDefinition>` for renderers + inspectors

`NodePalette` consumes the categories and renders draggable thumbnails using each shape's `default_style.fill / stroke / accent`. Dragging encodes the catalog slug as `shape:<slug>` on the dataTransfer; the canvas drop handler reads it back.

`DynamicShapeNode` is the renderer for every dropped tile. It looks the slug up in the catalog and draws the box at `default_width × default_height` with the same colours as the palette thumbnail. No node component is hardcoded apart from `WorkAreaNode` (which is a Django hierarchy parent, not a palette item).

`ConfigPanel` generates the inspector form from the selected shape's `property_schema` — each `ShapePropertyField` (`string` / `text` / `number` / `boolean` / `select`) becomes the corresponding input.

### Workflow ↔ Django round-trip

`workflowsApi` adapts between the flat xyflow `{ nodes, edges }` the SPA was written against and Django's hierarchical `work_areas → workbenches → shapes` graph:

```
   xyflow node                          Django shape
   ───────────                          ────────────
   id                          ←→       id   (or client_id for new ones)
   position { x, y }           ←→       position_x, position_y
   style { width, height }     ←→       width, height
   data.definitionSlug         ←→       definition_slug
   data.label / description    ←→       label / description
   data.properties             ←→       properties (free-form JSON)
   data.style                  ←→       style (per-instance overrides)
   data.workbenchId / workAreaId        (parent UUIDs — used to group on save)
```

Edges are currently a frontend-only concern (persisted in `localStorage` by `useWorkflowCanvas`); the save payload always sends `connections: []`. Workbench / work-area edits are inferred from the parent IDs carried on every node — nodes that arrive without a parent fall into a default `Canvas / Default` group so the canvas always round-trips.

### Per-shape attachments

`NodeAttachments` lets you bind SOP rules (preconditions or decision rows) and runtime tool calls to an individual shape on the canvas. The list of attachable items per workflow is served by `GET /workflows/:id/attachable/`; the picker dialog is searchable and tone-codes decision types (DENY / ALLOW / PEND / REFER / BYPASS / …). Attachments are persisted on `Shape.properties.sop_rules` and `Shape.properties.tool_calls`.

### Right rail (no selection)

When no node is selected, `WorkflowContextPanel` shows the workflow-level context: attached SOPs (with ingestion status — QUEUED / RUNNING / COMPLETED / PARTIAL / FAILED), attached runtime API agents, and an "Add SOP / Add Agent" affordance. While any SOP is still QUEUED or RUNNING the panel polls `workflowsApi.get(id)` every 4 s.

Clicking a completed SOP opens `SopGraphDialog`, a full-screen split view with:

- **Left** — `SopGraphCanvas`: an xyflow render of the SOP knowledge graph, auto-laid out with Dagre. Each node type (`DOCUMENT`, `META`, `STEP`, `DECISION`, `ANNOTATION`, `CODE`, `GROUP_LIMIT`, …) gets its own tone.
- **Right** — `SopSectionsPanel`: the same SOP in a navigable tabular view (title, purpose, preconditions, steps with decision rows, codes, group limits, annotations, references). Decision rows are tone-coded the same way as `NodeAttachments`.

### Live execution flow (`useWorkflowExecution`)

Execution still uses the Apollo + GraphQL path (Django REST under the hood). The hook drives a `start → step → advance` loop:

```
startLiveExecution(workflowId)
  │
  ├─ startRun mutation  →  POST /api/workflows/{id}/runs/
  │     returns { runId, currentWorkbench }
  │
  └─ loop per workbench:
       ├─ startStep mutation  →  POST /api/runs/{id}/steps/{wb_id}/start/
       │     if awaitingInput + TRIGGER:
       │       wait for user text → re-call startStep with input
       │     if awaitingInput + CLAIM_PREFLIGHT:
       │       wait for { excelFile, pdfFile, claimId }
       │       uploadRunFile(claim_excel_url)  →  POST /api/runs/{id}/upload/
       │       uploadRunFile(claim_pdf_url)    →  POST /api/runs/{id}/upload/
       │       submitPreflight(claimId)        →  POST /api/runs/{id}/preflight/
       │     if awaitingInput + SOP:
       │       wait for { htmlFiles[] }
       │       uploadRunFile(...) per file
       │
       └─ advanceRun mutation  →  POST /api/runs/{id}/advance/
             if done → mark completed
             else    → next iteration with nextWorkbench
```

The hook exposes:
`startLiveExecution`, `cancel`, `reset`,
`submitInteraction` (text input),
`submitPreflightInput` (Excel + PDF + claim ID),
`submitSopInput` (one or more HTML files).

`ExecutionOverlay` and `ExecutionPanel` render the live node/edge state on top of the existing canvas; the toolbar at the bottom shows phase, elapsed time, and a cancel button.

---

## REST Endpoints (Django builder)

Hit through `api` in `src/lib/api.ts` — all paths are relative to `VITE_BUILDER_API_BASE_URL`.

### Catalog (`/catalog/*`)

| Method | Path                         | Notes                                   |
| ------ | ---------------------------- | --------------------------------------- |
| GET    | `/catalog/categories/`       | Palette categories with embedded shapes |
| GET    | `/catalog/shapes/`           | Flat shape list                         |
| GET    | `/catalog/shapes/:slug/`     | Single shape definition                 |

### UI (`/ui/*`)

| Method | Path               | Notes                                       |
| ------ | ------------------ | ------------------------------------------- |
| GET    | `/ui/navigation/`  | Sidebar entries (icon name, section, order, min_role) |
| GET    | `/ui/dashboard/`   | Dashboard widgets (kind: stat/chart/list/card)        |

### Workflows (`/workflows/*`)

| Method | Path                              | Notes                                                |
| ------ | --------------------------------- | ---------------------------------------------------- |
| GET    | `/workflows/`                     | List                                                 |
| GET    | `/workflows/:id/graph/`           | Full graph (work_areas + connections + sops + agents) |
| POST   | `/workflows/`                     | Create (`sop_urls`, `runtime_agents` start ingestion) |
| PUT    | `/workflows/:id/graph/`           | Bulk save graph                                       |
| PATCH  | `/workflows/:id/`                 | Patch metadata (`name`, `description`, `is_active`)   |
| DELETE | `/workflows/:id/`                 | Delete                                                |
| POST   | `/workflows/:id/duplicate/`       | Clone (optionally with a new name)                    |
| POST   | `/workflows/:id/activate/`        | `is_active = true`                                    |
| POST   | `/workflows/:id/deactivate/`      | `is_active = false`                                   |
| GET    | `/workflows/:id/attachable/`      | All SOP rules + tools attachable to a node            |
| POST   | `/workflows/:id/attach/`          | Attach more SOP URLs / runtime API agents             |

### SOP ingestion (Django, `/api/ingest/*`, addressed via `ingestApi`)

`SopGraphCanvas` and `SopSectionsPanel` consume this surface to render the knowledge-graph viewer.

### Identity (`/auth/*`, Node `claims-corebackend`, addressed via `authApi`)

| Method | Path                       | Notes                                              |
| ------ | -------------------------- | -------------------------------------------------- |
| POST   | `/auth/login`              | Returns `{ token, user }`                          |
| POST   | `/auth/register`           |                                                    |
| GET    | `/auth/me`                 | Re-hydrates the user object on app load            |
| POST   | `/auth/change-password`    |                                                    |

The token is stored under `localStorage.token` and the cached user under `localStorage.auth_user`; `clearAuth()` wipes both and bounces to `/login`.

### Execution (legacy GraphQL relay — `VITE_GRAPHQL_BACKEND_URL`)

`workflow.graphql.ts` defines: `StartRun`, `StartStep`, `AdvanceRun`, `UploadRunFile`, `SubmitPreflight`. Files travel via `apollo-upload-client`'s `UploadHttpLink` — any mutation with an `Upload!` argument is automatically sent as a multipart request.

---

## Development Notes

### Adding a new palette shape

Add it in Django (`builder` app); no frontend change required. `ShapeCatalogProvider` will pick it up on the next page load. Bind the new slug in `nodeTypes.ts` only if you need a hand-rolled renderer instead of `DynamicShapeNode`.

### Adding a new sidebar entry

Add a row to the `NavItem` model in Django (icon = any lucide name). `PlatformSection` looks the icon up against `lucide-react` at runtime and falls back to `Circle` if the name doesn't resolve.

### Adding a new page

1. Create `src/routes/<domain>/index.tsx`.
2. Use `api` / `authApi` / `ingestApi` from `src/lib/api.ts` — do **not** add new Apollo queries unless they will be served by the legacy GraphQL relay.
3. Register the route in `src/routes/index.tsx`.
4. Decide whether the page should appear in the sidebar; if yes, add the `NavItem` row in Django rather than hardcoding it here.

### Adding a shadcn/ui primitive

```bash
npx shadcn@latest add <component-name>
```

Lands in `src/components/ui/`. shadcn config: `components.json` (New York, neutral base, lucide icons, alias `@ → src`).

### Theme

`ThemeProvider` in `src/lib/theme.tsx` — `defaultTheme="light"`, dark/light toggled by `ThemeToggleButton`, persisted to `localStorage`.

### Regenerating GraphQL types

```bash
yarn compile      # uses VITE_GRAPHQL_CODEGEN_URL (falls back to VITE_GRAPHQL_BACKEND_URL)
```

Writes to `src/__generated__/`. Do not hand-edit anything in there.

### Path aliases

`@/*` → `src/*`. Configured in both `vite.config.ts` and `tsconfig.app.json`.

---

## What is NOT yet integrated

Backend endpoints that exist but the frontend doesn't consume:

- `GET /api/runs/:id/steps/` — per-run step log (currently embedded in run detail)
- `GET /api/runs/:id/steps/:wb_run_id/detail/` — full I/O snapshot per step
- `GET /api/runs/:id/agent-logs/` — merged agent execution logs
- `GET /api/runs/:id/result/` — final outcome context dict
- Agent-prompt CRUD (`/api/agent-prompts/`, `/api/workbench-agents/:id/set-prompt/`)

Frontend pages that don't yet have a backend:

- `/ai-usage` — hardcoded mock data lives in `routes/ai-usage/demoData.ts`

Migration in progress:

- The execution path still uses Apollo + the GraphQL relay. Once the relay's mutations have direct Django REST equivalents, `useWorkflowExecution` will move onto `api` and Apollo can be removed entirely.
