export type NodeExecutionStatus =
  | 'idle'
  | 'running'
  | 'waiting_input'
  | 'completed'
  | 'failed'
  | 'skipped';

export type EdgeExecutionStatus = 'idle' | 'traversing' | 'completed' | 'skipped';

export type InteractionType = 'file_upload' | 'approval' | 'text_input' | 'form' | 'preflight' | 'sop_upload';

export interface NodeExecutionState {
  status: NodeExecutionStatus;
  startedAt?: number;
  completedAt?: number;
  output?: Record<string, unknown>;
  error?: string;
  agentLog?: string;
  interactionType?: InteractionType;
  interactionPrompt?: string;
  claimIdsForResolution?: string[];
}

