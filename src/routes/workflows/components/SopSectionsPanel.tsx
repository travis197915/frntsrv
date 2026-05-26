import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ShieldCheck, GitBranch, Tag, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { ingestApi, type SopSectionsResponse, type SopDecision, type SopRule } from '@/lib/api';
import { SopSectionsPanelLoading } from './SopGraphLoading';

interface SopSectionsPanelProps {
  jobId: string;
}

// ── Decision-type pill colors ─────────────────────────────────────────────────
const DECISION_TONE: Record<string, string> = {
  DENY:        'bg-red-50 text-red-700 border-red-200',
  ALLOW:       'bg-emerald-50 text-emerald-700 border-emerald-200',
  BYPASS:      'bg-blue-50 text-blue-700 border-blue-200',
  PEND:        'bg-amber-50 text-amber-700 border-amber-200',
  REFER:       'bg-violet-50 text-violet-700 border-violet-200',
  SYSTEM:      'bg-slate-100 text-slate-700 border-slate-200',
  STOP:        'bg-red-100 text-red-800 border-red-300',
  WAIVE:       'bg-emerald-100 text-emerald-800 border-emerald-300',
  CONDITIONAL: 'bg-slate-50 text-slate-600 border-slate-200',
  NOTE:        'bg-sky-50 text-sky-700 border-sky-200',
};

const CATEGORY_TONE: Record<string, string> = {
  PLATFORM:    'bg-slate-100 text-slate-700',
  AUDIENCE:    'bg-fuchsia-50 text-fuchsia-700',
  LOB:         'bg-indigo-50 text-indigo-700',
  ELIGIBILITY: 'bg-amber-50 text-amber-800',
  COVERAGE:    'bg-cyan-50 text-cyan-700',
  GENERAL:     'bg-stone-100 text-stone-700',
};

