import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SopGraphCanvas from './SopGraphCanvas';
import SopSectionsPanel from './SopSectionsPanel';

interface SopGraphDialogProps {
  open: boolean;
  jobId: string;
  auditSopId: number | null;
  onClose: () => void;
}

export default function SopGraphDialog({
  open,
  jobId,
  auditSopId,
  onClose,
}: SopGraphDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[95vw] h-[92vh] bg-background rounded-lg shadow-2xl border border-border flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2 shrink-0 bg-card">
          <h2 className="text-sm font-semibold">SOP Knowledge Graph</h2>
          <Button size="icon" variant="ghost" onClick={onClose} className="h-8 w-8 shrink-0 ml-3">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body — graph (left) + sections (right) */}
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 bg-muted/20">
            {jobId && auditSopId ? (
              <SopGraphCanvas jobId={jobId} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
                The SOP graph is not ready yet.<br />
                Once ingestion finishes the graph will appear here.
              </div>
            )}
          </div>
          {jobId && auditSopId && (
            <div className="w-[460px] shrink-0 border-l border-border">
              <SopSectionsPanel jobId={jobId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
