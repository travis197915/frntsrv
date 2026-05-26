import { useState } from "react";
import { sopExclusionsApi } from "@/lib/api";
import type { SopHtmlBlock } from "@/interfaces/sop";

interface UseHtmlBlocksResult {
  htmlBlocksBySop: Record<number, SopHtmlBlock[]>;
  setHtmlBlocksBySop: React.Dispatch<
    React.SetStateAction<Record<number, SopHtmlBlock[]>>
  >;
  htmlBlocksLoading: Record<number, boolean>;
  htmlBlocksError: Record<number, string | null>;
  loadHtmlBlocks: (sopId: number, force?: boolean) => Promise<void>;
}

export function useHtmlBlocks(): UseHtmlBlocksResult {
  const [htmlBlocksBySop, setHtmlBlocksBySop] = useState<
    Record<number, SopHtmlBlock[]>
  >({});
  const [htmlBlocksLoading, setHtmlBlocksLoading] = useState<
    Record<number, boolean>
  >({});
  const [htmlBlocksError, setHtmlBlocksError] = useState<
    Record<number, string | null>
  >({});

  const loadHtmlBlocks = async (sopId: number, force = false) => {
    if (!force && htmlBlocksBySop[sopId]) return;
    setHtmlBlocksLoading((p) => ({ ...p, [sopId]: true }));
    setHtmlBlocksError((p) => ({ ...p, [sopId]: null }));
    try {
      const r = await sopExclusionsApi.listHtmlBlocks(sopId);
      setHtmlBlocksBySop((prev) => ({ ...prev, [sopId]: r.blocks }));
    } catch (e) {
      setHtmlBlocksError((p) => ({
        ...p,
        [sopId]: String((e as Error)?.message ?? e),
      }));
    } finally {
      setHtmlBlocksLoading((p) => ({ ...p, [sopId]: false }));
    }
  };

  return {
    htmlBlocksBySop,
    setHtmlBlocksBySop,
    htmlBlocksLoading,
    htmlBlocksError,
    loadHtmlBlocks,
  };
}