const CODE_TONE: Record<string, string> = {
  EOB:        'bg-pink-50 text-pink-700 border-pink-200',
  EX:         'bg-indigo-50 text-indigo-700 border-indigo-200',
  DENIAL:     'bg-red-50 text-red-700 border-red-200',
  SYSTEM_ACT: 'bg-blue-50 text-blue-700 border-blue-200',
  CPT:        'bg-emerald-50 text-emerald-700 border-emerald-200',
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({
  title, icon: Icon, count, color, defaultOpen, children,
}: {
  title: string; icon: React.ElementType; count: number; color: string;
  defaultOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors"
      >
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-xs font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-[10px] text-muted-foreground">({count})</span>
        <span className="ml-auto">
          {open
            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

// ── Code chip ─────────────────────────────────────────────────────────────────
function CodeChip({ code, type }: { code: string; type?: string }) {
  const tone = (type && CODE_TONE[type]) || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-block font-mono text-[10px] px-1.5 py-0.5 rounded border ${tone}`}>
      {code}
    </span>
  );
}

// ── Rule row (within a precondition) ──────────────────────────────────────────
function RuleRow({ r }: { r: SopRule }) {
  return (
    <tr className="border-t border-border align-top">
      <td className="py-1.5 px-2.5 text-[11px]">
        {r.condition ? <span>{r.condition}</span> : <span className="text-muted-foreground italic">—</span>}
      </td>
      <td className="py-1.5 px-2.5 text-[11px]">
        {r.action ? <span>{r.action}</span> : <span className="text-muted-foreground italic">—</span>}
      </td>
      <td className="py-1.5 px-2.5 text-[10px]">
        {r.decision_type && (
          <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[r.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {r.decision_type}
          </span>
        )}
      </td>
    </tr>
  );
}

// ── Decision row (within a step) ──────────────────────────────────────────────
function DecisionRow({ d }: { d: SopDecision }) {
  const codes = [
    ...d.eob_codes.map((c) => ({ c, t: 'EOB' })),
    ...d.ex_codes.map((c) => ({ c, t: 'EX' })),
    ...d.denial_codes.map((c) => ({ c, t: 'DENIAL' })),
    ...d.system_actions.map((c) => ({ c, t: 'SYSTEM_ACT' })),
  ];
  return (
    <tr className="border-t border-border align-top">
      <td className="py-1.5 px-2.5 text-[11px] w-[40%]">
        {d.condition_if || <span className="text-muted-foreground italic">—</span>}
        {d.condition_and && (
          <p className="text-[10px] text-muted-foreground mt-0.5">AND {d.condition_and}</p>
        )}
      </td>
      <td className="py-1.5 px-2.5 text-[11px]">
        {d.action_text || <span className="text-muted-foreground italic">—</span>}
        {d.action_summary && d.action_summary !== d.action_text && (
          <p className="text-[10px] text-muted-foreground mt-0.5 italic">{d.action_summary}</p>
        )}
      </td>
      <td className="py-1.5 px-2.5 text-[10px] whitespace-nowrap">
        <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[d.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
          {d.decision_type}
        </span>
        {d.is_final && <span className="ml-1 text-[10px] text-red-600">final</span>}
        {d.goto_step !== null && d.goto_step !== undefined && (
          <p className="text-[10px] text-muted-foreground mt-0.5">→ Step {d.goto_step}</p>
        )}
      </td>
      <td className="py-1.5 px-2.5 text-[10px]">
        {codes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {codes.map((x, i) => <CodeChip key={`${x.t}-${x.c}-${i}`} code={x.c} type={x.t} />)}
          </div>
        ) : (
          <span className="text-muted-foreground italic">—</span>
        )}
      </td>
    </tr>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────
export default function SopSectionsPanel({ jobId }: SopSectionsPanelProps) {
  const [data, setData] = useState<SopSectionsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    ingestApi.get<SopSectionsResponse>(`/${jobId}/sections/`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [jobId]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-destructive p-6">
        Failed to load sections: {error}
      </div>
    );
  }

  if (!data) {
    return <SopSectionsPanelLoading />;
  }

  return (
    <div className="h-full overflow-y-auto bg-card">
      {/* Header */}
      <div className="sticky top-0 z-10 p-3 border-b border-border bg-card shadow-sm">
        <h2 className="text-sm font-semibold truncate">{data.title || 'SOP'}</h2>
        {data.summary && (
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{data.summary}</p>
        )}
        {(data.platform || data.lob.length > 0) && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {data.platform && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {data.platform}
              </span>
            )}
            {data.lob.map((l) => (
              <span key={l} className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Pre-conditions */}
      <Section title="Pre-conditions" icon={ShieldCheck} count={data.preconditions.length}
               color="text-amber-600" defaultOpen>
        <div className="space-y-2.5">
          {data.preconditions.map((pc) => (
            <div key={pc.id} className="rounded border border-border bg-background">
              <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border bg-muted/40">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_TONE[pc.category] || 'bg-stone-100 text-stone-700'}`}>
                  {pc.category}
                </span>
                <span className="text-xs font-medium truncate flex-1">{pc.label}</span>
                {pc.is_blocking && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                    blocking
                  </span>
                )}
              </div>
              {pc.content_text && (
                <p className="text-[11px] text-muted-foreground px-2.5 py-1.5">
                  {pc.content_text}
                </p>
              )}
              {pc.rules.length > 0 && (
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                      <th className="text-left px-2.5 py-1 font-semibold w-[42%]">Condition</th>
                      <th className="text-left px-2.5 py-1 font-semibold">Action</th>
                      <th className="text-left px-2.5 py-1 font-semibold w-[80px]">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pc.rules.map((r, i) => <RuleRow key={i} r={r} />)}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Decision Tree (steps) */}
      <Section title="Decision Tree" icon={GitBranch} count={data.steps.length}
               color="text-blue-600" defaultOpen>
        <div className="space-y-3">
          {data.steps.map((step) => (
            <div key={step.step_number} className="rounded border border-border bg-background">
              <div className="px-2.5 py-1.5 border-b border-border bg-muted/40 flex items-center gap-2">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-mono">
                  Step {step.step_number}
                </span>
                <p className="text-xs font-medium flex-1 truncate">{step.question || '(no question)'}</p>
                {step.is_terminal && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700">
                    terminal
                  </span>
                )}
              </div>
              {step.intro_text && (
                <p className="text-[11px] text-muted-foreground px-2.5 py-1.5">{step.intro_text}</p>
              )}
              {step.decisions.length > 0 && (
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                      <th className="text-left px-2.5 py-1 font-semibold">If</th>
                      <th className="text-left px-2.5 py-1 font-semibold">Then</th>
                      <th className="text-left px-2.5 py-1 font-semibold w-[88px]">Type</th>
                      <th className="text-left px-2.5 py-1 font-semibold w-[140px]">Codes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {step.decisions.map((d) => <DecisionRow key={d.row_index} d={d} />)}
                  </tbody>
                </table>
              )}
              {step.terminal_action && (
                <p className="text-[11px] text-red-700 font-medium px-2.5 py-1.5 bg-red-50">
                  Terminal action: {step.terminal_action}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Codes */}
      <Section title="Claims Codes" icon={Tag} count={data.codes.length} color="text-pink-600">
        {data.codes.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="text-left px-2 py-1 font-semibold w-[80px]">Type</th>
                <th className="text-left px-2 py-1 font-semibold w-[110px]">Code</th>
                <th className="text-left px-2 py-1 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              {data.codes.map((c, i) => (
                <tr key={`${c.type}-${c.value}-${i}`} className="border-t border-border">
                  <td className="px-2 py-1 text-[10px]">
                    <span className={`inline-block px-1.5 py-0.5 rounded border ${CODE_TONE[c.type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="px-2 py-1 font-mono text-[11px]">{c.value}</td>
                  <td className="px-2 py-1 text-[11px] text-muted-foreground">
                    {c.description || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Group limits (only show if any) */}
      {data.group_limits.length > 0 && (
        <Section title="Group Limits" icon={Tag} count={data.group_limits.length} color="text-purple-600">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/30">
                <th className="text-left px-2 py-1 font-semibold">Group</th>
                <th className="text-left px-2 py-1 font-semibold w-[60px]">INN</th>
                <th className="text-left px-2 py-1 font-semibold w-[60px]">OON</th>
                <th className="text-left px-2 py-1 font-semibold w-[60px]">Basis</th>
              </tr>
            </thead>
            <tbody>
              {data.group_limits.map((g, i) => (
                <tr key={i} className="border-t border-border text-[11px]">
                  <td className="px-2 py-1 font-medium">{g.group_name}</td>
                  <td className="px-2 py-1">{g.inn_days ?? '—'}{g.inn_days ? 'd' : ''}</td>
                  <td className="px-2 py-1">{g.oon_days ?? '—'}{g.oon_days ? 'd' : ''}</td>
                  <td className="px-2 py-1 text-[10px] text-muted-foreground">{g.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Annotations */}
      {data.annotations.length > 0 && (
        <Section title="Notes & Alerts" icon={AlertTriangle} count={data.annotations.length}
                 color="text-orange-600">
          <ul className="space-y-1.5">
            {data.annotations.map((a, i) => (
              <li key={i} className="text-[11px] border-l-2 border-orange-300 bg-orange-50/40 px-2 py-1 rounded-r">
                <span className="text-[10px] uppercase font-semibold text-orange-700 mr-1.5">{a.type}</span>
                {a.content_text}
                {a.step_number !== null && (
                  <span className="text-[10px] text-muted-foreground ml-1.5">(Step {a.step_number})</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* References */}
      {data.references.length > 0 && (
        <Section title="References" icon={LinkIcon} count={data.references.length}
                 color="text-emerald-600">
          <ul className="space-y-1">
            {data.references.map((r, i) => (
              <li key={i} className="text-[11px] flex items-center gap-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                  {r.ref_type}
                </span>
                {r.ref_url ? (
                  <a href={r.ref_url} target="_blank" rel="noreferrer"
                     className="text-blue-600 hover:underline truncate">
                    {r.ref_text || r.ref_url}
                  </a>
                ) : (
                  <span className="truncate">{r.ref_text}</span>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
