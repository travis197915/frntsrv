/**
 * Sidebar nav from Django `/api/builder/ui/navigation/`, filtered and flattened
 * for the current rollout (no section headings).
 */
import * as Icons from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { useNavigation } from '@/lib/catalogApi';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavItem } from '@/lib/api';

/** Temporary allow-list — expand when Agents, Activity, AI Usage launch. */
const VISIBLE_NAV_SLUGS = new Set([
  'workflows',
  'users',
  'settings',
  'field-mapping',
  'claim-ontology',
  'mcp-servers',
  'tool-calls',
]);

/** Resolve a lucide icon name to a component, falling back to `Circle`. */
function lookupIcon(name: string): typeof Icons.Circle {
  const Comp = (Icons as Record<string, unknown>)[name];
  if (typeof Comp === 'function' || typeof Comp === 'object') {
    return Comp as typeof Icons.Circle;
  }
  return Icons.Circle;
}

interface PlatformSectionProps {
  onNavClick?: () => void;
}

export function PlatformSection({ onNavClick }: PlatformSectionProps) {
  const { data: items, isLoading: loading, error } = useNavigation();

  const navItems = useMemo(
    () =>
      [...(items ?? [])]
        .filter((item) => VISIBLE_NAV_SLUGS.has(item.slug))
        .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
    [items],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading menu…
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-3 text-[11px] text-rose-400">
        Couldn't load sidebar: {error.message}
      </div>
    );
  }

  const renderItem = (item: NavItem) => {
    const Icon = lookupIcon(item.icon);
    return (
      <SidebarNavItem
        key={item.id}
        to={item.href}
        label={item.label}
        icon={<Icon className="h-4 w-4 shrink-0" />}
        onClick={onNavClick}
      />
    );
  };

  return (
    <nav className="space-y-0.5">
      {navItems.map(renderItem)}
    </nav>
  );
}
