import { ChevronDown, ChevronRight, Loader2, Wrench } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import SearchInput from '@/components/SearchInput';
import type { ShapeDefinition } from '@/lib/api';

import { useShapeCatalog } from './nodes/ShapeCatalogProvider';
import ToolRegistryList from './ToolRegistryList';
import { detectShapeType, SHAPE_FRIENDLY_NAMES, type ShapeVariant as ShapeType } from '@/utils/shapeUtils';

const DRAG_PREFIX = 'shape:';

function onDragStart(event: React.DragEvent, slug: string) {
  event.dataTransfer.setData('application/reactflow', `${DRAG_PREFIX}${slug}`);
  event.dataTransfer.effectAllowed = 'move';
}

/** Read the catalog slug out of a drop payload, returns null if it isn't ours. */
export function readDraggedShape(event: React.DragEvent): string | null {
  const raw = event.dataTransfer.getData('application/reactflow');
  return raw.startsWith(DRAG_PREFIX) ? raw.slice(DRAG_PREFIX.length) : null;
}

function deepenFill(fill: string, stroke: string): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] as const;
  };
  try {
    const [fr, fg, fb] = parse(fill);
    const [sr, sg, sb] = parse(stroke);
    const mix = (a: number, b: number) => Math.round(a + (b - a) * 0.3);
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(mix(fr, sr))}${toHex(mix(fg, sg))}${toHex(mix(fb, sb))}`;
  } catch {
    return fill;
  }
}

function ShapeIcon({ shapeType, fill, stroke }: { shapeType: ShapeType; fill: string; stroke: string }) {
  const richFill = deepenFill(fill, stroke);
  const c = { fill: richFill, stroke, strokeWidth: 2 };

  switch (shapeType) {
    case 'terminator':
      return (
        <svg width="52" height="26" viewBox="0 0 52 26" fill="none">
          <rect x="1.5" y="1.5" width="49" height="23" rx="11.5" {...c} />
        </svg>
      );
    case 'decision':
      return (
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <polygon points="18,2 34,18 18,34 2,18" {...c} />
        </svg>
      );
    case 'data':
      return (
        <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
          <polygon points="10,1.5 48.5,1.5 40,28.5 1.5,28.5" {...c} />
        </svg>
      );
    case 'database':
      return (
        <svg width="36" height="38" viewBox="0 0 36 38" fill="none">
          <ellipse cx="18" cy="9" rx="15" ry="7" {...c} />
          <path d="M3,9 v20 c0,3.9 6.7,7 15,7 s15,-3.1 15,-7 V9" stroke={stroke} strokeWidth={2} fill="none" />
          <ellipse cx="18" cy="9" rx="15" ry="7" {...c} />
        </svg>
      );
    case 'predefined':
      return (
        <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
          <rect x="1.5" y="1.5" width="47" height="27" rx="2" {...c} />
          <line x1="8" y1="1.5" x2="8" y2="28.5" stroke={stroke} strokeWidth={1.5} />
          <line x1="42" y1="1.5" x2="42" y2="28.5" stroke={stroke} strokeWidth={1.5} />
        </svg>
      );
    default:
      return (
        <svg width="50" height="30" viewBox="0 0 50 30" fill="none">
          <rect x="1.5" y="1.5" width="47" height="27" rx="4" {...c} />
        </svg>
      );
  }
}

function PaletteItem({ def, readOnly = false }: { def: ShapeDefinition; readOnly?: boolean }) {
  const style     = (def.default_style ?? {}) as Record<string, unknown>;
  const fill      = (style.fill   as string | undefined) ?? '#f1f5f9';
  const stroke    = (style.stroke as string | undefined) ?? '#94a3b8';
  const shapeType = detectShapeType(def.slug, def.label);
  const friendly  = SHAPE_FRIENDLY_NAMES[shapeType];

  return (
    <div
      draggable={!readOnly}
      onDragStart={readOnly ? undefined : (e) => onDragStart(e, def.slug)}
      className={`group flex flex-col items-center gap-1.5 rounded-xl border border-border/50 bg-background p-3 transition-all duration-150 ${
        readOnly
          ? "opacity-80 cursor-default"
          : "cursor-grab active:cursor-grabbing active:scale-95 hover:border-primary/40 hover:shadow-md hover:bg-accent/30"
      }`}
      title={def.description || def.label}
    >
      <div className="flex h-10 items-center justify-center">
        <ShapeIcon shapeType={shapeType} fill={fill} stroke={stroke} />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight">
        {friendly}
      </span>
    </div>
  );
}

interface NodePaletteProps {
  hasWorkArea?: boolean;
  readOnly?: boolean;
}

export default function NodePalette({ readOnly = false }: NodePaletteProps) {
  const { categories, loading, error } = useShapeCatalog();
  const [query, setQuery] = useState('');
  const [toolsOpen, setToolsOpen] = useState(true);

  const deduplicatedCategories = useMemo(() =>
    categories.map((cat) => {
      const seen = new Set<string>();
      return {
        ...cat,
        shapes: cat.shapes.filter((s) => {
          const type = detectShapeType(s.slug, s.label);
          if (seen.has(type)) return false;
          seen.add(type);
          return true;
        }),
      };
    }),
  [categories]);

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return deduplicatedCategories;
    const q = query.trim().toLowerCase();
    return deduplicatedCategories
      .map((cat) => ({
        ...cat,
        shapes: cat.shapes.filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            s.slug.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            SHAPE_FRIENDLY_NAMES[detectShapeType(s.slug, s.label)].toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.shapes.length > 0);
  }, [deduplicatedCategories, query]);

  return (
    <aside className="w-full h-full flex flex-col border-r border-border bg-card overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <h2 className="text-sm font-semibold text-foreground">Components</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {readOnly ? "Browse available components (view only)" : "Drag and drop onto the canvas"}
        </p>
      </div>

      <div className="px-3 pb-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search..."
          className="h-8 text-xs"
        />
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading components...</span>
          </div>
        ) : error ? (
          <p className="text-xs text-rose-400 px-1">{error.message}</p>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">No results for &ldquo;{query}&rdquo;</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id}>
              <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                {cat.label}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {cat.shapes.map((def) => (
                  <PaletteItem key={def.id} def={def} readOnly={readOnly} />
                ))}
              </div>
            </section>
          ))
        )}

        <Separator />

        <section className="flex flex-col min-h-0">
          <button
            type="button"
            onClick={() => setToolsOpen((v) => !v)}
            className="flex items-center gap-2 px-0.5 pb-2 text-left w-full group/toggle"
            aria-expanded={toolsOpen}
          >
            <Wrench className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 group-hover/toggle:text-muted-foreground transition-colors">
              Tools
            </span>
            {toolsOpen ? (
              <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
            ) : (
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
            )}
          </button>
          {toolsOpen && (
            <div className="max-h-[40vh] flex flex-col min-h-0">
              <ToolRegistryList hideHeading />
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
