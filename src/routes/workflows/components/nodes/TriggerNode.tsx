import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';
import BaseNode from './BaseNode';
import type { WorkflowNode } from '../../types';

function TriggerNode(props: NodeProps<WorkflowNode>) {
  const triggerLabel = props.data.triggerType
    ? `Type: ${props.data.triggerType}`
    : undefined;

  return (
    <BaseNode
      {...props}
      icon={<Zap className="h-3.5 w-3.5" />}
      subtitle={triggerLabel}
    />
  );
}

export default memo(TriggerNode);
