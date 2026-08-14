import { useMemo, useRef, useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useShapeCatalog } from './ShapeCatalogProvider';
import type { NodeMeta } from '@/lib/api';
import { detectShapeType, type ShapeVariant } from '@/utils/shapeUtils';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

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

/** Returns true when the element's text is clamped (overflows its container). */
function useIsClamped(ref: React.RefObject<HTMLElement | null>) {
  const [clamped, setClamped] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setClamped(el.scrollHeight > el.clientHeight + 1);
  });
  return clamped;
}

export function DynamicShapeNode({ data, selected, width, height }: NodeProps<DynamicShapeNodeType>) {
  const catalog = useShapeCatalog();
  const labelRef = useRef<HTMLParagraphElement>(null);
  const isClamped = useIsClamped(labelRef);
  const def = useMemo(
    () => {
      const slug = data.definitionSlug;
      return typeof slug === 'string' && slug ? catalog.bySlug[slug] : undefined;
    },
    [catalog, data.definitionSlug],
  );

  const slug  = typeof data.definitionSlug === 'string' ? data.definitionSlug : '';
  const shape = detectShapeType(slug, def?.label ?? data.label ?? '');

  // xyflow hands `width`/`height` of 0 for not-yet-measured or collapsed
  // nodes. 0 is not nullish, so `??` keeps it and the SVG geometry below
  // (`w - sw`) turns negative → React's "<rect> width: -2" errors. Use `||`
  // to fall back to the design size, then floor to a min that always exceeds
  // the stroke width so no shape can ever produce a negative dimension.
  const MIN_DIM = 8;
  let w = Math.max(width  || def?.default_width  || 160, MIN_DIM);
  let h = Math.max(height || def?.default_height || 56,  MIN_DIM);

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

  // Out-of-scope rollup surfaced by the builder graph hydration
  // (builder/bindings_sync.py). `is_out_of_scope` => every bound rule is a
  // clean-exclusion rule; a partial count => some rows are out of scope.
  const props = (data.properties ?? {}) as Record<string, unknown>;
  // Auditor's manual per-node exclusion (set in ConfigPanel). Takes visual
  // precedence and greys the node out — the execution engine skips it entirely.
  const manualOos = props.manual_out_of_scope === true;
  // Auditor's manual per-node NOT-APPLICABLE (set in ConfigPanel). A non-scoring
  // gate: every rule renders NOT_APPLICABLE in execution (never a finding).
  const manualNa = props.manual_not_applicable === true;
  const fullyOos = props.is_out_of_scope === true;
  const oosCount = Number(props.oos_rule_count ?? 0);
  const ruleCount = Number(props.rule_count ?? 0);
  const partialOos = !manualOos && !manualNa && !fullyOos && oosCount > 0;
  const oosLabel = manualNa
    ? 'Not Applicable'
    : manualOos
      ? 'Excluded'
      : fullyOos
        ? 'Out of Scope'
        : partialOos
          ? `Out of Scope ${oosCount}/${ruleCount}`
          : '';

  // A diamond's inscribed (text-safe) area is far smaller than its bounding
  // box — text centered at 85% width spills past the slanted edges. Tighten the
  // text box and line clamps for diamonds so content always stays inside.
  const isDiamond = shape === 'decision';

  const labelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    fontWeight: 500,
    color,
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: isDiamond ? 2 : 3,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
  };

  const descStyle: React.CSSProperties = {
    margin: '2px 0 0',
    fontSize: 10,
    color,
    opacity: 0.6,
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: isDiamond ? 1 : 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    maxWidth: '100%',
  };

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
          opacity: manualOos || manualNa ? 0.55 : 1,
          filter: selected ? `drop-shadow(0 0 3px ${accent}66)` : 'drop-shadow(0 1px 3px rgba(0,0,0,0.1))',
        }}
      >
        <ShapeSvg
          w={w}
          h={h}
          fill={manualNa ? '#fffbeb' : manualOos ? '#f1f5f9' : fullyOos ? '#fef2f2' : bg}
          stroke={manualNa ? '#f59e0b' : manualOos ? '#94a3b8' : fullyOos ? '#f87171' : border}
          sw={sw}
        />

        {oosLabel ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                style={{
                  position: 'absolute',
                  top: -9,
                  right: -6,
                  zIndex: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: '1px 7px',
                  borderRadius: 9999,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  color: '#fff',
                  background: manualNa ? '#f59e0b' : manualOos ? '#475569' : fullyOos ? '#e11d48' : '#d97706',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                  textTransform: 'uppercase',
                }}
              >
                {oosLabel}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-center">
              {manualNa
                ? 'Manually marked not applicable — every rule on this node renders NOT APPLICABLE in execution (no LLM call, never a finding). Other steps still run independently.'
                : manualOos
                ? 'Manually excluded from the execution engine — every rule on this node is skipped and the rest of the workflow continues.'
                : fullyOos
                  ? 'This step is a clean exclusion — auditing stops on this path; no defect is raised.'
                  : `${oosCount} of ${ruleCount} rules on this step are out of scope (clean exclusions).`}
            </TooltipContent>
          </Tooltip>
        ) : null}

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: isDiamond ? '0 8px' : '0 16px',
            textAlign: 'center',
            maxWidth: isDiamond ? '58%' : '85%',
            maxHeight: isDiamond ? '54%' : 'calc(100% - 8px)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Only wrap in a Tooltip when the label is actually clamped.
              Toggling a single Tooltip's `open` between a boolean and
              undefined makes Radix flip controlled↔uncontrolled and warn;
              mounting/unmounting the whole Tooltip avoids that entirely. */}
          {isClamped ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <p ref={labelRef} style={labelStyle}>{label}</p>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-center">
                {label}
              </TooltipContent>
            </Tooltip>
          ) : (
            <p ref={labelRef} style={labelStyle}>{label}</p>
          )}
          {data.description ? (
            <p style={descStyle}>
              {String(data.description)}
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
