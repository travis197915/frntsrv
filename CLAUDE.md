# UHG Claims Agent Orchestration — Frontend

A React SPA for managing AI-driven claims workflows, agents, and run activity. All data is live — there is no static/demo mode.

---

## Tech Stack

| Layer           | Technology                                                        |
| --------------- | ----------------------------------------------------------------- |
| Framework       | React 19 + TypeScript                                             |
| Build           | Vite 7 (`@vitejs/plugin-react`)                                   |
| Styling         | Tailwind CSS 4 + shadcn/ui (New York variant, Radix primitives)   |
| Data            | Apollo Client 4 → GraphQL (`apollo-upload-client` for file uploads) |
| Routing         | React Router DOM 7                                                |
| Canvas          | React Flow (`@xyflow/react`) for the workflow node editor         |
| Icons           | lucide-react                                                      |
| Package Manager | Yarn                                                              |

---

## Quick Start

```bash
yarn install
yarn dev          # http://localhost:5173
yarn build        # production build → dist/
yarn codegen      # regenerate GraphQL types from schema
```

Set `VITE_GRAPHQL_BACKEND_URL` in `.env` to point at the Node.js GraphQL relay.

---

## Backend Architecture

The frontend never calls Django directly. Requests flow through a Node.js GraphQL relay:

```
React (Apollo Client)
      │  GraphQL over HTTP (apollo-upload-client for files)
      ▼
Node.js GraphQL Relay  (claims-node-backend)
      │  HTTP + multipart (axios + form-data)
      ▼
Django REST API  (claims-backend, port 8000)
```

Authentication: The Node backend mints HS256 JWTs; every Django request carries `Authorization: Bearer <jwt>`.

---

## Project Structure

```
src/
├── main.tsx                        # Entry — Apollo (UploadHttpLink) + Auth + Theme providers
│
├── routes/                         # All route-level page components (no separate pages/ dir)
│   ├── index.tsx                   # AppRoutes — route definitions
│   ├── login/index.tsx             # Login page (Wipro branding)
│   ├── dashboard/index.tsx         # Dashboard: stats + recent runs (API-driven)
│   │
│   ├── workflows/                  # Workflow management
│   │   ├── index.tsx               # Workflow list page
│   │   ├── [id]/index.tsx          # Workflow builder (React Flow canvas + live execution)
│   │   ├── types.ts                # WorkflowNode, WorkflowEdge, WorkflowNodeData types
│   │   ├── hooks/
│   │   │   ├── useWorkflowCanvas.ts      # React Flow state management (nodes, edges, drag)
│   │   │   └── useWorkflowUiColors.ts    # Theme-aware canvas colors
│   │   ├── components/
│   │   │   ├── nodes/              # BaseNode + specialised node renderers + nodeTypes map
│   │   │   ├── edges/AnimatedEdge.tsx    # Animated connection edge
│   │   │   ├── NodePalette.tsx     # Left drag palette (disables step nodes without workarea)
│   │   │   ├── WorkflowCard.tsx    # Card on the list page
│   │   │   └── ConfigPanel.tsx     # Right-side node config (agent dropdown uses LIST_AGENTS_QUERY)
│   │   └── execution/
│   │       ├── useWorkflowExecution.ts   # Live execution hook (start → step → advance loop)
│   │       ├── ExecutionPanel.tsx        # Right-panel step log + input forms
│   │       ├── ExecutionToolbar.tsx      # Floating status bar + cancel button
│   │       ├── ExecutionOverlay.tsx      # Canvas overlay (disabled in live mode)
│   │       └── types.ts                 # NodeExecutionState, EdgeExecutionStatus, InteractionType
│   │
│   ├── agents/                     # Agent registry
│   │   ├── index.tsx               # Agent list (fetched via LIST_AGENTS_QUERY)
│   │   └── [id]/index.tsx          # Agent detail page
│   │
│   ├── activity/                   # Workflow run history
│   │   ├── index.tsx               # Run list (LIST_TRANSACTIONS_QUERY → /api/runs/)
│   │   └── [id]/index.tsx          # Run detail / execution trace
│   │
│   ├── ai-usage/                   # AI token usage (hardcoded mock data — no backend yet)
│   │   ├── index.tsx
│   │   └── demoData.ts
│   │
│   └── settings/index.tsx          # License upload + user management
│
├── components/                     # Shared UI components
│   ├── ui/                         # shadcn/ui primitives
│   ├── Sidebar/                    # SidebarLayout + nav items
│   ├── StatusBadge.tsx
│   ├── EmptyState.tsx
│   ├── ErrorAlert.tsx
│   ├── Loader.tsx
│   └── ProtectedRoute.tsx
│
├── graphql/                        # GraphQL operation definitions
│   ├── agent.graphql.ts            # LIST_AGENTS_QUERY, GET_AGENT_QUERY, LIST_COMBO_TEMPLATES_QUERY
│   ├── auth.graphql.ts
│   ├── dashboard.graphql.ts        # DASHBOARD_STATS_QUERY
│   ├── license.graphql.ts          # LICENSE_STATUS_QUERY
│   ├── transaction.graphql.ts      # LIST_TRANSACTIONS_QUERY, GET_TRANSACTION_QUERY
│   └── workflow.graphql.ts         # CRUD + execution mutations (StartRun, StartStep, AdvanceRun,
│                                   #   UploadRunFile, SubmitPreflight)
│
├── __generated__/                  # Auto-generated by graphql-codegen (do not edit)
│
├── contexts/
│   └── AuthContext.tsx             # AuthProvider, useAuth hook
│
├── lib/
│   ├── theme.tsx                   # ThemeProvider + useTheme (dark/light)
│   ├── utils.ts                    # cn() — Tailwind class merger
│   └── staticPages.ts             # Legacy flag file (no longer used for data gating)
│
└── utils/
    └── auth.ts                     # getToken, setToken, clearAuth, getAuthorizationHeader
```

