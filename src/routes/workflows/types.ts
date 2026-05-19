import type { Node, Edge } from '@xyflow/react';

export type WorkflowNodeType =
  | 'trigger'
  | 'action'
  | 'agent_combo'
  | 'claim_preflight'
  | 'condition'
  | 'output'
  | 'workarea';

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  nodeType: WorkflowNodeType;
  agentType?: string;
  combo_id?: string;
  callable?: string;
  conditionExpr?: string;
  triggerType?: 'manual' | 'schedule' | 'webhook';
  config?: Record<string, unknown>;
  interactionType?: 'file_upload' | 'approval' | 'text_input' | 'form' | 'preflight';
}

export interface WorkflowEdgeData extends Record<string, unknown> {
  conditionLabel?: string;
}

export type WorkflowNode = Node<WorkflowNodeData, WorkflowNodeType>;
export type WorkflowEdge = Edge<WorkflowEdgeData>;

export interface WorkflowCanvasJSON {
  version: 1;
  nodes: Array<{
    id: string;
    type: WorkflowNodeType;
    position: { x: number; y: number };
    data: WorkflowNodeData;
    parentId?: string;
    extent?: 'parent';
    style?: { width?: number; height?: number };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    data?: WorkflowEdgeData;
  }>;
  viewport?: { x: number; y: number; zoom: number };
}

export interface WorkflowMeta {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export const NODE_TYPE_CONFIG: Record<
  WorkflowNodeType,
  { label: string; color: string; bgColor: string; borderColor: string; description: string }
> = {
  trigger: {
    label: 'Trigger',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    description: 'Entry point that starts the workflow',
  },
  action: {
    label: 'Action',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.08)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    description: 'Run a Python callable (python_script)',
  },
  agent_combo: {
    label: 'Agent Combo',
    color: '#0ea5e9',
    bgColor: 'rgba(14, 165, 233, 0.08)',
    borderColor: 'rgba(14, 165, 233, 0.3)',
    description: 'Run one or more agents sequentially',
  },
  claim_preflight: {
    label: 'Pre-flight Check',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.08)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
    description: 'Upload documents and validate claim data',
  },
  condition: {
    label: 'Condition',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.08)',
    borderColor: 'rgba(168, 85, 247, 0.3)',
    description: 'Branch based on a condition',
  },
  output: {
    label: 'Output',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    description: 'Terminal node that ends the flow',
  },
  workarea: {
    label: 'Work Area',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    description: 'Group related steps into a named phase',
  },
};
