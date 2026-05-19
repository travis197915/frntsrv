/**
 * Hooks + helpers around the Django catalog endpoints.
 *
 * The whole point: nothing in the UI is hardcoded.  Palette items, sidebar
 * entries, dashboard tiles, and per-shape inspector forms all live in the
 * Django `builder` app and arrive here as plain JSON.
 *
 *   GET /catalog/categories/       → palette grouped by category
 *   GET /catalog/shapes/           → flat list of every palette item
 *   GET /catalog/shapes/:slug/     → one shape definition
 *   GET /ui/navigation/            → sidebar entries
 *   GET /ui/dashboard/             → dashboard tiles
 */

import { useEffect, useState } from 'react';

import {
  api,
  type DashboardWidget,
  type NavItem,
  type ShapeCategory,
  type ShapeDefinition,
} from './api';

// ── One-shot fetchers ───────────────────────────────────────────────────────

export const catalogApi = {
  categories:   () => api.get<ShapeCategory[]>('/catalog/categories/'),
  shapes:       () => api.get<ShapeDefinition[]>('/catalog/shapes/'),
  shape:        (slug: string) => api.get<ShapeDefinition>(`/catalog/shapes/${slug}/`),
  navigation:   () => api.get<NavItem[]>('/ui/navigation/'),
  dashboard:    () => api.get<DashboardWidget[]>('/ui/dashboard/'),
};

// ── React-friendly cached lookups ───────────────────────────────────────────

type AsyncResult<T> = { data: T | null; loading: boolean; error: Error | null };

function useFetched<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fn()
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, loading, error };
}

export const useShapeCategories = () => useFetched(catalogApi.categories);
export const useShapeDefinitions = () => useFetched(catalogApi.shapes);
export const useNavigation = () => useFetched(catalogApi.navigation);
export const useDashboard = () => useFetched(catalogApi.dashboard);

// ── Convenience: build a slug → definition map (used by canvas renderer) ────

export function indexShapes(defs: ShapeDefinition[]): Record<string, ShapeDefinition> {
  const out: Record<string, ShapeDefinition> = {};
  for (const def of defs) out[def.slug] = def;
  return out;
}
