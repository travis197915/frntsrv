import { useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShapeCatalog } from './ShapeCatalogProvider';
import type { NodeMeta } from '@/lib/api';
import { detectShapeType, type ShapeVariant } from '@/utils/shapeUtils';

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

const HANDLE_POSITIONS = [
  { position: Position.Top, id: 'top' },
  { position: Position.Bottom, id: 'bottom' },
  { position: Position.Left, id: 'left' },
  { position: Position.Right, id: 'right' },
] as const;

interface ShapeSvgProps {
  w: number;
  h: number;
  fill: string;
  stroke: string;
  sw: number;
}

function TerminatorSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const p = sw / 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      <rect x={p} y={p} width={w - sw} height={h - sw} rx={h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function ProcessSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const p = sw / 2;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      <rect x={p} y={p} width={w - sw} height={h - sw} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function DecisionSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const cx = w / 2, cy = h / 2;
  const inY = 5, inX = 5;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      <polygon
        points={`${cx},${inY} ${w - inX},${cy} ${cx},${h - inY} ${inX},${cy}`}
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
      />
    </svg>
  );
}

function DataSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const p = sw / 2;
  const skew = w * 0.15;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      <polygon
        points={`${skew + p},${p} ${w - p},${p} ${w - skew - p},${h - p} ${p},${h - p}`}
        fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const p = sw / 2;
  const ry = Math.min(h * 0.16, 14);
  const rx = w / 2 - p;
  const top = ry + p;
  const bot = h - ry - p;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      {/* body */}
      <path
        d={`M${p},${top} v${bot - top} a${rx},${ry} 0 0,0 ${w - sw},0 v-${bot - top}`}
        fill={fill} stroke={stroke} strokeWidth={sw}
      />
      {/* top cap (drawn last to sit on top) */}
      <ellipse cx={w / 2} cy={top} rx={rx} ry={ry} fill={fill} stroke={stroke} strokeWidth={sw} />
    </svg>
  );
}

function PredefinedSvg({ w, h, fill, stroke, sw }: ShapeSvgProps) {
  const p = sw / 2;
  const inset = Math.min(w * 0.1, 12);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" overflow="visible">
      <rect x={p} y={p} width={w - sw} height={h - sw} rx={4} fill={fill} stroke={stroke} strokeWidth={sw} />
      <line x1={inset} y1={p} x2={inset} y2={h - p} stroke={stroke} strokeWidth={sw * 0.75} />
      <line x1={w - inset} y1={p} x2={w - inset} y2={h - p} stroke={stroke} strokeWidth={sw * 0.75} />
    </svg>
  );
}

const SHAPE_SVGS: Record<ShapeVariant, React.FC<ShapeSvgProps>> = {
  terminator: TerminatorSvg,
  process:    ProcessSvg,
  decision:   DecisionSvg,
  data:       DataSvg,
  database:   DatabaseSvg,
  predefined: PredefinedSvg,
};

export function DynamicShapeNode({ data, selected, width, height }: NodeProps<DynamicShapeNodeType>) {
  const catalog = useShapeCatalog();
  const def = useMemo(
    () => {
      const slug = data.definitionSlug;
      return typeof slug === 'string' && slug ? catalog.bySlug[slug] : undefined;
    },
    [catalog, data.definitionSlug],
  );

  const slug  = typeof data.definitionSlug === 'string' ? data.definitionSlug : '';
  const shape = detectShapeType(slug, def?.label ?? data.label ?? '');

  let w = width  ?? def?.default_width  ?? 160;
  let h = height ?? def?.default_height ?? 56;

  if (shape === 'decision') {
    h = Math.max(h, 64);
    w = Math.max(w, h);
  }
  if (shape === 'database') {
    h = Math.max(h, 56);
  }

  const label = data.label ?? def?.default_label ?? def?.label ?? '...';

  const styleMap = (def?.default_style ?? {}) as Record<string, string>;
  const bg     = styleMap.fill   ?? '#f8fafc';
  const border = styleMap.stroke ?? '#94a3b8';
  const color  = styleMap.color  ?? '#0f172a';
  const accent = styleMap.accent ?? border;

  const sw = 2;
  const ShapeSvg = SHAPE_SVGS[shape];
  const handleStyle = { ...HANDLE_STYLE, borderColor: border, zIndex: 1 };

  return (
    <>
      <div
        style={{
          width: w,
          height: h,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'default',
          filter: selected ? `drop-shadow(0 0 3px ${accent}66)` : 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
        }}
      >
        <ShapeSvg w={w} h={h} fill={bg} stroke={border} sw={sw} />

        <div style={{ position: 'relative', zIndex: 1, padding: '0 16px', textAlign: 'center', maxWidth: '85%' }}>
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

      {HANDLE_POSITIONS.flatMap(({ position, id }) => [
        <Handle
          key={`${id}-target`}
          type="target"
          position={position}
          id={`${id}-target`}
          style={handleStyle}
        />,
        <Handle
          key={`${id}-source`}
          type="source"
          position={position}
          id={`${id}-source`}
          style={handleStyle}
        />,
      ])}
    </>
  );
}

export default DynamicShapeNode;
