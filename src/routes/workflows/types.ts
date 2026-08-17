import type { Node, Edge } from '@xyflow/react';

/** Node types registered with xyflow. `string` fallback keeps old saved data renderable. */
export type WorkflowNodeType = 'shape' | 'workarea' | string;

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  description?: string;
  /** Discriminant — `'workarea'` for containers, `'shape'` for catalog nodes. */
  nodeType?: WorkflowNodeType;
  /** Catalog slug — present on every `shape` node. */
  definitionSlug?: string;
  /** Free-form property values matching the shape's `property_schema`. */
  properties?: Record<string, unknown>;
  config?: Record<string, unknown>;
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
  // Overall workflow configuration version — bumps whenever any of its SOPs'
  // canvas content changes. Distinct from a SOP's own "Canvas vN" (Workbench
  // version), shown per-row in WorkflowContextPanel.
  version?: number;
}

export const NODE_TYPE_CONFIG = {
  workarea: {
    label: 'Work Area',
    color: '#6366f1',
    bgColor: 'rgba(99, 102, 241, 0.08)',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    description: 'Group related steps into a named phase',
  },
} as const;
