import { useCallback } from "react";
import { X, Trash2, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  NODE_TYPE_CONFIG,
  type WorkflowNode,
  type WorkflowNodeData,
} from "../types";
import { useShapeCatalog } from "./nodes/ShapeCatalogProvider";
import type { ShapeDefinition, ShapePropertyField } from "@/lib/api";
import NodeAttachments from "./NodeAttachments";
import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";

interface ConfigPanelProps {
  node: WorkflowNode;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
  workflowId?: string;
  readOnly?: boolean;
}

function DynamicField({
  field,
  value,
  onChange,
  readOnly = false,
}: {
  field: ShapePropertyField;
  value: unknown;
  onChange: (next: unknown) => void;
  readOnly?: boolean;
}) {
  const id = `field-${field.name}`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {field.label}
      </label>
      {field.type === "text" ? (
        <Textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[80px] resize-none"
          disabled={readOnly}
        />
      ) : field.type === "select" && field.options ? (
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">Select…</option>
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "number" ? (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(e) =>
            onChange(e.target.value === "" ? undefined : Number(e.target.value))
          }
          disabled={readOnly}
        />
      ) : field.type === "boolean" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
            disabled={readOnly}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-muted-foreground">{field.label}</span>
        </label>
      ) : (
        <Input
          id={id}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
        />
      )}
    </div>
  );
}

function DynamicShapeInspector({
  node,
  def,
  onUpdate,
  readOnly = false,
}: {
  node: WorkflowNode;
  def: ShapeDefinition;
  onUpdate: (nodeId: string, updates: Partial<WorkflowNodeData>) => void;
  readOnly?: boolean;
}) {
  const data = node.data as WorkflowNodeData;
  const props =
    (data as unknown as { properties?: Record<string, unknown> }).properties ??
    {};

  const setProperty = (name: string, value: unknown) => {
    onUpdate(node.id, {
      properties: { ...props, [name]: value },
    } as unknown as Partial<WorkflowNodeData>);
  };

  const TOP_LEVEL: Record<string, keyof WorkflowNodeData> = {
    label: "label",
    description: "description",
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
              readOnly={readOnly}
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
            readOnly={readOnly}
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

export default function ConfigPanel({
  node,
  onUpdate,
  onDelete,
  onClose,
  workflowId,
  readOnly = false,
}: ConfigPanelProps) {
  const data = node.data as WorkflowNodeData;
  const catalog = useShapeCatalog();

  const props =
    (data as unknown as { properties?: Record<string, unknown> }).properties ??
    {};
  const attachedRules =
    (props.sop_rules as AttachedSopRule[] | undefined) ?? [];
  const attachedTools = (props.tool_calls as AttachedTool[] | undefined) ?? [];

  const setAttachments = (rules: AttachedSopRule[], tools: AttachedTool[]) => {
    onUpdate(node.id, {
      properties: { ...props, sop_rules: rules, tool_calls: tools },
    } as unknown as Partial<WorkflowNodeData>);
  };

  const definitionSlug = (data as unknown as { definitionSlug?: string })
    .definitionSlug;
  const def = definitionSlug ? catalog.bySlug[definitionSlug] : undefined;
  const isDynamicShape = Boolean(def);
  const isWorkArea = data.nodeType === "workarea";

  const cfg = isDynamicShape
    ? {
        label: def!.label,
        color: (def!.default_style?.stroke as string | undefined) ?? "#6366f1",
      }
    : NODE_TYPE_CONFIG.workarea;

  const update = useCallback(
    (field: keyof WorkflowNodeData, value: string) => {
      onUpdate(node.id, { [field]: value });
    },
    [node.id, onUpdate],
  );

  return (
    <aside className="w-full h-full flex flex-col border-l border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {isWorkArea ? (
            <Layers className="h-4 w-4 shrink-0" style={{ color: cfg.color }} />
          ) : (
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ background: cfg.color }}
            />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {readOnly ? "View" : "Configure"} {cfg.label}
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
          <DynamicShapeInspector
            node={node}
            def={def!}
            onUpdate={onUpdate}
            readOnly={readOnly}
          />
        ) : isWorkArea ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Phase Name
              </label>
              <Input
                value={data.label}
                onChange={(e) => update("label", e.target.value)}
                placeholder="e.g. Data Ingestion"
                disabled={readOnly}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                value={data.description ?? ""}
                onChange={(e) => update("description", e.target.value)}
                className="min-h-[80px] resize-none"
                placeholder="What is the purpose of this phase?"
                disabled={readOnly}
              />
            </div>

            <Separator />
            <div className="rounded-md border border-indigo-500/20 bg-indigo-500/5 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium" style={{ color: "#6366f1" }}>
                Work Area tips
              </p>
              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc list-inside">
                <li>Drag step nodes on top of this area to group them</li>
                <li>Resize by selecting and dragging the corners</li>
                <li>Connect work areas with edges for sequencing</li>
              </ul>
            </div>
          </>
        ) : null}

        {/* Per-node attachments: SOP rules + runtime tool calls */}
        {workflowId && !isWorkArea && (
          <>
            <Separator />
            <NodeAttachments
              workflowId={workflowId}
              rules={attachedRules}
              tools={attachedTools}
              onChange={setAttachments}
              readOnly={readOnly}
            />
          </>
        )}
      </div>

      {/* Footer */}
      {!readOnly && (
        <div className="border-t border-border px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(node.id)}
            className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {isWorkArea ? "Delete Work Area & Contents" : "Delete Node"}
          </Button>
        </div>
      )}
    </aside>
  );
}
