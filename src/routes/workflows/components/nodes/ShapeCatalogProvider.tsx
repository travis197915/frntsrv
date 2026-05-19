/**
 * Tiny context that fetches the Django shape catalog once and serves it to
 * every node on the canvas + the palette + the inspector.  Without this,
 * each node would re-fetch independently and we'd thrash the network.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  catalogApi,
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
  const [categories, setCategories] = useState<ShapeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    catalogApi.categories()
      .then((cats) => {
        if (!cancelled) {
          setCategories(cats);
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
  }, [bump]);

  const value = useMemo<CatalogValue>(() => {
    const shapes = categories.flatMap((c) => c.shapes);
    return {
      loading,
      error,
      categories,
      shapes,
      bySlug: indexShapes(shapes),
      refetch: () => setBump((n) => n + 1),
    };
  }, [categories, loading, error]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useShapeCatalog = () => useContext(Ctx);
