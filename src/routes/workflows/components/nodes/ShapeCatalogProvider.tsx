/**
 * Tiny context that fetches the Django shape catalog once and serves it to
 * every node on the canvas + the palette + the inspector.  Without this,
 * each node would re-fetch independently and we'd thrash the network.
 *
 * Uses TanStack Query so the catalog is cached, deduplicated, and refetchable
 * via invalidateQueries rather than a manual bump counter.
 */
import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  catalogApi,
  catalogKeys,
  indexShapes,
} from '@/lib/catalogApi';
import type { ShapeCategory, ShapeDefinition } from '@/lib/api';

interface CatalogValue {
  loading: boolean;
  error: Error | null;
  categories: ShapeCategory[];
  shapes: ShapeDefinition[];
  bySlug: Record<string, ShapeDefinition>;
  refetch: () => void;
}

const empty: CatalogValue = {
  loading: true,
  error: null,
  categories: [],
  shapes: [],
  bySlug: {},
  refetch: () => undefined,
};

const Ctx = createContext<CatalogValue>(empty);

export function ShapeCatalogProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const {
    data: categories = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: catalogKeys.categories,
    queryFn: catalogApi.categories,
    staleTime: 5 * 60_000,
  });

  const value = useMemo<CatalogValue>(() => {
    const shapes = categories.flatMap((c) => c.shapes);
    return {
      loading,
      error: (error as Error | null) ?? null,
      categories,
      shapes,
      bySlug: indexShapes(shapes),
      refetch: () => qc.invalidateQueries({ queryKey: catalogKeys.categories }),
    };
  }, [loading, error, categories, qc]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShapeCatalog = () => useContext(Ctx);
