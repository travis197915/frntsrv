import type { NodeTypes } from '@xyflow/react';
import WorkAreaNode from './WorkAreaNode';
import DynamicShapeNode from './DynamicShapeNode';

export const nodeTypes: NodeTypes = {
  /** Catalog-driven — every palette tile renders via this type. */
  shape: DynamicShapeNode,
  /** Container node — models a Django work-area hierarchy. */
  workarea: WorkAreaNode,
};
