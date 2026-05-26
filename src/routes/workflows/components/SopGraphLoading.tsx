import { cn } from '@/utils/utils';
import type { CSSProperties } from 'react';

function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={cn(
        'animate-pulse rounded-md bg-muted-foreground/14 dark:bg-muted-foreground/18',
        className,
      )}
    />
  );
}

const GRAPH_NODE_SKELETONS = [
  { top: '12%', left: '38%', w: 'w-40', h: 'h-14' },
  { top: '28%', left: '18%', w: 'w-36', h: 'h-12' },
  { top: '28%', left: '58%', w: 'w-44', h: 'h-12' },
  { top: '48%', left: '32%', w: 'w-48', h: 'h-14' },
  { top: '48%', left: '62%', w: 'w-32', h: 'h-12' },
  { top: '68%', left: '22%', w: 'w-40', h: 'h-12' },
  { top: '68%', left: '52%', w: 'w-36', h: 'h-14' },
];

export function SopGraphCanvasLoading() {
  return (
    <div className="relative h-full w-full bg-muted/20 overflow-hidden">
      <div
        className="absolute inset-0 [background-image:radial-gradient(circle,#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] dark:[background-image:radial-gradient(circle,oklch(0.35_0.02_250)_1.5px,transparent_1.5px)]"
        aria-hidden
      />

      {GRAPH_NODE_SKELETONS.map((node, i) => (
        <Skeleton
          key={i}
          className={`absolute rounded-lg ${node.w} ${node.h}`}
          style={{ top: node.top, left: node.left }}
        />
      ))}

      <div className="absolute top-3 left-3">
        <Skeleton className="h-8 w-[148px] rounded-md" />
      </div>
      <div className="absolute top-3 right-3">
        <Skeleton className="h-[72px] w-[200px] rounded-md" />
      </div>
      <div className="absolute bottom-4 right-4">
        <Skeleton className="h-[120px] w-[180px] rounded-lg" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center gap-2 px-3 py-2">
        <Skeleton className="h-3.5 w-3.5 shrink-0 rounded" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-6 ml-auto rounded" />
      </div>
      <div className="px-3 pb-3 space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="rounded border border-border bg-background p-2 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-3 flex-1" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[85%]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SopSectionsPanelLoading() {
  return (
    <div className="h-full overflow-y-auto bg-card">
      <div className="sticky top-0 z-10 p-3 border-b border-border bg-card shadow-sm space-y-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-[92%]" />
        <div className="flex gap-1 pt-0.5">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-5 w-14 rounded" />
        </div>
      </div>

      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={3} />
      <SectionSkeleton rows={1} />
    </div>
  );
}
