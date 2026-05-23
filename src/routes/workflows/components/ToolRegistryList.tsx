/**
 * ToolRegistryList — shared list rendering for the DB-backed tool registry.
 *
 * Surfaces in two places:
 *   • NodePalette        — collapsible "Tools" section in the left rail.
 *   • RulePicker modal   — right-rail mirror while a rule is being attached.
 *
 * Both consumers get the same row markup (name, description, kind badge,
 * "Test" + optional select/check action) plus a tiny search filter.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Play, Search, Wrench } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  toolRegistryApi,
  type ToolRegistryEntry,
} from '@/lib/workflowsApi';

import ToolInvokeModal from './ToolInvokeModal';

interface ToolRegistryListProps {
  /** When non-null, render a check/uncheck button per row (used in RulePicker). */
  selectedToolIds?: Set<string>;
  onToggleSelect?: (tool: ToolRegistryEntry) => void;
  /** Optional initial filter text. */
  initialQuery?: string;
  /** Compact mode hides the heading; used inside other panels. */
  hideHeading?: boolean;
}

export default function ToolRegistryList({
  selectedToolIds,
  onToggleSelect,
  initialQuery = '',
  hideHeading = false,
}: ToolRegistryListProps) {
  const [tools, setTools] = useState<ToolRegistryEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [invokeTool, setInvokeTool] = useState<ToolRegistryEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    toolRegistryApi
      .list()
      .then((rows) => { if (!cancelled) setTools(rows); })
      .catch((err) => { if (!cancelled) setLoadError(err.message || String(err)); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!tools) return [];
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    return tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.display_name || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q),
    );
  }, [tools, query]);

  return (
    <div className="flex flex-col gap-2 min-h-0">
      {!hideHeading && (
        <div className="flex items-center gap-1.5">
          <Wrench className="h-3 w-3 text-muted-foreground/70" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Tools registry
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools…"
          className="h-8 pl-7 text-xs"
        />
      </div>

      {tools === null && !loadError && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tools…
        </div>
      )}
      {loadError && (
        <p className="text-[11px] text-rose-400">Failed to load tools: {loadError}</p>
      )}
      {tools !== null && filtered.length === 0 && (
        <p className="text-[11px] text-muted-foreground">No tools match “{query}”.</p>
      )}

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filtered.map((tool) => {
          const selected = selectedToolIds?.has(tool.id) ?? false;
          return (
            <div
              key={tool.id}
              className="rounded-lg border border-border bg-background px-2.5 py-2"
              title={tool.description || tool.name}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-foreground">
                      {tool.display_name || tool.name}
                    </p>
                    <Badge variant="outline" className="text-[9px] uppercase tracking-wider px-1 py-0">
                      {tool.tool_kind || tool.kind}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{tool.name}</p>
                  {tool.description && (
                    <p className="text-[11px] text-muted-foreground/90 line-clamp-2 mt-0.5">
                      {tool.description}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5"
                    onClick={() => setInvokeTool(tool)}
                    title="Invoke this tool"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  {onToggleSelect && (
                    <Button
                      size="sm"
                      variant={selected ? 'default' : 'outline'}
                      className="h-6 px-1.5"
                      onClick={() => onToggleSelect(tool)}
                      title={selected ? 'Remove' : 'Attach'}
                    >
                      {selected ? <Check className="h-3 w-3" /> : '+'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ToolInvokeModal
        open={invokeTool !== null}
        onOpenChange={(open) => { if (!open) setInvokeTool(null); }}
        tool={invokeTool}
      />
    </div>
  );
}
