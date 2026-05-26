import { FileText } from "lucide-react";
import type { SopSourceHtmlResponse } from "@/interfaces/sop";

interface HtmlPaneProps {
  htmlPaneRef: React.RefObject<HTMLDivElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  step: "pick" | "review";
  loading: boolean;
  err: string | null;
  data: SopSourceHtmlResponse | null;
  sopId: number;
}

export default function HtmlPane({
  htmlPaneRef,
  containerRef,
  step,
  loading,
  err,
  data,
  sopId,
}: HtmlPaneProps) {
  return (
    <div
      ref={htmlPaneRef}
      className={`overflow-y-auto bg-white transition-all min-h-0 ${
        step === "review" ? "flex-1 border-r border-border" : "flex-1"
      }`}
    >
      {loading ? (
        <div className="p-10 text-sm text-muted-foreground">
          Loading source HTML…
        </div>
      ) : err ? (
        <div className="p-10 text-sm text-destructive">Failed: {err}</div>
      ) : !data?.available ? (
        <div className="p-10 text-sm text-muted-foreground">
          Source HTML unavailable {data?.reason ? `(${data.reason})` : ""}. This
          SOP was ingested from a non-HTTP source (e.g. DOCX upload). Use the{" "}
          <b>List view</b> picker instead.
        </div>
      ) : (
        <>
          <style>{`
            .sop-readonly, .sop-readonly * { cursor: default; }
            .sop-readonly table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .sop-readonly table td,
            .sop-readonly table th {
              padding: 6px 10px !important;
              vertical-align: top !important;
              border-bottom: 1px dashed rgba(148, 163, 184, 0.30) !important;
            }
            .sop-readonly .excl-marked {
              background-color: rgba(244, 63, 94, 0.18) !important;
              outline: 2px solid #f43f5e !important;
              outline-offset: 1px;
              box-shadow: inset 0 0 0 9999px rgba(244, 63, 94, 0.08) !important;
            }
            .sop-readonly .excl-flash {
              animation: exclFlashFs 1200ms ease-out;
            }
            @keyframes exclFlashFs {
              0%   { background-color: rgba(244, 63, 94, 0.50) !important;
                     box-shadow: 0 0 0 6px rgba(244, 63, 94, 0.50) !important; }
              100% { background-color: rgba(244, 63, 94, 0.18) !important; }
            }
          `}</style>
          {step === "review" && (
            <div className="sticky top-0 z-10 px-6 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-[12px] text-slate-700">
              <FileText className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                Read-only preview · excluded elements stay highlighted in rose.
                Use the right panel to remove or add exclusions.
              </span>
            </div>
          )}
          <div
            ref={containerRef}
            className="sop-readonly px-6 py-5 text-[13.5px] leading-relaxed"
            key={`${sopId}:${data.html.length}`}
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        </>
      )}
    </div>
  );
}
