import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  FileDiff,
  GitBranch,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/utils';
import type {
  SopChangeNotification,
  SopRuleChange,
} from './types';

function DiffField({
  label,
  previous,
  current,
}: {
  label: string;
  previous: string;
  current: string;
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
        {label}
      </div>
      <div className="grid overflow-hidden rounded-md border border-border md:grid-cols-2">
        <div className="min-h-24 border-b border-border bg-red-50/60 p-3 dark:bg-red-950/20 md:border-b-0 md:border-r">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
            <X className="h-3 w-3" /> Previous
          </div>
          <p className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-red-950 dark:text-red-100">
            {previous || 'No previous rule'}
          </p>
        </div>
        <div className="min-h-24 bg-emerald-50/60 p-3 dark:bg-emerald-950/20">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <Check className="h-3 w-3" /> New
          </div>
          <p className="whitespace-pre-wrap font-mono text-[12px] leading-5 text-emerald-950 dark:text-emerald-100">
            {current || 'Rule removed'}
          </p>
        </div>
      </div>
    </div>
  );
}

function ChangeListItem({
  change,
  active,
  onClick,
}: {
  change: SopRuleChange;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full border-l-2 px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-primary bg-primary/8'
          : 'border-transparent hover:bg-muted/60',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] text-muted-foreground">
            {change.ruleId}
          </div>
          <div className="mt-0.5 text-xs font-medium leading-4 text-foreground">
            {change.title}
          </div>
        </div>
        <ChevronRight
          className={cn(
            'mt-1 h-3.5 w-3.5 shrink-0 transition-transform',
            active ? 'translate-x-0.5 text-primary' : 'text-muted-foreground',
          )}
        />
      </div>
    </button>
  );
}

interface Props {
  notification: SopChangeNotification | null;
  onClose: () => void;
  onResolve: (
    id: string,
    outcome: 'rejected' | 'approved',
  ) => void;
}

export default function SopChangeReviewModal({
  notification,
  onClose,
  onResolve,
}: Props) {
  const { isAdmin } = useAuth();
  const [selectedRuleId, setSelectedRuleId] = useState('');

  useEffect(() => {
    setSelectedRuleId(notification?.changes[0]?.id ?? '');
  }, [notification]);

  if (!notification) return null;

  const selectedRule =
    notification.changes.find((change) => change.id === selectedRuleId) ??
    notification.changes[0];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-5xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              <FileDiff className="h-3 w-3" /> SOP update
            </span>
            <span className="text-xs text-muted-foreground">
              v{notification.fromVersion}
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              v{notification.toVersion}
            </span>
          </div>
          <DialogTitle className="text-base">
            {notification.sopTitle}
          </DialogTitle>
          <DialogDescription>
            {notification.workflowName} · {notification.changes.length} rules
            changed
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 md:grid-cols-[220px_1fr]">
            <aside className="border-b border-border bg-muted/25 md:border-b-0 md:border-r">
              <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Changed rules
              </div>
              <div className="max-h-36 overflow-y-auto md:max-h-[520px]">
                {notification.changes.map((change) => (
                  <ChangeListItem
                    key={change.id}
                    change={change}
                    active={selectedRule.id === change.id}
                    onClick={() => setSelectedRuleId(change.id)}
                  />
                ))}
              </div>
            </aside>

            <div className="max-h-[58vh] space-y-4 overflow-y-auto p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {selectedRule.ruleId}
                  </div>
                  <h3 className="mt-0.5 text-sm font-semibold">
                    {selectedRule.title}
                  </h3>
                </div>
                <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
                  {selectedRule.changeType}
                </span>
              </div>
              <DiffField
                label="Condition"
                previous={selectedRule.previous.condition}
                current={selectedRule.current.condition}
              />
              <DiffField
                label="Action"
                previous={selectedRule.previous.action}
                current={selectedRule.current.action}
              />
              <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  This rule affects{' '}
                  <strong className="font-semibold text-foreground">
                    {selectedRule.dependentNodes.join(', ')}
                  </strong>
                  .
                </span>
              </div>
            </div>
          </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-5 py-3">
          {!isAdmin ? (
            <div className="flex w-full items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              You can review this change. An administrator must approve or reject it.
            </div>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:hover:bg-red-950/30"
                onClick={() => onResolve(notification.id, 'rejected')}
              >
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => onResolve(notification.id, 'approved')}
              >
                Approve
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
