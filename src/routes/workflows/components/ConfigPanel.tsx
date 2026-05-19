import { useCallback } from 'react';
import { X, Trash2, Layers, Sparkles } from 'lucide-react';
import { useQuery } from '@apollo/client/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { NODE_TYPE_CONFIG, type WorkflowNode, type WorkflowNodeData } from '../types';
import { LIST_COMBO_TEMPLATES_QUERY } from '@/graphql/agent.graphql';
import { useShapeCatalog } from './nodes/ShapeCatalogProvider';
import type { ShapeDefinition, ShapePropertyField } from '@/lib/api';
import NodeAttachments, {
  type AttachedSopRule,
  type AttachedTool,
} from './NodeAttachments';

interface ConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  /** Workflow ID — required to fetch the SOP rules / tools attachable to nodes. */
  workflowId?: string;
}

/**
 * Render one form field driven by a `ShapePropertyField` definition from
 * the Django catalog.  The whole inspector form is composed of these.
 */
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: ShapePropertyField;
  value: unknown;
  onChange: (next: unknown) => void;
}) {
  const id = `field-${field.name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {field.label}
      </label>
      {field.type === 'text' ? (
        <Textarea
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      ) : field.type === 'select' && field.options ? (
        <select
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === 'number' ? (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      ) : field.type === 'boolean' ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-muted-foreground">{field.label}</span>
        </label>
      ) : (
        <Input
          id={id}
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

/**
 * Inspector form when the selected node is catalog-driven (xyflow type
 * `shape`).  The form is generated from `def.property_schema` so adding a
 * new field on the Django side never requires frontend changes.
 */
function DynamicShapeInspector({
  node,
  def,
  onUpdate,
}: {
  node: WorkflowNode;
  def: ShapeDefinition;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
}) {
  const data = node.data as WorkflowNodeData;
  const props = (data as unknown as { properties?: Record<string, unknown> }).properties ?? {};

  const setProperty = (name: string, value: unknown) => {
    onUpdate(node.id, {
      properties: { ...props, [name]: value },
    } as unknown as Partial<WorkflowNodeData>);
  };

  // Fields we promote out of `properties` into top-level node data so
  // they round-trip through the existing label/description machinery.
  const TOP_LEVEL: Record<string, keyof WorkflowNodeData> = {
    label:       'label',
    description: 'description',
  };

  return (
    <>
      {def.property_schema.map((field) => {
        const topKey = TOP_LEVEL[field.name];
        if (topKey) {
          return (
            <DynamicField
              key={field.name}
              field={field}
              value={data[topKey] as unknown}
              onChange={(v) =>
                onUpdate(node.id, { [topKey]: v } as Partial<WorkflowNodeData>)
              }
            />
          );
        }
        return (
          <DynamicField
            key={field.name}
            field={field}
            value={props[field.name]}
            onChange={(v) => setProperty(field.name, v)}
          />
        );
      })}
      {def.description ? (
        <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-xs font-medium text-indigo-300">
            <Sparkles className="h-3 w-3" />
            {def.label}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
            {def.description}
          </p>
        </div>
      ) : null}
    </>
  );
}

export default function ConfigPanel({ node, onUpdate, onDelete, onClose, workflowId }: ConfigPanelProps) {
  const data = node.data as WorkflowNodeData;
  const catalog = useShapeCatalog();

  // Attached rules / tools live on properties.sop_rules and .tool_calls.
  const props = (data as unknown as { properties?: Record<string, unknown> }).properties ?? {};
  const attachedRules = (props.sop_rules as AttachedSopRule[] | undefined) ?? [];
  const attachedTools = (props.tool_calls as AttachedTool[] | undefined) ?? [];

  const setAttachments = (rules: AttachedSopRule[], tools: AttachedTool[]) => {
    onUpdate(node.id, {
      properties: { ...props, sop_rules: rules, tool_calls: tools },
    } as unknown as Partial<WorkflowNodeData>);
  };

  // Catalog-driven shape?  Drive the panel from the backend definition.
  const definitionSlug = (data as unknown as { definitionSlug?: string }).definitionSlug;
  const def = definitionSlug ? catalog.bySlug[definitionSlug] : undefined;
  const isDynamicShape = Boolean(def);

  const cfg = isDynamicShape
    ? {
        label: def!.label,
        color: (def!.default_style?.stroke as string | undefined) ?? '#6366f1',
      }
    : NODE_TYPE_CONFIG[data.nodeType];
  const isWorkArea = data.nodeType === 'workarea';

  const { data: comboData } = useQuery(LIST_COMBO_TEMPLATES_QUERY, {
    skip: isDynamicShape || data.nodeType !== 'agent_combo',
    fetchPolicy: 'cache-and-network',
  });
  const comboTemplates: Array<{ id: string; label: string; description: string }> =
    (comboData as any)?.comboTemplates ?? [];

  const update = useCallback(
    (field: keyof WorkflowNodeData, value: string) => {
      onUpdate(node.id, { [field]: value });
    },
    [node.id, onUpdate],
  );

  return (
    <aside className="w-[320px] shrink-0 flex flex-col border-l border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {isWorkArea ? (
            <Layers className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
          ) : (
            <div className="h-3 w-3 rounded-full shrink-0" style={{ background: cfg.color }} />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            Configure {cfg.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {isDynamicShape ? (
          <DynamicShapeInspector node={node} def={def!} onUpdate={onUpdate} />
        ) : (
        <>
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            {isWorkArea ? 'Phase Name' : 'Name'}
          </label>
          <Input
            value={data.label}
            onChange={(e) => update('label', e.target.value)}
            placeholder={isWorkArea ? 'e.g. Data Ingestion' : 'Node name'}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Description</label>
          <Textarea
            value={data.description ?? ''}
            onChange={(e) => update('description', e.target.value)}
            className="min-h-[80px] resize-none"
            placeholder={
              isWorkArea
                ? 'What is the purpose of this phase?'
                : 'What does this step do?'
            }
          />
        </div>

        {isWorkArea ? (
          <>
            <Separator />
            <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium" style={{ color: '#6366f1' }}>
                Work Area tips
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                <li>Drag step nodes on top of this area to group them</li>
                <li>Resize by selecting and dragging the corners</li>
                <li>Connect work areas with edges for sequencing</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <Separator />

            {data.nodeType === 'trigger' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Trigger Type</label>
                <select
                  value={data.triggerType ?? 'manual'}
                  onChange={(e) => update('triggerType', e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="manual">Manual</option>
                  {/* <option value="schedule">Schedule</option>
                  <option value="webhook">Webhook</option> */}
                </select>
              </div>
            )}

            {data.nodeType === 'action' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Python Callable
                </label>
                <Input
                  value={String(data.callable ?? '')}
                  onChange={(e) => update('callable', e.target.value)}
                  className="font-mono text-xs"
                  placeholder="e.g. workflows.services.my_callable"
                />
                <p className="text-[10px] text-muted-foreground">
                  Backend executes this dotted path as executor type <code>python_script</code>.
                </p>
              </div>
            )}

            {data.nodeType === 'agent_combo' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Agent Combo</label>
                <select
                  value={data.agentType ?? data.combo_id ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Store both agentType (for display) and combo_id (for backend execution)
                    onUpdate(node.id, { agentType: val, combo_id: val });
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select combo…</option>
                  {comboTemplates.map((combo) => (
                    <option key={combo.id} value={combo.id}>
                      {combo.label}
                    </option>
                  ))}
                </select>
                {(data.agentType || data.combo_id) && (() => {
                  const selectedId = data.agentType ?? data.combo_id;
                  const selected = comboTemplates.find((c) => c.id === selectedId);
                  if (!selected) return null;
                  return (
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      {selected.description}
                    </p>
                  );
                })()}
              </div>
            )}

            {data.nodeType === 'condition' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Condition Expression
                </label>
                <Input
                  value={data.conditionExpr ?? ''}
                  onChange={(e) => update('conditionExpr', e.target.value)}
                  className="font-mono text-xs"
                  placeholder='e.g. status === "approved"'
                />
                <p className="text-[10px] text-muted-foreground">
                  "Yes" exits left, "No" exits right
                </p>
              </div>
            )}

            {data.nodeType === 'claim_preflight' && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5 space-y-1.5">
                <p className="text-xs font-medium text-foreground">Pre-flight Check</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  At runtime this step pauses and prompts the user to upload the claim documents
                  (Excel + PDF) and enter a Claim ID. The backend validates the data before the
                  workflow continues.
                </p>
              </div>
            )}

            {data.nodeType === 'output' && (
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2.5">
                <p className="text-xs text-muted-foreground">
                  Output nodes are terminal endpoints. No additional configuration is needed.
                </p>
              </div>
            )}
          </>
        )}
        </>
        )}

        {/* Per-node attachments: SOP rules + runtime tool calls */}
        {workflowId && !isWorkArea && (
          <>
            <Separator />
            <NodeAttachments
              workflowId={workflowId}
              rules={attachedRules}
              tools={attachedTools}
              onChange={setAttachments}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(node.id)}
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          {isWorkArea ? 'Delete Work Area & Contents' : 'Delete Node'}
        </Button>
      </div>
    </aside>
  );
}
