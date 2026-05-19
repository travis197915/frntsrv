/**
 * NodePalette — fully driven by the Django catalog.
 *
 * Each `ShapeCategory` becomes a collapsible section.  Inside, every
 * `ShapeDefinition` is rendered as a draggable tile that previews the
 * shape's actual SVG path, then encodes its slug in the drag payload.
 *
 * The xyflow canvas (`useWorkflowCanvas`) reads
 *     event.dataTransfer.getData('application/reactflow')
 * which is now `shape:<slug>` instead of one of the old hardcoded enums.
 */
import { GripVertical, Layers, Loader2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import type { ShapeDefinition } from '@/lib/api';

import { useShapeCatalog } from './nodes/ShapeCatalogProvider';

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

function ShapeThumb({ def }: { def: ShapeDefinition }) {
  // The palette mirrors the canvas exactly: a small rectangle with the
  // catalog-provided palette + accent stripe.
  const style  = (def.default_style ?? {}) as Record<string, unknown>;
  const fill   = (style.fill   as string | undefined) ?? '#ffffff';
  const stroke = (style.stroke as string | undefined) ?? '#94a3b8';
  const accent = (style.accent as string | undefined) ?? stroke;

  return (
    <div
      className="relative h-7 w-9 shrink-0 overflow-hidden"
      style={{
        background:   fill,
        border:       `1.5px solid ${stroke}`,
        borderRadius: 4,
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full"
        style={{ width: 3, background: accent }}
      />
    </div>
  );
}

function PaletteItem({ def }: { def: ShapeDefinition }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, def.slug)}
      className="group flex items-center gap-3 rounded-lg border border-border bg-background px-2.5 py-2 transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-primary/30 hover:shadow-md"
      title={def.description || def.label}
    >
      <ShapeThumb def={def} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{def.label}</p>
      </div>
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

interface NodePaletteProps {
  /**
   * Kept on the signature so existing call sites compile, but ignored: the
   * Django writer materialises a synthetic work-area + workbench for any
   * orphan shape, so the palette is always interactive.
   */
  hasWorkArea?: boolean;
}

export default function NodePalette(_props: NodePaletteProps) {
  const { categories, loading, error } = useShapeCatalog();
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!query.trim()) return categories;
    const q = query.trim().toLowerCase();
    return categories
      .map((cat) => ({
        ...cat,
        shapes: cat.shapes.filter(
          (s) =>
            s.label.toLowerCase().includes(q) ||
            s.slug.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q),
        ),
      }))
      .filter((cat) => cat.shapes.length > 0);
  }, [categories, query]);

  return (
    <aside className="w-[260px] shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">
      <div className="px-4 py-3.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Shapes
        </h2>
        <p className="text-[11px] text-muted-foreground/80 mt-0.5">Drag onto the canvas</p>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shapes…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading catalog…
          </div>
        ) : error ? (
          <p className="text-[11px] text-rose-400">{error.message}</p>
        ) : filteredCategories.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No shapes match “{query}”.</p>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id}>
              <div className="px-1 pb-2 flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-muted-foreground/70" />
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {cat.label}
                </p>
              </div>
              <div className="space-y-1.5">
                {cat.shapes.map((def) => (
                  <PaletteItem key={def.id} def={def} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </aside>
  );
}
