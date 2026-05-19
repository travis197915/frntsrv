import { cn } from '@/lib/utils';

type StatusKey =
  | 'active' | 'expiring_soon' | 'expired' | 'revoked'
  | 'online' | 'busy' | 'offline' | 'error'
  | 'pending' | 'running' | 'completed' | 'failed' | 'idle'
  | 'info' | 'warn' | 'debug';

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  active:        { label: 'Active',        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  expiring_soon: { label: 'Expiring Soon', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  expired:       { label: 'Expired',       className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  revoked:       { label: 'Revoked',       className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  online:        { label: 'Online',        className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  busy:          { label: 'Busy',          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  offline:       { label: 'Offline',       className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  error:         { label: 'Error',         className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  pending:       { label: 'Pending',       className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  running:       { label: 'Running',       className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  completed:     { label: 'Completed',     className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  failed:        { label: 'Failed',        className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  idle:          { label: 'Idle',          className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  info:          { label: 'Info',          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  warn:          { label: 'Warn',          className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  debug:         { label: 'Debug',         className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status?.toLowerCase() as StatusKey;
  const config = STATUS_CONFIG[key] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
