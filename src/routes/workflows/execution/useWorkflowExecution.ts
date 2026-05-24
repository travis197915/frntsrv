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
