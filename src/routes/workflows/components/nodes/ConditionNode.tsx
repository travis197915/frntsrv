import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import BaseNode from './BaseNode';
import type { WorkflowNode } from '../../types';

function ConditionNode(props: NodeProps<WorkflowNode>) {
  const condLabel = props.data.conditionExpr
    ? `If: ${props.data.conditionExpr}`
    : undefined;

  return (
    <BaseNode
      {...props}
      icon={<GitBranch className="h-3.5 w-3.5" />}
      subtitle={condLabel}
      extraHandles={
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="yes"
            className="w-3! h-3! border-2! rounded-full! bg-muted! border-green-600! dark:border-green-500! hover:border-primary! transition-colors"
            style={{ left: '30%' }}
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="no"
            className="w-3! h-3! border-2! rounded-full! bg-muted! border-red-600! dark:border-red-500! hover:border-primary! transition-colors"
            style={{ left: '70%' }}
          />
          <span
            className="absolute text-[9px] font-medium pointer-events-none text-green-600 dark:text-green-400"
            style={{ bottom: -16, left: '30%', transform: 'translateX(-50%)' }}
          >
            Yes
          </span>
          <span
            className="absolute text-[9px] font-medium pointer-events-none text-red-600 dark:text-red-400"
            style={{ bottom: -16, left: '70%', transform: 'translateX(-50%)' }}
          >
            No
          </span>
        </>
      }
    />
  );
}

export default memo(ConditionNode);
