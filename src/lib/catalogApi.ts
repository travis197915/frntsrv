/**
 * Hooks + helpers around the Django catalog endpoints.
 *
 * The whole point: nothing in the UI is hardcoded.  Palette items, sidebar
 * entries, dashboard tiles, and per-shape inspector forms all live in the
 * Django `builder` app and arrive here as plain JSON.
 *
 *   GET /catalog/categories/  → palette grouped by category
 *   GET /catalog/shapes/      → flat list of every palette item
 *   GET /catalog/shapes/:slug → one shape definition
 *   GET /ui/navigation/       → sidebar entries
 *   GET /ui/dashboard/        → dashboard tiles
 */

import { useQuery } from '@tanstack/react-query';

import { builderClient } from './clients';
import type {
  DashboardWidget,
  NavItem,
  ShapeCategory,
  ShapeDefinition,
} from '../interfaces/builder';

// ── Imperative fetchers (kept for direct / context use) ─────────────────────

export const catalogApi = {
  categories: () => builderClient.get<ShapeCategory[]>('/catalog/categories/'),
  shapes:     () => builderClient.get<ShapeDefinition[]>('/catalog/shapes/'),
  shape:      (slug: string) => builderClient.get<ShapeDefinition>(`/catalog/shapes/${slug}/`),
  navigation: () => builderClient.get<NavItem[]>('/ui/navigation/'),
  dashboard:  () => builderClient.get<DashboardWidget[]>('/ui/dashboard/'),
};

// ── Query keys ──────────────────────────────────────────────────────────────

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  shapes:     ['catalog', 'shapes'] as const,
  shape:      (slug: string) => ['catalog', 'shape', slug] as const,
  navigation: ['catalog', 'navigation'] as const,
  dashboard:  ['catalog', 'dashboard'] as const,
};

const STALE_5MIN = 5 * 60_000;

// ── TanStack Query hooks ─────────────────────────────────────────────────────

export function useShapeCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn:  catalogApi.categories,
    staleTime: STALE_5MIN,
  });
}

export function useShapeDefinitions() {
  return useQuery({
    queryKey: catalogKeys.shapes,
    queryFn:  catalogApi.shapes,
    staleTime: STALE_5MIN,
  });
}

export function useNavigation() {
  return useQuery({
    queryKey: catalogKeys.navigation,
    queryFn:  catalogApi.navigation,
    staleTime: STALE_5MIN,
  });
}

export function useDashboard() {
  return useQuery({
    queryKey: catalogKeys.dashboard,
    queryFn:  catalogApi.dashboard,
    staleTime: STALE_5MIN,
  });
}

// ── Convenience: build a slug → definition map (used by canvas renderer) ────

export function indexShapes(defs: ShapeDefinition[]): Record<string, ShapeDefinition> {
  const out: Record<string, ShapeDefinition> = {};
  for (const def of defs) out[def.slug] = def;
  return out;
}
