import { useMemo } from 'react';
import { EdgeLabelRenderer } from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge } from '../types';
import type { ExecutionState } from './useWorkflowExecution';
import type { NodeExecutionStatus, InteractionType } from './types';
import NodeInteractionPrompt from './NodeInteractionPrompt';

interface Props {
  execution: ExecutionState;
  nodes: WorkflowNode[];
  onSubmitInteraction: (nodeId: string, data: Record<string, unknown>) => void;
}

const statusClassMap: Record<NodeExecutionStatus, string> = {
  idle: '',
  running: 'exec-node-running',
  waiting_input: 'exec-node-waiting',
  completed: 'exec-node-completed',
  failed: 'exec-node-failed',
  skipped: 'exec-node-skipped',
};

export function getNodeClassName(
  nodeStates: Map<string, NodeExecutionStatus | undefined>,
): (node: WorkflowNode) => string {
  return (node: WorkflowNode) => {
    const status = nodeStates.get(node.id);
    return status ? statusClassMap[status] : '';
  };
}

export function applyExecutionToNodes(
  nodes: WorkflowNode[],
  execution: ExecutionState,
): WorkflowNode[] {
  if (execution.status === 'idle') return nodes;

  return nodes.map((node) => {
    const nodeState = execution.nodeStates.get(node.id);
    if (!nodeState) return node;

    return {
      ...node,
      data: {
        ...node.data,
        executionStatus: nodeState.status,
      },
      className: statusClassMap[nodeState.status] || undefined,
    };
  });
}

export function applyExecutionToEdges(
  edges: WorkflowEdge[],
  execution: ExecutionState,
): WorkflowEdge[] {
  if (execution.status === 'idle') return edges;

  return edges.map((edge) => {
    const edgeStatus = execution.edgeStates.get(edge.id);
    if (!edgeStatus || edgeStatus === 'idle') return edge;

    let stroke: string | undefined;
    let strokeWidth: number | undefined;
    let opacity: number | undefined;
    let strokeDasharray: string | undefined;

    if (edgeStatus === 'traversing') {
      stroke = '#3b82f6';
      strokeWidth = 2.5;
    } else if (edgeStatus === 'completed') {
      stroke = '#22c55e';
    } else if (edgeStatus === 'skipped') {
      opacity = 0.3;
      strokeDasharray = '4 4';
    }

    return {
      ...edge,
      data: {
        ...edge.data,
        executionStatus: edgeStatus,
      },
      style: {
        ...(edge.style ?? {}),
        ...(stroke          !== undefined ? { stroke }          : {}),
        ...(strokeWidth     !== undefined ? { strokeWidth }     : {}),
        ...(opacity         !== undefined ? { opacity }         : {}),
        ...(strokeDasharray !== undefined ? { strokeDasharray } : {}),
      },
    };
  });
}

export default function ExecutionOverlay({ execution, nodes, onSubmitInteraction }: Props) {
  // In live mode, input is handled via the ExecutionPanel sidebar — no canvas prompt overlay needed.
  const waitingNodes = useMemo(() => {
    if (execution.isLive) return [];

    const results: Array<{
      nodeId: string;
      interactionType: InteractionType;
      prompt: string;
      position: { x: number; y: number };
    }> = [];

    for (const [nodeId, state] of execution.nodeStates) {
      if (state.status !== 'waiting_input' || !state.interactionType) continue;

      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      let absX = node.position.x;
      let absY = node.position.y;

      if (node.parentId) {
        const parent = nodes.find((n) => n.id === node.parentId);
        if (parent) {
          absX += parent.position.x;
          absY += parent.position.y;
        }
      }

      const nodeWidth = (node.measured?.width ?? node.width) ?? 220;
      results.push({
        nodeId,
        interactionType: state.interactionType,
        prompt: state.interactionPrompt ?? 'Input required',
        position: { x: absX + nodeWidth / 2, y: absY },
      });
    }

    return results;
  }, [execution.nodeStates, execution.isLive, nodes]);

  if (waitingNodes.length === 0) return null;

  return (
    <EdgeLabelRenderer>
      {waitingNodes.map((item) => (
        <NodeInteractionPrompt
          key={item.nodeId}
          nodeId={item.nodeId}
          interactionType={item.interactionType}
          prompt={item.prompt}
          position={item.position}
          onSubmit={onSubmitInteraction}
        />
      ))}
    </EdgeLabelRenderer>
  );
}
