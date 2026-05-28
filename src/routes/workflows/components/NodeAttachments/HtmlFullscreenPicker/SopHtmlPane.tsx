import { type RefObject } from "react";
import { FileText } from "lucide-react";
import type { SopHtmlState } from "./types";

const HTML_VIEW_STYLES = `
  .fsp-html-view table {
    border-collapse: collapse !important;
    width: 100% !important;
  }
  .fsp-html-view table td,
  .fsp-html-view table th {
    padding: 6px 10px !important;
    vertical-align: top !important;
    border: 1px solid rgba(148, 163, 184, 0.25) !important;
  }
  .fsp-html-view table th {
    background: rgba(99, 102, 241, 0.06) !important;
    font-weight: 600 !important;
  }
  .fsp-html-view h1, .fsp-html-view h2, .fsp-html-view h3,
  .fsp-html-view h4, .fsp-html-view h5, .fsp-html-view h6 {
    font-weight: 700 !important;
    margin-top: 1.5rem !important;
    margin-bottom: 0.5rem !important;
    color: #1e1b4b !important;
  }
  .fsp-html-view h1 { font-size: 1.25rem !important; }
  .fsp-html-view h2 { font-size: 1.1rem !important; }
  .fsp-html-view h3 { font-size: 1rem !important; }
  .fsp-html-view p  { margin-bottom: 0.6rem !important; }
  .fsp-html-view ul, .fsp-html-view ol {
    padding-left: 1.5rem !important;
    margin-bottom: 0.6rem !important;
  }
  /* Rule highlight — applied programmatically via classList */
  .fsp-rule-highlight {
    background-color: rgba(99, 102, 241, 0.10) !important;
    outline: 2px solid rgba(99, 102, 241, 0.55) !important;
    outline-offset: 3px;
    border-radius: 4px;
    transition: background-color 0.25s, outline 0.25s;
  }
  /* Table rows don't support outline/border-radius — highlight via <td> cells */
  tr.fsp-rule-highlight {
    outline: none !important;
  }
  tr.fsp-rule-highlight td, tr.fsp-rule-highlight th {
    background-color: rgba(99, 102, 241, 0.13) !important;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.55);
    transition: background-color 0.25s;
  }
  /* One-shot pulse when the user clicks "Source" on a rule */
  @keyframes fspFocusPulse {
    0%   { background-color: rgba(99, 102, 241, 0.40) !important; outline-color: rgba(99, 102, 241, 1) !important; }
    100% { background-color: rgba(99, 102, 241, 0.18) !important; outline-color: rgba(99, 102, 241, 0.70) !important; }
  }
  @keyframes fspFocusPulseTd {
    0%   { background-color: rgba(99, 102, 241, 0.50) !important; box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 1); }
    100% { background-color: rgba(99, 102, 241, 0.18) !important; box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.70); }
  }
  .fsp-rule-focused {
    background-color: rgba(99, 102, 241, 0.18) !important;
    outline: 2px solid rgba(99, 102, 241, 0.85) !important;
    outline-offset: 3px;
    border-radius: 4px;
    animation: fspFocusPulse 1.8s ease-out;
  }
  tr.fsp-rule-focused {
    outline: none !important;
  }
  tr.fsp-rule-focused td, tr.fsp-rule-focused th {
    background-color: rgba(99, 102, 241, 0.18) !important;
    box-shadow: inset 0 0 0 2px rgba(99, 102, 241, 0.85);
    animation: fspFocusPulseTd 1.8s ease-out;
  }
  .sop-synthesised-notice {
    margin-bottom: 1rem;
    padding: 0.5rem 0.75rem;
    border-radius: 0.375rem;
    background: #fef3c7;
    border: 1px solid #fcd34d;
    font-size: 0.75rem;
    color: #92400e;
  }
`;

interface Props {
  activeSopId: number | null;
  sopHtml: SopHtmlState;
  containerRef: RefObject<HTMLDivElement | null>;
  htmlPaneRef: RefObject<HTMLDivElement | null>;
}

export default function SopHtmlPane({ activeSopId, sopHtml, containerRef, htmlPaneRef }: Props) {
  return (
    <div ref={htmlPaneRef} className="flex-1 overflow-y-auto bg-white min-h-0">
      {activeSopId === null ? (
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
          <div className="h-20 w-20 rounded-2xl bg-muted/40 flex items-center justify-center">
            <FileText className="h-10 w-10 opacity-25" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Select a SOP to view its source document</p>
            <p className="text-xs text-muted-foreground mt-1">
              The full source HTML will appear here so you can read context while picking rules.
            </p>
          </div>
        </div>
      ) : sopHtml.loading ? (
        <div className="p-10 flex items-center gap-3 text-sm text-muted-foreground">
          <div className="h-4 w-4 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
          Loading source document…
        </div>
      ) : sopHtml.err && !sopHtml.html ? (
        <div className="p-10 text-sm text-muted-foreground max-w-md">
          <FileText className="h-8 w-8 opacity-30 mb-3" />
          <p className="font-medium">Source HTML unavailable</p>
          <p className="mt-1 text-xs leading-relaxed">{sopHtml.err}</p>
          {sopHtml.sourceUrl && (
            <p className="mt-2 text-[10px] text-muted-foreground/70 font-mono break-all">
              Tried: {sopHtml.sourceUrl}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground/80">
            You can still select rules from the list on the left.
          </p>
        </div>
      ) : sopHtml.html ? (
        <>
          <style>{HTML_VIEW_STYLES}</style>
          <div className="sticky top-0 z-10 px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-[12px] text-slate-600">
            <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="flex-1">
              {sopHtml.isFallback
                ? "Structured content · synthesised from ingestion data"
                : "Source document · read-only preview"}
              {sopHtml.source && (
                <span className="ml-2 text-[10px] font-mono text-slate-400">
                  [{sopHtml.source}]
                </span>
              )}
            </span>
            {sopHtml.sourceUrl && (
              <a
                href={sopHtml.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 text-[11px]"
              >
                Open original ↗
              </a>
            )}
          </div>
          <div
            ref={containerRef}
            className="fsp-html-view px-8 py-6 text-[13.5px] leading-relaxed"
            dangerouslySetInnerHTML={{ __html: sopHtml.html }}
          />
        </>
      ) : null}
    </div>
  );
}
