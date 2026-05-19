import type {
  DashboardStatsQuery,
  LicenseStatusQuery,
  TransactionFieldsFragment,
} from '@/__generated__/graphql';

export const staticDashboardStats: DashboardStatsQuery['dashboardStats'] = {
  __typename: 'DashboardStatsType',
  totalAgents: 12,
  onlineAgents: 9,
  activeWorkflows: 4,
  totalTransactions: 1847,
};

export const staticLicense: NonNullable<LicenseStatusQuery['licenseStatus']> = {
  __typename: 'LicenseStatusType',
  clientId: 'demo-client',
  tier: 'enterprise',
  maxAgents: 50,
  features: ['workflows', 'agents', 'audit_logs'],
  issuedAt: '2025-01-15T00:00:00.000Z',
  expiresAt: '2027-04-01T00:00:00.000Z',
  licenseId: 'LIC-DEMO-001',
  daysLeft: 346,
  status: 'ACTIVE',
};

export const staticRecentTransactions: TransactionFieldsFragment[] = [
  {
    __typename: 'TransactionType',
    id: 'tx-demo-1',
    workflowId: 'wf-demo-1',
    status: 'COMPLETED',
    triggeredBy: 'scheduler',
    startedAt: '2026-04-20T08:12:00.000Z',
    finishedAt: '2026-04-20T08:14:22.000Z',
    createdAt: '2026-04-20T08:12:00.000Z',
    workflow: { __typename: 'WorkflowType', id: 'wf-demo-1', name: 'Member eligibility check' },
  },
  {
    __typename: 'TransactionType',
    id: 'tx-demo-2',
    workflowId: 'wf-demo-2',
    status: 'RUNNING',
    triggeredBy: 'api',
    startedAt: '2026-04-20T09:45:00.000Z',
    finishedAt: null,
    createdAt: '2026-04-20T09:45:00.000Z',
    workflow: { __typename: 'WorkflowType', id: 'wf-demo-2', name: 'Claims intake routing' },
  },
  {
    __typename: 'TransactionType',
    id: 'tx-demo-3',
    workflowId: 'wf-demo-3',
    status: 'COMPLETED',
    triggeredBy: 'manual',
    startedAt: '2026-04-19T16:02:00.000Z',
    finishedAt: '2026-04-19T16:08:11.000Z',
    createdAt: '2026-04-19T16:02:00.000Z',
    workflow: { __typename: 'WorkflowType', id: 'wf-demo-3', name: 'Prior auth document triage' },
  },
  {
    __typename: 'TransactionType',
    id: 'tx-demo-4',
    workflowId: 'wf-demo-1',
    status: 'FAILED',
    triggeredBy: 'scheduler',
    startedAt: '2026-04-19T11:20:00.000Z',
    finishedAt: '2026-04-19T11:21:03.000Z',
    createdAt: '2026-04-19T11:20:00.000Z',
    workflow: { __typename: 'WorkflowType', id: 'wf-demo-1', name: 'Member eligibility check' },
  },
  {
    __typename: 'TransactionType',
    id: 'tx-demo-5',
    workflowId: 'wf-demo-4',
    status: 'PENDING',
    triggeredBy: 'api',
    startedAt: null,
    finishedAt: null,
    createdAt: '2026-04-18T22:10:00.000Z',
    workflow: { __typename: 'WorkflowType', id: 'wf-demo-4', name: 'Benefits Q&A handoff' },
  },
];
