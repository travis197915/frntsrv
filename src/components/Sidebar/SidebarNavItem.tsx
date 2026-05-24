import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/utils/utils';

interface SidebarNavItemProps {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  onClick?: () => void;
}

export function SidebarNavItem({ to, label, icon, end = false, onClick }: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}
