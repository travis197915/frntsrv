import type { WorkflowNodeType } from './types';

interface MinimalNode {
  id: string;
  type?: string;
  parentId?: string;
  position: { x: number; y: number };
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
  style?: { width?: number; height?: number };
}

export function shouldBlockConnection(
  nodes: MinimalNode[],
  sourceId: string | null | undefined,
  targetId: string | null | undefined,
): boolean {
  if (!sourceId || !targetId) return true;
  const sourceNode = nodes.find((n) => n.id === sourceId);
  const targetNode = nodes.find((n) => n.id === targetId);
  return sourceNode?.type === 'workarea' || targetNode?.type === 'workarea';
}

export function wrapNodesInWorkArea(
  existingNodes: MinimalNode[],
  workArea: {
    id: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    data: { label: string; nodeType: WorkflowNodeType };
  },
): MinimalNode[] {
  const { id: waId, position, width, height } = workArea;

  const enclosed = existingNodes.filter((n) => {
    if (n.type === 'workarea' || n.parentId) return false;
    const nw = (n.measured?.width ?? n.width) ?? 220;
    const nh = (n.measured?.height ?? n.height) ?? 100;
    const cx = n.position.x + nw / 2;
    const cy = n.position.y + nh / 2;
    return (
      cx >= position.x &&
      cx <= position.x + width &&
      cy >= position.y &&
      cy <= position.y + height
    );
  });

  const enclosedIds = new Set(enclosed.map((n) => n.id));

  const newWorkArea: MinimalNode = {
    id: waId,
    type: 'workarea',
    position,
    style: { width, height },
  };

  return [
    newWorkArea,
    ...existingNodes.map((n) => {
      if (!enclosedIds.has(n.id)) return n;
      return {
        ...n,
        parentId: waId,
        position: {
          x: n.position.x - position.x,
          y: n.position.y - position.y,
        },
      };
    }),
  ];
}

export function calculateWorkAreaSize(
  children: MinimalNode[],
  currentWidth: number,
  currentHeight: number,
  options: { padding: number; headerHeight: number; minWidth: number; minHeight: number },
): { width: number; height: number } | null {
  if (children.length === 0) return null;

  const { padding, headerHeight, minWidth, minHeight } = options;

  let maxX = 0;
  let maxY = 0;

  children.forEach((child) => {
    const childWidth = (child.measured?.width ?? child.width) ?? 220;
    const childHeight = (child.measured?.height ?? child.height) ?? 100;
    maxX = Math.max(maxX, child.position.x + childWidth);
    maxY = Math.max(maxY, child.position.y + childHeight);
  });

  const newWidth = Math.max(minWidth, maxX + padding);
  const newHeight = Math.max(minHeight, maxY + padding + headerHeight);

  if (Math.abs(newWidth - currentWidth) <= 5 && Math.abs(newHeight - currentHeight) <= 5) {
    return null;
  }

  return { width: newWidth, height: newHeight };
}
