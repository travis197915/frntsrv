import { Bell, FileDiff } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/utils/utils';
import { useSopNotifications } from './SopNotificationProvider';

export default function SopNotificationBell({
  compact = false,
}: {
  compact?: boolean;
}) {
  const {
    pendingNotifications,
    unreadCount,
    reviewNotification,
  } = useSopNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`SOP notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
          className={cn(
            'relative inline-flex items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            compact ? 'h-8 w-8' : 'h-9 w-full gap-2 px-3 text-xs font-medium',
          )}
        >
          <Bell className="h-4 w-4" />
          {!compact && <span>Notifications</span>}
          {unreadCount > 0 && (
            <span
              className={cn(
                'flex items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground',
                compact
                  ? 'absolute -right-1 -top-1 h-4 min-w-4 px-1'
                  : 'ml-auto h-4 min-w-4 px-1',
              )}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align={compact ? 'end' : 'start'}
        side={compact ? 'bottom' : 'top'}
        className="w-[min(360px,calc(100vw-24px))] p-0"
      >
        <div className="border-b border-border px-4 py-3">
          <div className="text-sm font-semibold">SOP changes</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            Revisions waiting for review
          </div>
        </div>
        {pendingNotifications.length ? (
          <div className="max-h-80 overflow-y-auto">
            {pendingNotifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => reviewNotification(notification.id)}
                className="group flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  <FileDiff className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold">
                      {notification.workflowName}
                    </span>
                    {notification.unread && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {notification.sopTitle} · v{notification.fromVersion} → v
                    {notification.toVersion}
                  </span>
                  <span className="mt-1 block text-[10px] font-medium text-amber-700 dark:text-amber-300">
                    {notification.changes.length} rules changed
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center">
            <Bell className="mx-auto h-5 w-5 text-muted-foreground/50" />
            <p className="mt-2 text-xs font-medium">No changes waiting</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Reviewed SOP revisions will clear from this list.
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