---

## Routing Map

| Path              | Component            | Key GraphQL Operations                                    |
| ----------------- | -------------------- | --------------------------------------------------------- |
| `/login`          | Login                | `login` mutation                                          |
| `/`               | Dashboard            | `dashboardStats`, `licenseStatus`, `transactions`         |
| `/workflows`      | Workflow list        | `workflows`, `deleteWorkflow`                             |
| `/workflows/:id`  | Workflow builder     | `workflow`, `updateWorkflow`, `startRun`, `startStep`, `advanceRun`, `uploadRunFile`, `submitPreflight` |
| `/agents`         | Agent list           | `agents`                                                  |
| `/agents/:id`     | Agent detail         | `agent`                                                   |
| `/activity`       | Activity / run list  | `transactions`                                            |
| `/activity/:id`   | Run trace            | `transaction`                                             |
| `/ai-usage`       | AI usage dashboard   | — (hardcoded data)                                        |
| `/settings`       | Settings             | `licenseStatus`, auth mutations                           |

---

## Workflow Builder — Key Concepts

### Node Types

| Canvas `nodeType`  | Django `executor_type` | Notes                                      |
| ------------------ | ---------------------- | ------------------------------------------ |
| `workarea`         | `workarea`             | Grouping container, not executed           |
| `trigger`          | `trigger`              | Entry point, may block for user input      |
| `agent_combo`      | `agent_combo`          | Runs a combo template; configured via `combo_id` |
| `claim_preflight`  | `claim_preflight`      | Blocks until Excel + PDF + claim ID uploaded |
| `output`           | `output`               | Terminal node                              |

Step nodes (non-workarea) cannot be dragged onto the canvas unless a `workarea` node already exists — the palette disables them with a tooltip otherwise.

### Live Execution Flow (`useWorkflowExecution`)

```
startLiveExecution(workflowId)
  │
  ├─ startRun mutation  →  POST /api/workflows/{id}/runs/
  │     returns { id, currentWorkbench }
  │
  └─ loop per workbench:
       ├─ startStep mutation  →  POST /api/runs/{id}/steps/{wb_id}/start/
       │     if awaitingInput + TRIGGER:
       │       wait for user text → re-call startStep with input
       │     if awaitingInput + CLAIM_PREFLIGHT:
       │       wait for PreflightInput { excelFile, pdfFile, claimId }
       │       uploadRunFile(claim_excel_url)  →  POST /api/runs/{id}/upload/
       │       uploadRunFile(claim_pdf_url)    →  POST /api/runs/{id}/upload/
       │       submitPreflight(claimId)        →  POST /api/runs/{id}/preflight/
       │
       └─ advanceRun mutation  →  POST /api/runs/{id}/advance/
             if done → mark completed
             else    → next iteration with nextWorkbench
```

