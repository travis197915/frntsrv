import { cn } from "@/utils/utils";

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

function RuleRowSkeleton() {
  return (
    <div className="px-4 py-2 flex items-start gap-3 border-b border-border/40">
      <Skeleton className="h-3.5 w-3.5 shrink-0 rounded mt-0.5" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
          <Skeleton className="h-5 w-20 rounded" />
        </div>
        <Skeleton className="h-3 w-[92%]" />
        <Skeleton className="h-3 w-[78%]" />
      </div>
    </div>
  );
}

function SopGroupSkeleton({ sections }: { sections: number }) {
  return (
    <div>
      <div className="px-4 py-2 bg-indigo-50/80 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2">
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded mt-0.5" />
        <div className="flex-1 min-w-0 space-y-1.5">
          <Skeleton className="h-3.5 w-2/5" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

      {Array.from({ length: sections }).map((_, sectionIdx) => (
        <div key={sectionIdx}>
          <div className="px-4 py-1.5 bg-card border-b border-border flex items-center gap-2">
            <Skeleton className="h-3 w-3 shrink-0 rounded" />
            <Skeleton className="h-3 w-36" />
          </div>
          <RuleRowSkeleton />
          <RuleRowSkeleton />
          {sectionIdx === 0 && <RuleRowSkeleton />}
        </div>
      ))}
    </div>
  );
}

export default function RulePickerLoading() {
  return (
    <div className="divide-y divide-border">
      <SopGroupSkeleton sections={2} />
      <SopGroupSkeleton sections={1} />
    </div>
  );
}
