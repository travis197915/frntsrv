import type { NodeTypes } from '@xyflow/react';
import TriggerNode from './TriggerNode';
import ActionNode from './ActionNode';
import ConditionNode from './ConditionNode';
import OutputNode from './OutputNode';
import WorkAreaNode from './WorkAreaNode';
import DynamicShapeNode from './DynamicShapeNode';

export const nodeTypes: NodeTypes = {
  // Catalog-driven primary type — every palette tile drops in as one of these
  // and renders straight from the backend `ShapeDefinition`.
  shape: DynamicShapeNode,
  // Container — still hardcoded because Django models work-areas as a
  // hierarchy parent, not a palette item.
  workarea: WorkAreaNode,
  // Legacy hardcoded types kept until the few remaining seeded workflows
  // are migrated to catalog slugs.
  trigger: TriggerNode,
  action: ActionNode,
  agent_combo: ActionNode,
  claim_preflight: ActionNode,
  condition: ConditionNode,
  output: OutputNode,
};
