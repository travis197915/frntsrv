import { memo, type ReactNode } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Loader2, Check, AlertTriangle, SkipForward } from 'lucide-react';
import type { WorkflowNodeData } from '../../types';
import { NODE_TYPE_CONFIG } from '../../types';
import type { NodeExecutionStatus } from '../../execution/types';

interface BaseNodeProps extends NodeProps {
  data: WorkflowNodeData;
  icon: ReactNode;
  extraHandles?: ReactNode;
  subtitle?: string;
  borderless?: boolean;
}

const statusBadge: Record<NodeExecutionStatus, ReactNode | null> = {
  idle: null,
  running: (
    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-white shadow-sm z-10">
      <Loader2 className="h-3 w-3 animate-spin" />
    </div>
  ),
  waiting_input: (
    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm z-10">
      <AlertTriangle className="h-3 w-3" />
    </div>
  ),
  completed: (
    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm z-10">
      <Check className="h-3 w-3" strokeWidth={3} />
    </div>
  ),
  failed: (
    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm z-10">
      <AlertTriangle className="h-3 w-3" />
    </div>
  ),
  skipped: (
    <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-sm z-10">
      <SkipForward className="h-3 w-3" />
    </div>
  ),
};

function BaseNodeComponent({ data, type, selected, icon, extraHandles, subtitle, borderless }: BaseNodeProps) {
  const nodeType = (
    (typeof data.nodeType === 'string' && data.nodeType in NODE_TYPE_CONFIG)
      ? data.nodeType
      : (typeof type === 'string' && type in NODE_TYPE_CONFIG)
        ? type
        : 'action'
  ) as keyof typeof NODE_TYPE_CONFIG;
  const cfg = NODE_TYPE_CONFIG[nodeType];
  const execStatus = (data as Record<string, unknown>).executionStatus as NodeExecutionStatus | undefined;

  return (
    <div
      className="relative w-[220px] rounded-lg transition-shadow duration-200 bg-card shadow-sm"
      style={{
        border: borderless
          ? 'none'
          : `1px solid ${selected ? cfg.color : 'var(--border)'}`,
        boxShadow: selected
          ? `0 0 0 2px ${cfg.color}40, 0 4px 24px ${cfg.color}20`
          : undefined,
      }}
    >
      {execStatus && statusBadge[execStatus]}

      <div
        className="h-1 rounded-t-lg"
        style={{ background: cfg.color }}
      />

      <div className="px-3 py-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: cfg.bgColor, color: cfg.color }}
          >
            {icon}
          </div>
          <span
            className="text-[10px] font-medium uppercase tracking-wider"
            style={{ color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        <p className="text-sm font-medium text-foreground truncate">
          {data.label}
        </p>

        {subtitle && (
          <p className="text-[11px] text-muted-foreground mt-1 truncate">
            {subtitle}
          </p>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-3! h-3! border-2! rounded-full! bg-muted! border-border! hover:border-primary! transition-colors"
      />

      {extraHandles ?? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3! h-3! border-2! rounded-full! bg-muted! border-border! hover:border-primary! transition-colors"
        />
      )}
    </div>
  );
}

export default memo(BaseNodeComponent);
