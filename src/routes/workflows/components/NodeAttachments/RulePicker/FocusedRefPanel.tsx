import { X, FileWarning, ExternalLink } from "lucide-react";
import type { AttachableHtmlReference } from "@/interfaces/workflows";

interface FocusedRef {
  title: string;
  section: string;
  ref: AttachableHtmlReference;
}

interface FocusedRefPanelProps {
  focusedRef: FocusedRef | null;
  onClose: () => void;
}

export default function FocusedRefPanel({
  focusedRef,
  onClose,
}: FocusedRefPanelProps) {
  if (!focusedRef) return null;

  return (
    <div className="border-t border-border bg-amber-50/40 max-h-[28vh] overflow-y-auto">
      <div className="sticky top-0 z-10 px-4 py-2 bg-amber-50 border-b border-amber-200 shadow-sm flex items-center gap-2">
        <FileWarning className="h-3.5 w-3.5 text-amber-700" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold truncate">
            {focusedRef.title}{" "}
            <span className="text-muted-foreground font-normal">
              · {focusedRef.section}
            </span>
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {focusedRef.ref.doc_format} · anchor{" "}
            <span className="font-mono">{focusedRef.ref.anchor}</span>
          </p>
        </div>
        {focusedRef.ref.source_url && (
          <a
            href={focusedRef.ref.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[10px] text-indigo-700 hover:text-indigo-800"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        )}
        <button
          type="button"
          onClick={onClose}
          className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-amber-100 text-muted-foreground"
          aria-label="Hide source"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-4 py-2 text-[12px] leading-snug">
        {focusedRef.ref.snippet_html ? (
          <div
            className="prose prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1"
            dangerouslySetInnerHTML={{ __html: focusedRef.ref.snippet_html }}
          />
        ) : focusedRef.ref.snippet_text ? (
          <p className="whitespace-pre-wrap">{focusedRef.ref.snippet_text}</p>
        ) : (
          <p className="italic text-muted-foreground">
            No snippet captured for this reference.
          </p>
        )}
      </div>
    </div>
  );
}
