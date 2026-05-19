import { useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShapeCatalog } from './ShapeCatalogProvider';
import type { NodeMeta } from '@/lib/workflowsApi';

export interface DynamicNodeData extends NodeMeta, Record<string, unknown> {
  label?: string;
  description?: string;
}

export type DynamicShapeNodeType = Node<DynamicNodeData, 'shape'>;

const HANDLE_STYLE: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: '50%',
  background: '#fff',
  border: '2px solid #94a3b8',
};

export function DynamicShapeNode({ data, selected, width, height }: NodeProps<DynamicShapeNodeType>) {
  const catalog = useShapeCatalog();
  const def = useMemo(
    () => (data.definitionSlug ? catalog.bySlug[data.definitionSlug] : undefined),
    [catalog, data.definitionSlug],
  );

  const w = width  ?? def?.default_width  ?? 160;
  const h = height ?? def?.default_height ?? 56;
  const label = data.label ?? def?.default_label ?? def?.label ?? '...';

  const styleMap = (def?.default_style ?? {}) as Record<string, string>;
  const bg     = styleMap.fill   ?? '#f8fafc';
  const border = styleMap.stroke ?? '#94a3b8';
  const color  = styleMap.color  ?? '#0f172a';
  const accent = styleMap.accent ?? border;

  const handleStyle = { ...HANDLE_STYLE, borderColor: border };

  return (
    <>
      <Handle type="target" position={Position.Top}    id="top"    style={handleStyle} />
      <Handle type="target" position={Position.Left}   id="left"   style={handleStyle} />

      <div
        style={{
          width: w,
          height: h,
          background: bg,
          border: `2px solid ${border}`,
          borderRadius: 8,
          boxShadow: selected ? `0 0 0 3px ${accent}66` : '0 1px 4px rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
        }}
      >
        {/* accent stripe */}
        <span style={{
          position: 'absolute', left: 0, top: 0, width: 4, height: '100%',
          background: accent, borderRadius: '6px 0 0 6px',
        }} />
        <div style={{ padding: '0 12px 0 16px', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color, lineHeight: 1.4 }}>
            {label}
          </p>
          {data.description ? (
            <p style={{ margin: '2px 0 0', fontSize: 10, color, opacity: 0.6, lineHeight: 1.3 }}>
              {String(data.description).slice(0, 60)}
            </p>
          ) : null}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" style={handleStyle} />
      <Handle type="source" position={Position.Right}  id="right"  style={handleStyle} />
    </>
  );
}

export default DynamicShapeNode;
