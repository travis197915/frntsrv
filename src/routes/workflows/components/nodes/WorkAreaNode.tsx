import { memo, useEffect } from 'react';
import { Handle, Position, NodeResizer, useNodes, useReactFlow, type NodeProps } from '@xyflow/react';
import { Layers } from 'lucide-react';
import type { WorkflowNodeData, WorkflowNode } from '../../types';

const COLOR = '#6366f1';
const BORDER_IDLE = 'rgba(99, 102, 241, 0.28)';
const BORDER_SELECTED = 'rgba(99, 102, 241, 0.75)';
const BG_IDLE = 'rgba(99, 102, 241, 0.03)';
const BG_SELECTED = 'rgba(99, 102, 241, 0.06)';
const HEADER_BG = 'rgba(99, 102, 241, 0.08)';
const HEADER_BORDER = 'rgba(99, 102, 241, 0.18)';
const PADDING = 30;       // Padding around children inside the work area
const HEADER_HEIGHT = 36; // Header bar height to offset child bounding box
const MIN_WIDTH = 340;
const MIN_HEIGHT = 240;

function WorkAreaNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as WorkflowNodeData;
  const allNodes = useNodes<WorkflowNode>();
  const { setNodes } = useReactFlow();
  
  const childNodes = allNodes.filter((n) => n.parentId === id);
  const childCount = childNodes.length;

  // Stable key representing child bounding boxes — avoids running on every render
  const childBoundsKey = childNodes
    .map((c) => {
      const w = (c.measured?.width ?? c.width) ?? 220;
      const h = (c.measured?.height ?? c.height) ?? 100;
      return `${c.id}:${c.position.x},${c.position.y},${w},${h}`;
    })
    .join('|');

  // Auto-expand the work area to fit all children
  useEffect(() => {
    if (childCount === 0) return;

    let maxX = 0;
    let maxY = 0;

    childNodes.forEach((child) => {
      const childWidth = (child.measured?.width ?? child.width) ?? 220;
      const childHeight = (child.measured?.height ?? child.height) ?? 100;
      maxX = Math.max(maxX, child.position.x + childWidth);
      maxY = Math.max(maxY, child.position.y + childHeight);
    });

    const parentNode = allNodes.find((n) => n.id === id);
    if (!parentNode) return;

    // style.width/height controls the actual rendered CSS size
    const currentWidth =
      typeof parentNode.style?.width === 'number' ? parentNode.style.width : (parentNode.width ?? MIN_WIDTH);
    const currentHeight =
      typeof parentNode.style?.height === 'number' ? parentNode.style.height : (parentNode.height ?? MIN_HEIGHT);

    const newWidth = Math.max(MIN_WIDTH, maxX + PADDING);
    const newHeight = Math.max(MIN_HEIGHT, maxY + PADDING + HEADER_HEIGHT);

    if (Math.abs(newWidth - currentWidth) > 5 || Math.abs(newHeight - currentHeight) > 5) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, style: { ...n.style, width: newWidth, height: newHeight } }
            : n,
        ),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childBoundsKey, id, setNodes]);

  return (
    <div
      className="relative h-full w-full rounded-xl border-2 transition-colors duration-200"
      style={{
        borderColor: selected ? BORDER_SELECTED : BORDER_IDLE,
        background: selected ? BG_SELECTED : BG_IDLE,
      }}
    >
      <NodeResizer
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        isVisible={!!selected}
        lineStyle={{ borderColor: COLOR, borderWidth: 1.5 }}
        handleStyle={{
          background: COLOR,
          border: `2px solid ${COLOR}`,
          width: 9,
          height: 9,
          borderRadius: 3,
        }}
      />

      {/* Header bar */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-t-xl border-b"
        style={{ borderColor: HEADER_BORDER, background: HEADER_BG }}
      >
        <Layers className="h-3.5 w-3.5 shrink-0" style={{ color: COLOR }} />
        <span className="text-xs font-semibold text-foreground truncate flex-1">
          {nodeData.label}
        </span>
        <span
          className="shrink-0 text-[10px] font-medium uppercase tracking-wider"
          style={{ color: COLOR }}
        >
          Work Area
        </span>
      </div>

      {/* Empty-state hint */}
      {childCount === 0 && (
        <div className="pointer-events-none absolute inset-0 top-[36px] flex items-center justify-center">
          <p
            className="text-[11px] select-none"
            style={{ color: 'rgba(99, 102, 241, 0.32)' }}
          >
            Drop nodes here
          </p>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Top}
        isConnectable={false}
        className="w-3! h-3! border-2! rounded-full! bg-muted! border-border! opacity-40 cursor-not-allowed"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={false}
        className="w-3! h-3! border-2! rounded-full! bg-muted! border-border! opacity-40 cursor-not-allowed"
      />
    </div>
  );
}

export default memo(WorkAreaNodeComponent);
