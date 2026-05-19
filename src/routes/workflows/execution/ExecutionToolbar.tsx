import { Pause, X, Loader2, Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RunStatus } from './useWorkflowExecution';

interface Props {
  status: RunStatus;
  stepIndex: number;
  totalSteps: number;
  elapsedMs: number;
  isLive: boolean;
  currentPhaseName?: string;
  onCancel: () => void;
}

function formatTime(ms: number): string {
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ExecutionToolbar({
  status,
  stepIndex,
  totalSteps,
  elapsedMs,
  isLive,
  currentPhaseName,
  onCancel,
}: Props) {
  if (status === 'idle' || status === 'completed' || status === 'failed' || status === 'cancelled') {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 exec-toolbar-enter z-50" style={{ transform: 'translateX(-50%)' }}>
      <div className="flex items-center gap-3 rounded-full border border-border bg-card/95 backdrop-blur-md shadow-xl px-4 py-2">
        {/* Status indicator */}
        <div className="flex items-center gap-2">
          {status === 'running' && <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />}
          {status === 'paused' && <Pause className="h-3.5 w-3.5 text-amber-500" />}

          <span className="text-xs font-medium text-foreground">
            {isLive ? (
              currentPhaseName ? (
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-muted-foreground" />
                  {currentPhaseName}
                </span>
              ) : (
                status === 'paused' ? 'Awaiting Input' : 'Running…'
              )
            ) : totalSteps > 0 ? (
              `Step ${stepIndex} of ${totalSteps}`
            ) : (
              'Running…'
            )}
          </span>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Timer */}
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatTime(elapsedMs)}
        </span>

        {/* Divider */}
        <div className="h-4 w-px bg-border" />

        {/* Controls */}
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 rounded-full text-destructive hover:bg-destructive/10"
            onClick={onCancel}
            title="Stop execution"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
