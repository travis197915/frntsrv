export interface UsageRecord {
  id: string;
  runId: string;
  workflowId: string;
  workflowName: string;
  nodeLabel: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  triggeredBy: string;
  calledAt: string;
}

export interface UsageSummary {
  totalCost: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  periodLabel: string;
}

// ── Usage records (linked to activity demoData runs) ─────────────────────────

const records: UsageRecord[] = [
  // run-001: Doctor's Claim Validation (completed)
  {
    id: 'llm-001',
    runId: 'run-001',
    workflowId: 'wf-demo-1',
    workflowName: "Doctor's Claim Validation",
    nodeLabel: 'Verify Member Eligibility',
    model: 'gpt-4o-mini',
    inputTokens: 412,
    outputTokens: 138,
    totalTokens: 550,
    costUsd: 0.000083,
    triggeredBy: 'Sarah Mitchell',
    calledAt: '2026-04-22T08:14:18.000Z',
  },
  {
    id: 'llm-002',
    runId: 'run-001',
    workflowId: 'wf-demo-1',
    workflowName: "Doctor's Claim Validation",
    nodeLabel: 'Validate ICD-10 Codes',
    model: 'gpt-4o-mini',
    inputTokens: 588,
    outputTokens: 201,
    totalTokens: 789,
    costUsd: 0.000119,
    triggeredBy: 'Sarah Mitchell',
    calledAt: '2026-04-22T08:14:52.000Z',
  },
  {
    id: 'llm-003',
    runId: 'run-001',
    workflowId: 'wf-demo-1',
    workflowName: "Doctor's Claim Validation",
    nodeLabel: 'Verify CPT Procedures',
    model: 'gpt-4o',
    inputTokens: 1024,
    outputTokens: 384,
    totalTokens: 1408,
    costUsd: 0.007040,
    triggeredBy: 'Sarah Mitchell',
    calledAt: '2026-04-22T08:15:10.000Z',
  },

  // run-002: Prior Authorization Request (running)
  {
    id: 'llm-004',
    runId: 'run-002',
    workflowId: 'wf-demo-2',
    workflowName: 'Prior Authorization Request',
    nodeLabel: 'Extract Clinical Details',
    model: 'gpt-4o',
    inputTokens: 3841,
    outputTokens: 892,
    totalTokens: 4733,
    costUsd: 0.023665,
    triggeredBy: 'James Okafor',
    calledAt: '2026-04-22T09:02:28.000Z',
  },
  {
    id: 'llm-005',
    runId: 'run-002',
    workflowId: 'wf-demo-2',
    workflowName: 'Prior Authorization Request',
    nodeLabel: 'Apply MCG Criteria',
    model: 'claude-3.5-sonnet',
    inputTokens: 2104,
    outputTokens: 561,
    totalTokens: 2665,
    costUsd: 0.019987,
    triggeredBy: 'James Okafor',
    calledAt: '2026-04-22T09:03:14.000Z',
  },

  // run-003: Doctor's Claim Validation (failed)
  {
    id: 'llm-006',
    runId: 'run-003',
    workflowId: 'wf-demo-1',
    workflowName: "Doctor's Claim Validation",
    nodeLabel: 'Verify Member Eligibility',
    model: 'gpt-4o-mini',
    inputTokens: 388,
    outputTokens: 120,
    totalTokens: 508,
    costUsd: 0.000076,
    triggeredBy: 'Sarah Mitchell',
    calledAt: '2026-04-21T14:30:12.000Z',
  },

  // run-004: Claims Denial & Appeals (completed)
  {
    id: 'llm-007',
    runId: 'run-004',
    workflowId: 'wf-demo-3',
    workflowName: 'Claims Denial & Appeals',
    nodeLabel: 'Retrieve Supporting Docs',
    model: 'gpt-4o',
    inputTokens: 5210,
    outputTokens: 1340,
    totalTokens: 6550,
    costUsd: 0.032750,
    triggeredBy: 'Priya Nandakumar',
    calledAt: '2026-04-21T10:05:38.000Z',
  },
  {
    id: 'llm-008',
    runId: 'run-004',
    workflowId: 'wf-demo-3',
    workflowName: 'Claims Denial & Appeals',
    nodeLabel: 'Denial Overturned?',
    model: 'claude-3.5-sonnet',
    inputTokens: 3120,
    outputTokens: 744,
    totalTokens: 3864,
    costUsd: 0.028980,
    triggeredBy: 'Priya Nandakumar',
    calledAt: '2026-04-21T10:06:20.000Z',
  },
  {
    id: 'llm-009',
    runId: 'run-004',
    workflowId: 'wf-demo-3',
    workflowName: 'Claims Denial & Appeals',
    nodeLabel: 'Reprocess Claim',
    model: 'gpt-4o-mini',
    inputTokens: 720,
    outputTokens: 290,
    totalTokens: 1010,
    costUsd: 0.000152,
    triggeredBy: 'Priya Nandakumar',
    calledAt: '2026-04-21T10:07:44.000Z',
  },

  // run-005: Provider Network Credentialing (failed)
  {
    id: 'llm-010',
    runId: 'run-005',
    workflowId: 'wf-demo-4',
    workflowName: 'Provider Network Credentialing',
    nodeLabel: 'Verify Medical License',
    model: 'gpt-4o',
    inputTokens: 1890,
    outputTokens: 510,
    totalTokens: 2400,
    costUsd: 0.012000,
    triggeredBy: 'David Chen',
    calledAt: '2026-04-20T16:22:52.000Z',
  },
  {
    id: 'llm-011',
    runId: 'run-005',
    workflowId: 'wf-demo-4',
    workflowName: 'Provider Network Credentialing',
    nodeLabel: 'Check OIG Exclusion List',
    model: 'gpt-4o',
    inputTokens: 2240,
    outputTokens: 384,
    totalTokens: 2624,
    costUsd: 0.013120,
    triggeredBy: 'David Chen',
    calledAt: '2026-04-20T16:24:10.000Z',
  },

  // run-006: Prior Authorization Request (completed)
  {
    id: 'llm-012',
    runId: 'run-006',
    workflowId: 'wf-demo-2',
    workflowName: 'Prior Authorization Request',
    nodeLabel: 'Extract Clinical Details',
    model: 'gpt-4o',
    inputTokens: 4612,
    outputTokens: 1088,
    totalTokens: 5700,
    costUsd: 0.028500,
    triggeredBy: 'James Okafor',
    calledAt: '2026-04-19T11:44:22.000Z',
  },
  {
    id: 'llm-013',
    runId: 'run-006',
    workflowId: 'wf-demo-2',
    workflowName: 'Prior Authorization Request',
    nodeLabel: 'Apply MCG Criteria',
    model: 'claude-3.5-sonnet',
    inputTokens: 1980,
    outputTokens: 480,
    totalTokens: 2460,
    costUsd: 0.018450,
    triggeredBy: 'James Okafor',
    calledAt: '2026-04-19T11:45:14.000Z',
  },
  {
    id: 'llm-014',
    runId: 'run-006',
    workflowId: 'wf-demo-2',
    workflowName: 'Prior Authorization Request',
    nodeLabel: 'Generate Auth Number',
    model: 'gpt-4o-mini',
    inputTokens: 310,
    outputTokens: 88,
    totalTokens: 398,
    costUsd: 0.000060,
    triggeredBy: 'James Okafor',
    calledAt: '2026-04-19T11:45:58.000Z',
  },

  // run-007: Doctor's Claim Validation (cancelled)
  {
    id: 'llm-015',
    runId: 'run-007',
    workflowId: 'wf-demo-1',
    workflowName: "Doctor's Claim Validation",
    nodeLabel: 'Verify Member Eligibility',
    model: 'gpt-4o-mini',
    inputTokens: 401,
    outputTokens: 132,
    totalTokens: 533,
    costUsd: 0.000080,
    triggeredBy: 'Sarah Mitchell',
    calledAt: '2026-04-18T15:00:08.000Z',
  },

  // run-008: Provider Network Credentialing (completed)
  {
    id: 'llm-016',
    runId: 'run-008',
    workflowId: 'wf-demo-4',
    workflowName: 'Provider Network Credentialing',
    nodeLabel: 'Verify Medical License',
    model: 'gpt-4o',
    inputTokens: 2010,
    outputTokens: 540,
    totalTokens: 2550,
    costUsd: 0.012750,
    triggeredBy: 'David Chen',
    calledAt: '2026-04-17T09:30:42.000Z',
  },
  {
    id: 'llm-017',
    runId: 'run-008',
    workflowId: 'wf-demo-4',
    workflowName: 'Provider Network Credentialing',
    nodeLabel: 'Check OIG Exclusion List',
    model: 'gpt-4o',
    inputTokens: 2180,
    outputTokens: 360,
    totalTokens: 2540,
    costUsd: 0.012700,
    triggeredBy: 'David Chen',
    calledAt: '2026-04-17T09:32:08.000Z',
  },
  {
    id: 'llm-018',
    runId: 'run-008',
    workflowId: 'wf-demo-4',
    workflowName: 'Provider Network Credentialing',
    nodeLabel: 'Committee Review',
    model: 'claude-3.5-sonnet',
    inputTokens: 8840,
    outputTokens: 2210,
    totalTokens: 11050,
    costUsd: 0.082875,
    triggeredBy: 'David Chen',
    calledAt: '2026-04-17T09:38:10.000Z',
  },
];

export const usageRecords = records;

// ── Period filtering ──────────────────────────────────────────────────────────

export type PeriodDays = 7 | 14 | 30;

export function filterByPeriod(recs: UsageRecord[], days: PeriodDays): UsageRecord[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return recs.filter((r) => new Date(r.calledAt).getTime() >= cutoff);
}

export function getUsageSummary(days: PeriodDays = 14): UsageSummary {
  const filtered = filterByPeriod(records, days);
  return {
    totalCalls: filtered.length,
    totalInputTokens: filtered.reduce((s, r) => s + r.inputTokens, 0),
    totalOutputTokens: filtered.reduce((s, r) => s + r.outputTokens, 0),
    totalCost: filtered.reduce((s, r) => s + r.costUsd, 0),
    periodLabel: `Last ${days} days`,
  };
}
