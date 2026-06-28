/**
 * ToolContextSummary — compact, read-only badge + blurb of the cached LLM
 * understanding for a tool, shown inline on list cards (Tool Calls page).
 * Renders nothing until the tool has been contextualized at least once.
 */
import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { toolRegistryApi } from "@/lib/workflowsApi";

export const toolContextKey = (name: string) =>
  ["tool-context", name] as const;

export default function ToolContextSummary({ name }: { name: string }) {
  const { data } = useQuery({
    queryKey: toolContextKey(name),
    queryFn: () => toolRegistryApi.context(name),
    staleTime: 30_000,
  });

  const ctx = data?.context;
  if (!ctx) return null;

  return (
    <div className="mt-2 rounded border border-sky-500/20 bg-sky-500/5 px-2.5 py-1.5">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          <Sparkles className="h-3 w-3" />
          AI understanding
        </span>
        {ctx.record_count != null && (
          <Badge variant="outline" className="text-[9px]">
            {ctx.record_count} records
          </Badge>
        )}
        {ctx.fields.length > 0 && (
          <Badge variant="outline" className="text-[9px]">
            {ctx.fields.length} fields
          </Badge>
        )}
        {ctx.truncated && (
          <Badge
            variant="outline"
            className="border-amber-400 text-amber-600 text-[9px]"
          >
            truncated
          </Badge>
        )}
      </div>
      {ctx.summary && (
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
          {ctx.summary}
        </p>
      )}
    </div>
  );
}
