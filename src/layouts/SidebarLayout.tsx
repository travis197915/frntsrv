import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ChevronDown, LogOut, Menu, User } from 'lucide-react';
import { cn } from '@/utils/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleLabel } from '@/utils/user';
import { PlatformSection } from '@/components/Sidebar';
import { ThemeToggleButton } from '@/components/ThemeToggleButton';

// Client branding from environment variables
const CLIENT_NAME = import.meta.env.VITE_CLIENT_NAME || 'Client Name';
const CLIENT_LOGO = import.meta.env.VITE_CLIENT_LOGO || '';

function UserBadge() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const initials = user
    ? (user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? '?')
    : '';

  const displayName = user?.name || user?.email || 'User';

  return !user ? null : (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm hover:bg-muted/60 transition-colors"
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-xs font-medium text-foreground">{displayName}</div>
          <div className="text-[10px] text-muted-foreground">{getRoleLabel(user.role)}</div>
        </div>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 right-0 mb-1 z-20 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
            <button
              onClick={() => { navigate(`/users/${user.id}`); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              Profile
            </button>
            <button
              onClick={() => { navigate('/settings'); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left"
            >
              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
              Settings
            </button>
            <div className="border-t border-border" />
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SidebarNav({ onNavClick }: { onNavClick: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Branding — Our logo + client brand */}
      <div className="px-4 py-3 border-b border-border space-y-2.5 shrink-0">
        {/* ToyStack brand (vendor) */}
        <div className="flex items-center gap-2">
          <img
            src="/wipro.png"
            alt="ToyStack"
            className="h-8 w-8 object-contain opacity-60"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
          <span className="text-[10px] text-muted-foreground tracking-wide">Powered by Wipro</span>
        </div>

        {/* Client brand */}
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-primary/10 border border-border flex items-center justify-center overflow-hidden shrink-0">
            {CLIENT_LOGO ? (
              <img
                src={CLIENT_LOGO}
                alt={CLIENT_NAME}
                className="h-full w-full object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <span className="text-sm font-bold text-primary">
                {CLIENT_NAME.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold truncate text-foreground">{CLIENT_NAME}</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <PlatformSection onNavClick={onNavClick} />
      </div>

      {/* User badge + theme toggle at bottom */}
      <div className="border-t border-border p-3 shrink-0 space-y-2">
        <div className="flex items-center justify-end px-1">
          <ThemeToggleButton />
        </div>
        <UserBadge />
      </div>
    </div>
  );
}

interface SidebarLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function SidebarLayout({ children, title, subtitle }: SidebarLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-svh min-h-0 bg-background overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden h-svh min-h-0 md:flex w-56 shrink-0 flex-col border-r border-border bg-card">
        <SidebarNav onNavClick={() => {}} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex h-svh w-64 min-h-0 flex-col border-r border-border bg-card md:hidden">
            <SidebarNav onNavClick={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:hidden shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold truncate">{title || CLIENT_NAME}</span>
        </div>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
            {(title || subtitle) && (
              <div className="mb-6">
                {title && <h1 className="text-xl font-semibold text-foreground">{title}</h1>}
                {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