The hook exposes: `startLiveExecution`, `cancel`, `reset`, `submitInteraction` (text input), `submitPreflightInput` (file upload).

### Agent Combo Configuration

`agent_combo` nodes use a `combo_id` referencing a server-side combo template. The `ConfigPanel` fetches available individual agents via `LIST_AGENTS_QUERY` and stores the selected agent's `name` as both `agentType` and `combo_id` in node data.

---

## GraphQL Operations

### Workflows (`workflow.graphql.ts`)

| Operation              | Type     | Django endpoint                              |
| ---------------------- | -------- | -------------------------------------------- |
| `ListWorkflows`        | Query    | `GET /api/workflows/`                        |
| `GetWorkflow`          | Query    | `GET /api/workflows/{id}/`                   |
| `GetWorkflowRuns`      | Query    | `GET /api/workflows/{id}/runs-list/`         |
| `GetWorkflowRun`       | Query    | `GET /api/runs/{id}/`                        |
| `CreateWorkflow`       | Mutation | `POST /api/workflows/`                       |
| `UpdateWorkflow`       | Mutation | `PUT /api/workflows/{id}/`                   |
| `DeleteWorkflow`       | Mutation | `DELETE /api/workflows/{id}/`                |
| `StartRun`             | Mutation | `POST /api/workflows/{id}/runs/`             |
| `StartStep`            | Mutation | `POST /api/runs/{id}/steps/{wb_id}/start/`   |
| `AdvanceRun`           | Mutation | `POST /api/runs/{id}/advance/`               |
| `UploadRunFile`        | Mutation | `POST /api/runs/{id}/upload/`  (multipart)   |
| `SubmitPreflight`      | Mutation | `POST /api/runs/{id}/preflight/`             |

### Agents (`agent.graphql.ts`)

| Operation              | Type  | Django endpoint              |
| ---------------------- | ----- | ---------------------------- |
| `ListAgents`           | Query | `GET /api/agents/`           |
| `GetAgent`             | Query | `GET /api/agents/` (filtered)|
| `ListComboTemplates`   | Query | `GET /api/combo-templates/`  |

### Activity (`transaction.graphql.ts`)

| Operation            | Type  | Django endpoint       |
| -------------------- | ----- | --------------------- |
| `ListTransactions`   | Query | `GET /api/runs/`      |
| `GetTransaction`     | Query | `GET /api/runs/{id}/` |

### Other

| Operation          | File                    | Notes                                        |
| ------------------ | ----------------------- | -------------------------------------------- |
| `DashboardStats`   | `dashboard.graphql.ts`  | Aggregates agents + workflows + runs counts  |
| `LicenseStatus`    | `license.graphql.ts`    | Read from JWT payload, no Django call        |

Regenerate types after schema changes:

```bash
yarn codegen
```

---

## Development Notes

### Adding a New Page

1. Create `src/routes/<domain>/index.tsx`
2. Add GraphQL operations in `src/graphql/<domain>.graphql.ts`
3. Run `yarn codegen`
4. Register the route in `src/routes/index.tsx`
5. Add a sidebar link in the relevant `Sidebar` component

### File Uploads

Apollo Client is configured with `UploadHttpLink` from `apollo-upload-client`. Any mutation that accepts a `Upload!` scalar argument will automatically be sent as a multipart request — no extra configuration needed on the component side.

### Adding a shadcn/ui Component

```bash
npx shadcn@latest add <component-name>
```

Components land in `src/components/ui/`.

### Theme

Dark/light mode via `ThemeProvider` (`src/lib/theme.tsx`). Toggle with `ThemeToggleButton`. Persisted to `localStorage`.

### What is NOT yet integrated (backend APIs exist but no frontend wiring)

- `GET /api/runs/{id}/steps/` — per-run step log (currently embedded in run detail)
- `GET /api/runs/{id}/steps/{wb_run_id}/detail/` — full I/O snapshot per step
- `GET /api/runs/{id}/agent-logs/` — merged agent execution logs
- `GET /api/runs/{id}/result/` — final outcome context dict
- Agent Prompts CRUD (`/api/agent-prompts/`, `/api/workbench-agents/{id}/set-prompt/`)
