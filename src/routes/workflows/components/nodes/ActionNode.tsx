import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Cog } from 'lucide-react';
import BaseNode from './BaseNode';
import type { WorkflowNode } from '../../types';

function ActionNode(props: NodeProps<WorkflowNode>) {
  const subtitle = props.data.nodeType === 'agent_combo'
    ? (props.data.agentType ? `Agent: ${props.data.agentType}` : 'No agent selected')
    : (props.data.callable ? `Callable: ${props.data.callable}` : 'Callable not set');

  return (
    <BaseNode
      {...props}
      icon={<Cog className="h-3.5 w-3.5" />}
      subtitle={subtitle}
    />
  );
}

export default memo(ActionNode);
