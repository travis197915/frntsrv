import { memo } from 'react';
import { type NodeProps } from '@xyflow/react';
import { CheckCircle } from 'lucide-react';
import BaseNode from './BaseNode';
import type { WorkflowNode } from '../../types';

function OutputNode(props: NodeProps<WorkflowNode>) {
  return (
    <BaseNode
      {...props}
      icon={<CheckCircle className="h-3.5 w-3.5" />}
      subtitle={props.data.description}
    />
  );
}

export default memo(OutputNode);
