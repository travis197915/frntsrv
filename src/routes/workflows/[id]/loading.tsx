import { cn } from "@/utils/utils";
import { Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-muted-foreground/14 dark:bg-muted-foreground/18",
        className,
      )}
    />
  );
}

export default function WorkflowBuilderLoading() {
  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden text-foreground">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left palette */}
        <aside className="w-[250px] shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">
          <div className="px-4 py-3.5 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
          <div className="px-3 pb-3">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="border-t border-border" />
          <div className="flex-1 px-3 py-3 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-20" />
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Canvas */}
        <div className="relative flex-1 min-w-0 bg-muted/30 overflow-hidden">
          <div className="flex justify-center items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Loading workflow…</span>
          </div>
          <div className="absolute bottom-4 right-4">
            <Skeleton className="h-[130px] w-[180px] rounded-lg" />
          </div>
        </div>

        {/* Right context panel */}
        <aside className="w-[320px] shrink-0 flex flex-col border-l border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-7 rounded-md" />
          </div>
          <div className="flex-1 px-4 py-4 space-y-4">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-20 w-full rounded-md" />
            <Skeleton className="h-3 w-24" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
