import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sopReviewApi } from '@/lib/api';
import type { BuilderSopVersion } from '@/interfaces/builder';
import { cn } from '@/utils/utils';

export function canReviewSopVersion(version?: BuilderSopVersion | null): boolean {
  if (!version) return false;
  if (version.is_approved) return false;
  if (version.activation_status === 'rejected') return false;
  if (version.activation_status === 'active') return false;
  if (version.activation_status === 'superseded') return false;
  // A version owned by an open change set is adopted by approving that batch,
  // which is what repoints the canvas. Activating it here would flip the badges
  // to "Current / Approved" while the canvas kept executing the old version —
  // so the card offers "Review changes" instead of Approve/Reject.
  if (version.change_set) return false;
  return true;
}

export function isSopIngestionComplete(status?: string): boolean {
  return status === 'COMPLETED' || status === 'PARTIAL';
}

type ReviewAction = 'approve' | 'reject';

interface SopReviewActionsProps {
  sopId: number | null | undefined;
  version?: BuilderSopVersion | null;
  canReview?: boolean;
  /** Hide while ingestion is still QUEUED / RUNNING. */
  ingestionStatus?: string;
  onComplete?: () => void;
  className?: string;
}

const CONFIRM_COPY: Record<
  ReviewAction,
  {
    title: string;
    description: string;
    alertTitle: string;
    alertDescription: string;
    confirmLabel: string;
    variant: 'approve' | 'reject';
  }
> = {
  approve: {
    title: 'Approve SOP version',
    description: 'This version will become the active SOP for this document.',
    alertTitle: 'Lower versions will be superseded',
    alertDescription:
      'Any older versions linked to the same document will be deactivated and marked as superseded.',
    confirmLabel: 'Approve version',
    variant: 'approve',
  },
  reject: {
    title: 'Reject SOP version',
    description: 'This version will not be activated for workflow use.',
    alertTitle: 'This action cannot be undone from here',
    alertDescription:
      'The rejected version stays in history but will not replace the current active SOP.',
    confirmLabel: 'Reject version',
    variant: 'reject',
  },
};

export default function SopReviewActions({
  sopId,
  version,
  canReview = false,
  ingestionStatus,
  onComplete,
  className,
}: SopReviewActionsProps) {
  const [busy, setBusy] = useState<ReviewAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<ReviewAction | null>(null);

  if (
    !canReview ||
    !sopId ||
    !canReviewSopVersion(version) ||
    (ingestionStatus !== undefined && !isSopIngestionComplete(ingestionStatus))
  ) {
    return null;
  }

  const versionLabel = version?.version_number ? ` v${version.version_number}` : '';
  const copy = pendingAction ? CONFIRM_COPY[pendingAction] : null;

  const run = async (action: ReviewAction) => {
    setBusy(action);
    setError(null);
    try {
      if (action === 'approve') {
        await sopReviewApi.activate(sopId);
      } else {
        await sopReviewApi.reject(sopId);
      }
      setPendingAction(null);
      onComplete?.();
    } catch (e) {
      setError(String((e as Error)?.message ?? e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            setPendingAction('approve');
          }}
        >
          {busy === 'approve' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3" />
          )}
          Approve
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px] border-rose-200 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-900/30"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            setPendingAction('reject');
          }}
        >
          {busy === 'reject' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <X className="h-3 w-3" />
          )}
          Reject
        </Button>
        {error && <span className="text-[10px] text-destructive">{error}</span>}
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && busy === null) setPendingAction(null);
        }}
      >
        <DialogContent
          className="z-[100] max-w-md"
          overlayClassName="z-[100]"
          onClick={(e) => e.stopPropagation()}
        >
          {copy && (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>
                  {copy.description}
                  {versionLabel ? (
                    <>
                      {' '}
                      You are reviewing SOP <span className="font-medium text-foreground">#{sopId}</span>
                      {versionLabel}.
                    </>
                  ) : (
                    <>
                      {' '}
                      SOP <span className="font-medium text-foreground">#{sopId}</span>.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>

              <Alert variant={copy.variant === 'reject' ? 'destructive' : 'default'}>
                {copy.variant === 'approve' ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <AlertTitle>{copy.alertTitle}</AlertTitle>
                <AlertDescription>{copy.alertDescription}</AlertDescription>
              </Alert>

              <DialogFooter className="gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant={copy.variant === 'reject' ? 'destructive' : 'default'}
                  disabled={busy !== null}
                  onClick={() => pendingAction && void run(pendingAction)}
                >
                  {busy !== null ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working…
                    </>
                  ) : (
                    copy.confirmLabel
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
