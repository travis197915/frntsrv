/**
 * ToolContextPanel — renders the LLM-derived "understanding" of an MCP tool
 * response: a plain-English summary plus a documented field table
 * (name / type / example / meaning). Backed by the context store
 * (`agent_tools.McpToolContext`).
 */
import { Loader2, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { ToolContext } from '@/lib/workflowsApi';

interface ToolContextPanelProps {
  context: ToolContext | null;
  loading: boolean;
  error: string | null;
}

function previewExample(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function ToolContextPanel({
  context,
  loading,
  error,
}: ToolContextPanelProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Understanding the response with AI…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Could not analyze response: {error}
      </div>
    );
  }

  if (!context) return null;

  return (
    <div className="rounded border border-border bg-muted/20">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-sky-500" />
          AI Understanding
        </div>
        <div className="flex items-center gap-1">
          {context.record_count != null && (
            <Badge variant="outline" className="text-[9px]">
              {context.record_count} records
            </Badge>
          )}
          {context.truncated && (
            <Badge
              variant="outline"
              className="border-amber-400 text-amber-600 text-[9px]"
            >
              truncated
            </Badge>
          )}
        </div>
      </div>

      {context.summary && (
        <p className="px-3 py-2 text-xs leading-relaxed text-foreground/90">
          {context.summary}
        </p>
      )}

      {context.fields.length > 0 && (
        <div className="max-h-64 overflow-auto border-t border-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 font-semibold">Field</th>
                <th className="px-2 py-1.5 font-semibold">Type</th>
                <th className="px-2 py-1.5 font-semibold">Example</th>
                <th className="px-3 py-1.5 font-semibold">Meaning</th>
              </tr>
            </thead>
            <tbody>
              {context.fields.map((f, i) => (
                <tr
                  key={`${f.path || f.name}-${i}`}
                  className="border-t border-border/60 align-top"
                >
                  <td className="px-3 py-1.5 font-mono text-[11px] text-sky-700 dark:text-sky-300">
                    {f.name}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">{f.type}</td>
                  <td className="px-2 py-1.5 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                    <span className="line-clamp-2 break-all">
                      {previewExample(f.example)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-foreground/80">
                    {f.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
