import type { QueryClient, QueryKey } from "@tanstack/react-query";

export interface PageInfo {
  hasNextPage: boolean;
  cursor: string | null;
  totalCount?: number;
}

export interface PaginatedList<T> {
  nodes: T[];
  pageInfo?: PageInfo;
}

/** Fetch the next cursor page and append its nodes into an existing query cache. */
export async function appendCursorPage<T>({
  queryClient,
  queryKey,
  cursor,
  fetchPage,
}: {
  queryClient: QueryClient;
  queryKey: QueryKey;
  cursor: string | null | undefined;
  fetchPage: (cursor: string) => Promise<PaginatedList<T>>;
}): Promise<void> {
  if (!cursor) return;

  const next = await fetchPage(cursor);
  queryClient.setQueryData<PaginatedList<T>>(queryKey, (prev) =>
    prev && next
      ? { ...next, nodes: [...prev.nodes, ...next.nodes] }
      : prev,
  );
}

/** Build URLSearchParams for list endpoints — skips empty / undefined values. */
export function buildListQuery(
  params: Record<string, string | number | undefined>,
): URLSearchParams {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") q.set(key, String(value));
  }
  return q;
}
