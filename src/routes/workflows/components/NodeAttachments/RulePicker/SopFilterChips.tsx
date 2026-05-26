import { BookOpen } from "lucide-react";

interface SopSummary {
  sop_id: number;
  title: string;
  narrative: string;
  ruleCount: number;
}

interface SopFilterChipsProps {
  availableSops: SopSummary[];
  totalRuleCount: number;
  sopFilter: number | null;
  onSetSopFilter: (id: number | null) => void;
}

export default function SopFilterChips({
  availableSops,
  totalRuleCount,
  sopFilter,
  onSetSopFilter,
}: SopFilterChipsProps) {
  return (
    <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-1.5 overflow-x-auto">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 mr-1">
        SOP
      </span>
      <button
        type="button"
        onClick={() => onSetSopFilter(null)}
        className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
          sopFilter === null
            ? "bg-indigo-600 text-white border-indigo-600"
            : "bg-background border-border text-muted-foreground hover:border-indigo-300"
        }`}
      >
        All ({totalRuleCount})
      </button>
      {availableSops.map((s) => {
        const active = sopFilter === s.sop_id;
        return (
          <button
            key={s.sop_id}
            type="button"
            title={s.narrative || s.title}
            onClick={() => onSetSopFilter(active ? null : s.sop_id)}
            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap max-w-[260px] transition-colors ${
              active
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-background border-border text-foreground hover:border-indigo-300"
            }`}
          >
            <BookOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">{s.title}</span>
            <span
              className={`text-[10px] ${active ? "text-indigo-100" : "text-muted-foreground"}`}
            >
              ({s.ruleCount})
            </span>
          </button>
        );
      })}
    </div>
  );
}
