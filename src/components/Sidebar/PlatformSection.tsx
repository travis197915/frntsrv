/**
 * Sidebar groups are now fully data-driven — the layout, labels, icons and
 * visibility-by-role are loaded from the Django `/api/builder/ui/navigation/`
 * endpoint and grouped by `section`.  Nothing about the chrome is hardcoded.
 */
import * as Icons from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { useNavigation } from '@/lib/catalogApi';
import { SidebarNavItem } from './SidebarNavItem';
import type { NavItem } from '@/lib/api';

/** Resolve a lucide icon name to a component, falling back to `Circle`. */
function lookupIcon(name: string): typeof Icons.Circle {
  const Comp = (Icons as Record<string, unknown>)[name];
  if (typeof Comp === 'function' || typeof Comp === 'object') {
    return Comp as typeof Icons.Circle;
  }
  return Icons.Circle;
}

type Section = { label: string; items: NavItem[] };

interface PlatformSectionProps {
  onNavClick?: () => void;
}

export function PlatformSection({ onNavClick }: PlatformSectionProps) {
  const { data: items, isLoading: loading, error } = useNavigation();

  /**
   * Items with no `section` stay at the top (the "Dashboard" row).
   * Everything else lumps into a section, preserving insertion order so
   * the backend `order` field controls the display order end-to-end.
   */
  const { topLevel, sections } = useMemo(() => {
    const top: NavItem[] = [];
    const buckets = new Map<string, NavItem[]>();
    const order: string[] = [];
    for (const item of items ?? []) {
      if (!item.section) {
        top.push(item);
        continue;
      }
      if (!buckets.has(item.section)) {
        buckets.set(item.section, []);
        order.push(item.section);
      }
      buckets.get(item.section)!.push(item);
    }
    return {
      topLevel: top,
      sections: order.map<Section>((label) => ({ label, items: buckets.get(label) ?? [] })),
    };
  }, [items]);

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
    <div className="space-y-1">
      {topLevel.map(renderItem)}

      {sections.map((section) => (
        <div key={section.label}>
          <div className="pt-4 pb-1 border-t border-border/60 mt-2">
            <p className="px-3 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {section.label}
            </p>
          </div>
          <nav className="space-y-0.5">{section.items.map(renderItem)}</nav>
        </div>
      ))}
    </div>
  );
}
