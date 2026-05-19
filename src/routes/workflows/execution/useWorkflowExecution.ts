import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import type { NodeExecutionState, EdgeExecutionStatus } from './types';
import {
  START_RUN_MUTATION,
  START_STEP_MUTATION,
  ADVANCE_RUN_MUTATION,
  UPLOAD_RUN_FILE_MUTATION,
  SUBMIT_PREFLIGHT_MUTATION,
} from '@/graphql/workflow.graphql';

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

  // Live mode refs
  const liveInputResolver = useRef<((input: string | null) => void) | null>(null);
  const preflightInputResolver = useRef<((input: PreflightInput | null) => void) | null>(null);
  const sopInputResolver = useRef<((input: SopInput | null) => void) | null>(null);
  const liveCancelledRef = useRef(false);
  const isLiveRef = useRef(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Apollo mutations
  const [startRunMutation] = useMutation(START_RUN_MUTATION);
  const [startStepMutation] = useMutation(START_STEP_MUTATION);
  const [advanceRunMutation] = useMutation(ADVANCE_RUN_MUTATION);
  const [uploadRunFileMutation] = useMutation(UPLOAD_RUN_FILE_MUTATION);
  const [submitPreflightMutation] = useMutation(SUBMIT_PREFLIGHT_MUTATION);

  // ── Timer ───────────────────────────────────────────────────────────────────

  const startTimer = useCallback((startTime: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((prev) => ({ ...prev, elapsedMs: Date.now() - startTime }));
    }, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Live backend-driven execution ───────────────────────────────────────────

  const startLiveExecution = useCallback(
    async (workflowId: string) => {
      isLiveRef.current = true;
      liveCancelledRef.current = false;
      liveInputResolver.current = null;
      preflightInputResolver.current = null;

      const startTime = Date.now();
      setState({
        ...INITIAL_STATE,
        status: 'running',
        isLive: true,
        startedAt: startTime,
      });
      startTimer(startTime);

      try {
        // 1. Start the workflow run
        const runResult = await startRunMutation({ variables: { workflowId } });
        const runErrors = (runResult as any).errors;
        if (runErrors?.length) throw new Error(runErrors[0].message);

        const run = (runResult.data as any)?.startRun;
        if (!run) throw new Error('Failed to start workflow run — no data returned');

        const runId = String(run.id);
        setState((prev) => ({ ...prev, runId }));

        let currentWorkbench = run.currentWorkbench;

        // 2. Loop through workbenches
        while (currentWorkbench && !liveCancelledRef.current) {
          const wbNodeId = String(currentWorkbench.id);
          const wbName = String(currentWorkbench.name ?? '');
          const wbExecType = String(currentWorkbench.executorType ?? '');

          // Mark workbench as running in both nodeStates (canvas) and workbenchRuns (panel)
          setState((prev) => {
            const nextNodeStates = new Map(prev.nodeStates);
            nextNodeStates.set(wbNodeId, { status: 'running', startedAt: Date.now() });
            const wbRunEntry: WorkbenchRunState = {
              id: '',
              workbenchId: wbNodeId,
              name: wbName,
              executorType: wbExecType,
              status: 'running',
              awaitingInput: false,
              inputPrompt: null,
              inputs: {},
              outputs: {},
              startedAt: new Date().toISOString(),
              completedAt: null,
            };
            return {
              ...prev,
              nodeStates: nextNodeStates,
              currentNodeId: wbNodeId,
              stepOrder: [...prev.stepOrder, wbNodeId],
              workbenchRuns: [...prev.workbenchRuns, wbRunEntry],
            };
          });

          // 3a. SOP ingest — pause to collect HTML file(s) before calling start
          const isSopIngest = wbName.toLowerCase().includes('sop');
          if (isSopIngest) {
            setState((prev) => {
              const nextNodeStates = new Map(prev.nodeStates);
              nextNodeStates.set(wbNodeId, {
                status: 'waiting_input',
                interactionType: 'sop_upload',
                interactionPrompt: 'Upload the SOP HTML file(s) to ingest before running this step.',
              });
              return {
                ...prev,
                nodeStates: nextNodeStates,
                status: 'paused',
                workbenchRuns: prev.workbenchRuns.map((r) =>
                  r.workbenchId === wbNodeId
                    ? { ...r, status: 'waiting_input' as const, awaitingInput: true, inputPrompt: 'Upload SOP HTML file(s)' }
                    : r,
                ),
              };
            });

            const sopData = await new Promise<SopInput | null>((resolve) => {
              sopInputResolver.current = resolve;
            });

            if (liveCancelledRef.current) break;
            if (!sopData) break;

            setState((prev) => ({ ...prev, status: 'running' }));

            // Upload each HTML file and collect URLs
            const sopUrls: string[] = [];
            for (let i = 0; i < sopData.htmlFiles.length; i++) {
              const fieldName = `sop_url_${i + 1}`;
              const uploadResult = await uploadRunFileMutation({
                variables: { runId, fieldName, file: sopData.htmlFiles[i] },
              });
              const uploadErrors = (uploadResult as any).errors;
              if (uploadErrors?.length) throw new Error(uploadErrors[0].message);
              const url = (uploadResult.data as any)?.uploadRunFile?.url;
              if (url) sopUrls.push(url);
            }

            // Start the SOP step with the collected URLs
            const sopStepResult = await startStepMutation({
              variables: {
                runId,
                workbenchId: wbNodeId,
                input: JSON.stringify({ sop_html_sources: sopUrls }),
              },
            });
            const sopStepErrors = (sopStepResult as any).errors;
            if (sopStepErrors?.length) throw new Error(sopStepErrors[0].message);
            const sopStepData = (sopStepResult.data as any)?.startStep;

            const sopOutputs = (() => {
              const val = sopStepData?.outputs;
              if (!val) return {};
              if (typeof val === 'string') { try { return JSON.parse(val); } catch { return {}; } }
              return val as Record<string, unknown>;
            })();

            setState((prev) => {
              const nextNodeStates = new Map(prev.nodeStates);
              nextNodeStates.set(wbNodeId, {
                status: sopStepData?.status === 'failed' ? 'failed' : 'completed',
                completedAt: Date.now(),
                output: sopOutputs,
              });
              return {
                ...prev,
                nodeStates: nextNodeStates,
                workbenchRuns: prev.workbenchRuns.map((r) =>
                  r.workbenchId === wbNodeId
                    ? { ...r, status: (sopStepData?.status === 'failed' ? 'failed' : 'completed') as WorkbenchRunState['status'], outputs: sopOutputs, completedAt: new Date().toISOString() }
                    : r,
                ),
              };
            });

            if (sopStepData?.status === 'failed') {
              setState((prev) => ({ ...prev, status: 'failed', currentNodeId: null, completedAt: Date.now(), error: 'SOP ingest step failed' }));
              return;
            }

            // Advance and continue loop
            let sopAdvData: any = null;
            try {
              const sopAdv = await advanceRunMutation({ variables: { runId } });
              const sopAdvErrors = (sopAdv as any).errors;
              if (sopAdvErrors?.length) throw new Error(sopAdvErrors[0].message);
              sopAdvData = (sopAdv.data as any)?.advanceRun;
            } catch (advErr) {
              const errMsg = advErr instanceof Error ? advErr.message : 'Failed to advance run';
              setState((prev) => ({ ...prev, status: 'failed', currentNodeId: null, completedAt: Date.now(), error: errMsg }));
              return;
            }

            if (sopAdvData?.done || !sopAdvData?.nextWorkbench) {
              setState((prev) => ({ ...prev, status: 'completed', currentNodeId: null, completedAt: Date.now() }));
              return;
            }
            currentWorkbench = sopAdvData.nextWorkbench;
            continue;
          }

          // 3. Start step — may return awaitingInput
          let stepData: any = null;
          try {
            const stepResult = await startStepMutation({
              variables: { runId, workbenchId: wbNodeId },
            });
            const stepErrors = (stepResult as any).errors;
            if (stepErrors?.length) throw new Error(stepErrors[0].message);
            stepData = (stepResult.data as any)?.startStep;
          } catch (stepErr) {
            const errMsg = stepErr instanceof Error ? stepErr.message : 'Step failed to start';
            setState((prev) => {
              const nextNodeStates = new Map(prev.nodeStates);
              nextNodeStates.set(wbNodeId, { status: 'failed', error: errMsg, completedAt: Date.now() });
              return {
                ...prev,
                nodeStates: nextNodeStates,
                status: 'failed',
                currentNodeId: null,
                completedAt: Date.now(),
                error: errMsg,
                workbenchRuns: prev.workbenchRuns.map((r) =>
                  r.workbenchId === wbNodeId
                    ? { ...r, status: 'failed' as const, error: errMsg, completedAt: new Date().toISOString() }
                    : r,
                ),
              };
            });
            return;
          }

          if (liveCancelledRef.current) break;

          // 4. Handle awaiting input
          if (stepData?.awaitingInput) {
            const prompt: string = stepData.inputPrompt ?? 'Input required to continue';
            const isPreflight = wbExecType.toUpperCase().includes('PREFLIGHT');

            setState((prev) => {
              const nextNodeStates = new Map(prev.nodeStates);
              nextNodeStates.set(wbNodeId, {
                status: 'waiting_input',
                interactionType: isPreflight ? 'preflight' : 'text_input',
                interactionPrompt: prompt,
              });
              return {
                ...prev,
                nodeStates: nextNodeStates,
                status: 'paused',
                workbenchRuns: prev.workbenchRuns.map((r) =>
                  r.workbenchId === wbNodeId
                    ? { ...r, status: 'waiting_input' as const, awaitingInput: true, inputPrompt: prompt }
                    : r,
                ),
              };
            });

            if (isPreflight) {
              // ── Preflight: atomic multipart call (excel + pdf + optional claimId) ──
              const preflightData = await new Promise<PreflightInput | null>((resolve) => {
                preflightInputResolver.current = resolve;
              });

              if (liveCancelledRef.current) break;
              if (!preflightData) break;

              setState((prev) => ({ ...prev, status: 'running' }));

              try {
                const preflightResult = await submitPreflightMutation({
                  variables: {
                    runId,
                    excel:   preflightData.excelFile,
                    pdf:     preflightData.pdfFile,
                    claimId: preflightData.claimId || undefined,
                  },
                });
                const preflightErrors = (preflightResult as any).errors;
                if (preflightErrors?.length) throw new Error(preflightErrors[0].message);
                stepData = (preflightResult.data as any)?.submitPreflight;

                // OCR found multiple matching IDs — ask user to pick one
                if (stepData?.awaitingInput) {
                  const rawInputs = stepData.inputs;
                  const parsedInputs: Record<string, unknown> =
                    typeof rawInputs === 'string' ? JSON.parse(rawInputs) : (rawInputs ?? {});
                  const claimIds: string[] = (parsedInputs.claim_ids_in_sheet as string[]) ?? [];
                  const resolvePrompt: string = stepData.inputPrompt ?? 'OCR found multiple matching Claim IDs. Please select one.';

                  setState((prev) => {
                    const nextNodeStates = new Map(prev.nodeStates);
                    nextNodeStates.set(wbNodeId, {
                      status: 'waiting_input',
                      interactionType: 'preflight',
                      interactionPrompt: resolvePrompt,
                      claimIdsForResolution: claimIds,
                    });
                    return {
                      ...prev,
                      nodeStates: nextNodeStates,
                      status: 'paused',
                      workbenchRuns: prev.workbenchRuns.map((r) =>
                        r.workbenchId === wbNodeId
                          ? { ...r, status: 'waiting_input' as const, awaitingInput: true, inputPrompt: resolvePrompt, claimIdsForResolution: claimIds }
                          : r,
                      ),
                    };
                  });

                  const resolutionData = await new Promise<PreflightInput | null>((resolve) => {
                    preflightInputResolver.current = resolve;
                  });

                  if (liveCancelledRef.current) break;
                  if (!resolutionData) break;

                  setState((prev) => ({ ...prev, status: 'running' }));

                  const resolveResult = await submitPreflightMutation({
                    variables: { runId, claimId: resolutionData.claimId },
                  });
                  const resolveErrors = (resolveResult as any).errors;
                  if (resolveErrors?.length) throw new Error(resolveErrors[0].message);
                  stepData = (resolveResult.data as any)?.submitPreflight;
                }
              } catch (pfErr) {
                const errMsg = pfErr instanceof Error ? pfErr.message : 'Pre-flight validation failed';
                setState((prev) => {
                  const nextNodeStates = new Map(prev.nodeStates);
                  nextNodeStates.set(wbNodeId, { status: 'failed', error: errMsg, completedAt: Date.now() });
                  return {
                    ...prev,
                    nodeStates: nextNodeStates,
                    status: 'failed',
                    currentNodeId: null,
                    completedAt: Date.now(),
                    error: errMsg,
                    workbenchRuns: prev.workbenchRuns.map((r) =>
                      r.workbenchId === wbNodeId
                        ? { ...r, status: 'failed' as const, error: errMsg, completedAt: new Date().toISOString() }
                        : r,
                    ),
                  };
                });
                return;
              }
            } else {
              // ── Generic text-input flow ──
              const userInput = await new Promise<string | null>((resolve) => {
                liveInputResolver.current = resolve;
              });

              if (liveCancelledRef.current) break;

              setState((prev) => ({ ...prev, status: 'running' }));

              try {
                const stepResult2 = await startStepMutation({
                  variables: { runId, workbenchId: wbNodeId, input: userInput ?? undefined },
                });
                const stepErrors2 = (stepResult2 as any).errors;
                if (stepErrors2?.length) throw new Error(stepErrors2[0].message);
                stepData = (stepResult2.data as any)?.startStep;
              } catch (stepErr2) {
                const errMsg = stepErr2 instanceof Error ? stepErr2.message : 'Step failed after input';
                setState((prev) => {
                  const nextNodeStates = new Map(prev.nodeStates);
                  nextNodeStates.set(wbNodeId, { status: 'failed', error: errMsg, completedAt: Date.now() });
                  return {
                    ...prev,
                    nodeStates: nextNodeStates,
                    status: 'failed',
                    currentNodeId: null,
                    completedAt: Date.now(),
                    error: errMsg,
                    workbenchRuns: prev.workbenchRuns.map((r) =>
                      r.workbenchId === wbNodeId
                        ? { ...r, status: 'failed' as const, error: errMsg, completedAt: new Date().toISOString() }
                        : r,
                    ),
                  };
                });
                return;
              }
            }
          }

          if (liveCancelledRef.current) break;

          // 5. Apply completed step result
          if (stepData) {
            const parseJson = (val: unknown) => {
              if (!val) return {};
              if (typeof val === 'string') {
                try { return JSON.parse(val); } catch { return {}; }
              }
              return val as Record<string, unknown>;
            };

            const outputs = parseJson(stepData.outputs);
            const inputs = parseJson(stepData.inputs);
            const isFailed = stepData.status === 'failed';

            setState((prev) => {
              const nextNodeStates = new Map(prev.nodeStates);
              nextNodeStates.set(wbNodeId, {
                status: isFailed ? 'failed' : 'completed',
                completedAt: Date.now(),
                output: outputs,
              });
              return {
                ...prev,
                nodeStates: nextNodeStates,
                workbenchRuns: prev.workbenchRuns.map((r) =>
                  r.workbenchId === wbNodeId
                    ? {
                        ...r,
                        status: (isFailed ? 'failed' : 'completed') as WorkbenchRunState['status'],
                        inputs,
                        outputs,
                        completedAt: new Date().toISOString(),
                      }
                    : r,
                ),
              };
            });

            if (isFailed) {
              setState((prev) => ({
                ...prev,
                status: 'failed',
                currentNodeId: null,
                completedAt: Date.now(),
                error: 'A workbench step failed during execution',
              }));
              return;
            }
          }

          if (liveCancelledRef.current) break;

          // 6. Advance to next workbench
          let advanceData: any = null;
          try {
            const advResult = await advanceRunMutation({ variables: { runId } });
            const advErrors = (advResult as any).errors;
            if (advErrors?.length) throw new Error(advErrors[0].message);
            advanceData = (advResult.data as any)?.advanceRun;
          } catch (advErr) {
            const errMsg = advErr instanceof Error ? advErr.message : 'Failed to advance run';
            setState((prev) => ({
              ...prev,
              status: 'failed',
              currentNodeId: null,
              completedAt: Date.now(),
              error: errMsg,
            }));
            return;
          }

          if (advanceData?.done || !advanceData?.nextWorkbench) {
            setState((prev) => ({
              ...prev,
              status: 'completed',
              currentNodeId: null,
              completedAt: Date.now(),
            }));
            return;
          }

          currentWorkbench = advanceData.nextWorkbench;
        }

        if (liveCancelledRef.current) {
          setState((prev) => ({
            ...prev,
            status: 'cancelled',
            currentNodeId: null,
            completedAt: Date.now(),
          }));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown execution error';
        setState((prev) => ({
          ...prev,
          status: 'failed',
          currentNodeId: null,
          completedAt: Date.now(),
          error: msg,
        }));
      } finally {
        stopTimer();
      }
    },
    [startRunMutation, startStepMutation, advanceRunMutation, uploadRunFileMutation, submitPreflightMutation, startTimer, stopTimer],
  );

  // ── Controls ────────────────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    liveCancelledRef.current = true;
    liveInputResolver.current?.(null);
    liveInputResolver.current = null;
    preflightInputResolver.current?.(null);
    preflightInputResolver.current = null;
    sopInputResolver.current?.(null);
    sopInputResolver.current = null;
    stopTimer();
    setState((prev) => ({
      ...prev,
      status: 'cancelled',
      currentNodeId: null,
      completedAt: Date.now(),
    }));
  }, [stopTimer]);

  const reset = useCallback(() => {
    liveCancelledRef.current = true;
    liveInputResolver.current?.(null);
    liveInputResolver.current = null;
    preflightInputResolver.current?.(null);
    preflightInputResolver.current = null;
    sopInputResolver.current?.(null);
    sopInputResolver.current = null;
    isLiveRef.current = false;
    stopTimer();
    setState(INITIAL_STATE);
  }, [stopTimer]);

  const submitInteraction = useCallback((nodeId: string, data: Record<string, unknown>) => {
    void nodeId;
    liveInputResolver.current?.(JSON.stringify(data));
    liveInputResolver.current = null;
  }, []);

  const submitPreflightInput = useCallback((data: PreflightInput) => {
    preflightInputResolver.current?.(data);
    preflightInputResolver.current = null;
  }, []);

  const submitSopInput = useCallback((data: SopInput) => {
    sopInputResolver.current?.(data);
    sopInputResolver.current = null;
  }, []);

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
