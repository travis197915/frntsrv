import type { ReactNode } from 'react';
import { cn } from '@/utils/utils';
import type { BuilderSopVersion } from '@/interfaces/builder';

const ACTIVATION_STYLES: Record<string, { label: string; className: string }> = {
  pending_review: {
    label: 'Pending review',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  inactive: {
    label: 'Inactive',
    className: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  },
};

function formatActivationStatus(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return status
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function VersionBadge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0 text-[10px] font-medium leading-4',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface SopVersionBadgesProps {
  version?: BuilderSopVersion | null;
  className?: string;
}

export default function SopVersionBadges({ version, className }: SopVersionBadgesProps) {
  if (!version) return null;

  const activationStatus = version.activation_status ?? '';
  const activation =
    (activationStatus && ACTIVATION_STYLES[activationStatus]) ?? {
      label: formatActivationStatus(version.activation_status),
      className:
        'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };

  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      <VersionBadge className="bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-800">
        v{version.version_number}
      </VersionBadge>

      <VersionBadge className={activation.className}>{activation.label}</VersionBadge>

      {version.is_current ? (
        <VersionBadge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
          Current
        </VersionBadge>
      ) : (
        <VersionBadge className="bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-800">
          Not current
        </VersionBadge>
      )}

      {version.is_approved ? (
        <VersionBadge className="bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
          Approved
        </VersionBadge>
      ) : (
        <VersionBadge className="bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800">
          Not approved
        </VersionBadge>
      )}

      {!version.is_current && version.current_sop_id != null && (
        <span className="text-[10px] text-muted-foreground">
          Current SOP #{version.current_sop_id}
        </span>
      )}
    </div>
  );
}
