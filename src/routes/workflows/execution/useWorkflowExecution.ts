import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/clients';
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

// ── Response envelope from POST /api/runs/ ────────────────────────────────

interface RuleEvaluationDto {
  id: string;
  hop_index: number;
  shape: string | null;
  rule_binding: string | null;
  rule_key: string;
  sop_id: number;
  step_number: number;
  row_index: number;
  condition: string;
  action: string;
  decision_type: string;
  source: 'attached' | 'shadow';
  gap_flag: string;
  matched: boolean;
  is_terminal: boolean;
  goto_step: number | null;
  notes: Record<string, unknown>;
  created_at: string;
}

interface RuleExecutionRunDto {
  id: string;
  workflow: string;
  claim_id: string;
  claim_payload: Record<string, unknown>;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'TERMINATED_EARLY' | 'FAILED' | 'CANCELLED';
  final_decision_type: string;
  final_halt_code: string;
  applied_codes: unknown[];
  error_message: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  evaluations: RuleEvaluationDto[];
}

// ── DTO → ExecutionState ──────────────────────────────────────────────────

function statusFromDto(s: RuleExecutionRunDto['status']): RunStatus {
  switch (s) {
    case 'PENDING':
    case 'RUNNING':           return 'running';
    case 'COMPLETED':         return 'completed';
    case 'TERMINATED_EARLY':  return 'completed';
    case 'FAILED':            return 'failed';
    case 'CANCELLED':         return 'cancelled';
    default:                  return 'idle';
  }
}

function tsMs(iso: string | null): number | null {
  return iso ? new Date(iso).getTime() : null;
}

function mapDtoToState(dto: RuleExecutionRunDto): ExecutionState {
  const nodeStates = new Map<string, NodeExecutionState>();
  const stepOrder: string[] = [];
  const seenShapes = new Set<string>();

  // Group hops by shape for the node overlay.
  const hopsByShape = new Map<string, RuleEvaluationDto[]>();
  for (const ev of dto.evaluations) {
    if (!ev.shape) continue;
    const list = hopsByShape.get(ev.shape) ?? [];
    list.push(ev);
    hopsByShape.set(ev.shape, list);
    if (!seenShapes.has(ev.shape)) {
      seenShapes.add(ev.shape);
      stepOrder.push(ev.shape);
    }
  }

  for (const [shapeId, hops] of hopsByShape.entries()) {
    const terminalHop = hops.find((h) => h.is_terminal && h.matched);
    const failed = (
      terminalHop?.decision_type === 'DENY' ||
      terminalHop?.decision_type === 'STOP' ||
      hops.some((h) => h.gap_flag === 'GOTO_TARGET_MISSING')
    );
    nodeStates.set(shapeId, {
      status: failed ? 'failed' : 'completed',
      output: {
        hopCount: hops.length,
        finalDecisionType: terminalHop?.decision_type ?? '',
        gapFlags: hops.map((h) => h.gap_flag).filter(Boolean),
      },
    });
  }

  const startedAt   = tsMs(dto.started_at);
  const completedAt = tsMs(dto.finished_at);
  return {
    runId: dto.id,
    status: statusFromDto(dto.status),
    nodeStates,
    edgeStates: new Map(),
    currentNodeId: null,
    stepOrder,
    startedAt,
    completedAt,
    elapsedMs:
      startedAt && completedAt ? completedAt - startedAt : 0,
    error: dto.error_message || null,
    workbenchRuns: [],
    isLive: true,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useWorkflowExecution() {
  const [state, setState] = useState<ExecutionState>(INITIAL_STATE);

  const liveInputResolver = useRef<((input: string | null) => void) | null>(null);
  const preflightInputResolver = useRef<((input: PreflightInput | null) => void) | null>(null);
  const sopInputResolver = useRef<((input: SopInput | null) => void) | null>(null);

  const startLiveExecution = useCallback(async (workflowId: string) => {
    setState({
      ...INITIAL_STATE,
      status: 'running',
      isLive: true,
      startedAt: Date.now(),
    });
    try {
      const dto = await apiClient.post<RuleExecutionRunDto>('/runs/', {
        workflow_id: workflowId,
      });
      setState(mapDtoToState(dto));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Run failed';
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: message,
        completedAt: Date.now(),
      }));
    }
  }, []);

  const cancel = useCallback(() => {
    liveInputResolver.current?.(null);
    liveInputResolver.current = null;
    preflightInputResolver.current?.(null);
    preflightInputResolver.current = null;
    sopInputResolver.current?.(null);
    sopInputResolver.current = null;
    setState((prev) => {
      if (prev.runId) {
        apiClient
          .post(`/runs/${prev.runId}/cancel/`, {})
          .catch(() => {/* run may already be finalised; ignore */});
      }
      return {
        ...prev,
        status: 'cancelled',
        currentNodeId: null,
        completedAt: Date.now(),
      };
    });
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
