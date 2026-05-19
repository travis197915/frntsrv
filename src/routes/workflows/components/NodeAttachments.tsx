import { useEffect, useMemo, useState } from 'react';
import { Plus, X, FileText, Search, Wrench, ShieldCheck, GitBranch, Link2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  workflowsApi,
  type AttachableSopRule,
  type WorkflowAttachable,
} from '@/lib/workflowsApi';

// ── Persisted shape ──────────────────────────────────────────────────────────
// Saved on `Shape.properties.sop_rules` and `.tool_calls`.
// We embed display labels so the chip can render even when the SOP is
// deleted or re-ingested.

export interface AttachedSopRule {
  key: string;
  sop_id: number;
  sop_title: string;
  source: 'precondition' | 'decision';
  section_label: string;
  /** Narrative paragraph for the parent section, copied at attach-time. */
  section_narrative?: string;
  condition: string;
  action: string;
  decision_type: string;
  codes: string[];
}

export interface AttachedTool {
  key: string;
  endpoint_id: string;
  name: string;
  method: string;
  url: string;
}

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

// ── Picker dialog ────────────────────────────────────────────────────────────

interface RulePickerProps {
  workflowId: string;
  selectedKeys: Set<string>;
  onClose: () => void;
  onSave: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
}

function RulePicker({ workflowId, selectedKeys, onClose, onSave }: RulePickerProps) {
  const [data, setData] = useState<WorkflowAttachable | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'rules' | 'tools'>('rules');
  const [picked, setPicked] = useState<Set<string>>(new Set(selectedKeys));
  /** Filter rules by a specific SOP. `null` = show all. */
  const [sopFilter, setSopFilter] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    workflowsApi.getAttachable(workflowId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setErr(String(e?.message ?? e)); });
    return () => { cancelled = true; };
  }, [workflowId]);

  /** All SOPs available for filtering — derived from data.sops if present,
   *  otherwise from the rules themselves so the chip row works even when
   *  the backend doesn't return the convenience list. */
  const availableSops = useMemo(() => {
    if (!data) return [] as { sop_id: number; title: string; narrative: string; ruleCount: number }[];
    const counts = new Map<number, number>();
    for (const r of data.sop_rules) counts.set(r.sop_id, (counts.get(r.sop_id) ?? 0) + 1);
    if (data.sops && data.sops.length > 0) {
      return data.sops.map((s) => ({
        sop_id: s.sop_id, title: s.title, narrative: s.narrative || '',
        ruleCount: counts.get(s.sop_id) ?? 0,
      }));
    }
    const seen = new Map<number, { sop_id: number; title: string; narrative: string; ruleCount: number }>();
    for (const r of data.sop_rules) {
      if (!seen.has(r.sop_id)) {
        seen.set(r.sop_id, { sop_id: r.sop_id, title: r.sop_title, narrative: '', ruleCount: counts.get(r.sop_id) ?? 0 });
      }
    }
    return Array.from(seen.values());
  }, [data]);

  /** Rules grouped first by SOP, then by section.  When `sopFilter` is set,
   *  only that SOP's groups appear. */
  const groupedBySop = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();

    const matchesQuery = (r: AttachableSopRule) =>
      !q ||
      r.condition.toLowerCase().includes(q) ||
      r.action.toLowerCase().includes(q) ||
      r.section_label.toLowerCase().includes(q) ||
      r.section_narrative.toLowerCase().includes(q) ||
      r.sop_title.toLowerCase().includes(q) ||
      r.codes.some((c) => c.toLowerCase().includes(q));

    const filtered = data.sop_rules.filter((r) =>
      (sopFilter === null || r.sop_id === sopFilter) && matchesQuery(r),
    );

    type Section = { id: string; sectionKey: string; narrative: string; rules: AttachableSopRule[] };
    type SopGroup = { sop_id: number; title: string; narrative: string; sections: Section[] };

    const bySop = new Map<number, SopGroup>();
    for (const r of filtered) {
      let sg = bySop.get(r.sop_id);
      if (!sg) {
        const meta = availableSops.find((s) => s.sop_id === r.sop_id);
        sg = {
          sop_id:    r.sop_id,
          title:     r.sop_title,
          narrative: meta?.narrative || '',
          sections:  [],
        };
        bySop.set(r.sop_id, sg);
      }
      const sectionId = `${r.sop_id}::${r.source}::${r.section_label}`;
      let section = sg.sections.find((s) => s.id === sectionId);
      if (!section) {
        section = {
          id: sectionId,
          sectionKey: `${r.source === 'precondition' ? 'Pre-condition' : 'Decision'} · ${r.section_label}`,
          narrative: r.section_narrative || '',
          rules: [],
        };
        sg.sections.push(section);
      }
      section.rules.push(r);
    }
    return Array.from(bySop.values());
  }, [data, query, sopFilter, availableSops]);

  const filteredTools = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.tool_calls;
    return data.tool_calls.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.url.toLowerCase().includes(q) ||
      t.method.toLowerCase().includes(q));
  }, [data, query]);

  // Index every rule by key so we can resolve `references` transitively.
  const ruleByKey = useMemo(() => {
    const m = new Map<string, AttachableSopRule>();
    if (data) for (const r of data.sop_rules) m.set(r.key, r);
    return m;
  }, [data]);

  /** Walk the `references` graph from `start`, collecting every reachable key. */
  const expandReferences = (start: string): string[] => {
    const visited = new Set<string>();
    const stack = [start];
    while (stack.length) {
      const k = stack.pop()!;
      if (visited.has(k)) continue;
      visited.add(k);
      const r = ruleByKey.get(k);
      if (r?.references?.length) {
        for (const ref of r.references) if (!visited.has(ref)) stack.push(ref);
      }
    }
    return Array.from(visited);
  };

  const toggle = (key: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Deselect just this one — don't surprise the user by cascading off.
        next.delete(key);
      } else {
        // Select this + everything it transitively depends on.
        for (const k of expandReferences(key)) next.add(k);
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!data) return;
    const rules: AttachedSopRule[] = data.sop_rules
      .filter((r) => picked.has(r.key))
      .map((r) => ({
        key: r.key,
        sop_id: r.sop_id,
        sop_title: r.sop_title,
        source: r.source,
        section_label: r.section_label,
        section_narrative: r.section_narrative || '',
        condition: r.condition,
        action: r.action,
        decision_type: r.decision_type,
        codes: r.codes,
      }));
    const tools: AttachedTool[] = data.tool_calls
      .filter((t) => picked.has(t.key))
      .map((t) => ({
        key: t.key,
        endpoint_id: t.endpoint_id,
        name: t.name,
        method: t.method,
        url: t.url,
      }));
    onSave(rules, tools);
    onClose();
  };

  const ruleCount = useMemo(
    () => Array.from(picked).filter((k) => k.startsWith('pre:') || k.startsWith('step:')).length,
    [picked],
  );
  const toolCount = useMemo(
    () => Array.from(picked).filter((k) => k.startsWith('agent:')).length,
    [picked],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="bg-card rounded-lg shadow-xl w-full max-w-3xl h-[80vh] flex flex-col overflow-hidden"
           onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold">Attach rules &amp; tools to this node</h2>
          <button onClick={onClose}
                  className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs + search */}
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border bg-muted/40 p-0.5 text-xs">
            <button onClick={() => setTab('rules')}
                    className={`px-3 py-1 rounded ${tab === 'rules' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              SOP Rules {data && <span className="text-[10px] text-muted-foreground">({data.sop_rules.length})</span>}
            </button>
            <button onClick={() => setTab('tools')}
                    className={`px-3 py-1 rounded ${tab === 'tools' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground'}`}>
              Tool Calls {data && <span className="text-[10px] text-muted-foreground">({data.tool_calls.length})</span>}
            </button>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tab === 'rules' ? 'Search rules, sections, codes…' : 'Search tools…'}
              className="h-8 pl-8 text-xs"
            />
          </div>
        </div>

        {/* SOP filter chips — only on the rules tab and when ≥ 1 SOP is linked */}
        {data && tab === 'rules' && availableSops.length > 0 && (
          <div className="px-4 py-2 border-b border-border bg-muted/10 flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0 mr-1">
              SOP
            </span>
            <button
              type="button"
              onClick={() => setSopFilter(null)}
              className={`text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
                sopFilter === null
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-background border-border text-muted-foreground hover:border-indigo-300'
              }`}
            >
              All ({data.sop_rules.length})
            </button>
            {availableSops.map((s) => {
              const active = sopFilter === s.sop_id;
              return (
                <button
                  key={s.sop_id}
                  type="button"
                  title={s.narrative || s.title}
                  onClick={() => setSopFilter(active ? null : s.sop_id)}
                  className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border whitespace-nowrap max-w-[260px] transition-colors ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-background border-border text-foreground hover:border-indigo-300'
                  }`}
                >
                  <BookOpen className="h-3 w-3 shrink-0" />
                  <span className="truncate">{s.title}</span>
                  <span className={`text-[10px] ${active ? 'text-indigo-100' : 'text-muted-foreground'}`}>
                    ({s.ruleCount})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {err && <div className="p-4 text-sm text-destructive">Failed: {err}</div>}
          {!data && !err && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}

          {data && tab === 'rules' && (
            <div className="divide-y divide-border">
              {groupedBySop.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No matching rules. {availableSops.length === 0
                    ? 'Attach an SOP to this workflow first.'
                    : 'Try a different SOP or search term.'}
                </div>
              )}
              {groupedBySop.map((sop) => (
                <div key={sop.sop_id}>
                  {/* SOP header — one per SOP, sticky */}
                  <div className="px-4 py-2 bg-indigo-50/60 sticky top-0 z-20 border-b border-indigo-100 flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-indigo-900 truncate">{sop.title}</p>
                      {sop.narrative && (
                        <p className="text-[11px] text-indigo-900/70 italic mt-0.5 line-clamp-2">
                          {sop.narrative}
                        </p>
                      )}
                    </div>
                  </div>

                  {sop.sections.map((g) => (
                    <div key={g.id}>
                      <div className="px-4 py-1.5 bg-muted/30 sticky top-[52px] z-10 flex items-center gap-2 border-b border-border/60">
                        {g.sectionKey.startsWith('Pre-condition')
                          ? <ShieldCheck className="h-3 w-3 text-amber-600" />
                          : <GitBranch className="h-3 w-3 text-blue-600" />}
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          {g.sectionKey}
                        </span>
                      </div>
                      {g.narrative && (
                        <p className="px-4 pt-2 pb-1.5 text-[11px] leading-snug text-muted-foreground italic bg-muted/10 border-b border-border">
                          {g.narrative}
                        </p>
                      )}
                      {g.rules.map((r) => {
                        const isSelected = picked.has(r.key);
                        return (
                          <button
                            key={r.key}
                            type="button"
                            onClick={() => toggle(r.key)}
                            className={`w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors flex items-start gap-3 ${isSelected ? 'bg-blue-50/40' : ''}`}
                          >
                            <input
                              type="checkbox" checked={isSelected} readOnly
                              className="mt-0.5 h-3.5 w-3.5 rounded border-input shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[r.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                                  {r.decision_type || '—'}
                                </span>
                                {r.codes.slice(0, 4).map((c) => (
                                  <span key={c} className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    {c}
                                  </span>
                                ))}
                                {r.references.length > 0 && (
                                  <span
                                    title={`Picking this will also attach ${r.references.length} linked rule${r.references.length === 1 ? '' : 's'}${r.goto_step !== null ? ` (Step ${r.goto_step})` : ''}.`}
                                    className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  >
                                    <Link2 className="h-2.5 w-2.5" />
                                    +{r.references.length} linked
                                    {r.goto_step !== null && ` · Step ${r.goto_step}`}
                                  </span>
                                )}
                              </div>
                              {r.condition && (
                                <p className="text-[11px] mt-1">
                                  <span className="text-muted-foreground font-medium">If </span>
                                  {r.condition}
                                </p>
                              )}
                              {r.action && (
                                <p className="text-[11px] mt-0.5">
                                  <span className="text-muted-foreground font-medium">Then </span>
                                  {r.action}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {data && tab === 'tools' && (
            <div className="divide-y divide-border">
              {filteredTools.length === 0 && (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  No runtime tools registered. Add them via the workflow context panel.
                </div>
              )}
              {filteredTools.map((t) => {
                const isSelected = picked.has(t.key);
                return (
                  <button key={t.key} type="button" onClick={() => toggle(t.key)}
                          className={`w-full text-left px-4 py-2 hover:bg-muted/40 transition-colors flex items-start gap-3 ${isSelected ? 'bg-blue-50/40' : ''}`}>
                    <input type="checkbox" checked={isSelected} readOnly
                           className="mt-0.5 h-3.5 w-3.5 rounded border-input shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {t.method}
                        </span>
                        <span className="text-xs font-medium truncate">{t.name || '(unnamed)'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                        {t.url}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">
            {ruleCount} rule{ruleCount === 1 ? '' : 's'} · {toolCount} tool{toolCount === 1 ? '' : 's'} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button size="sm" onClick={handleSave}>Save attachments</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Attached rule card (chip + collapsible narrative) ────────────────────────

function AttachedRuleCard({
  rule, onRemove,
}: { rule: AttachedSopRule; onRemove: (key: string) => void }) {
  const [showCtx, setShowCtx] = useState(false);
  return (
    <li className="border border-border rounded p-2 bg-muted/30">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] ${DECISION_TONE[rule.decision_type] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
              {rule.decision_type || '—'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {rule.section_label}
            </span>
            {rule.codes.slice(0, 3).map((c) => (
              <span key={c} className="font-mono text-[10px] px-1 rounded bg-slate-100 text-slate-700">
                {c}
              </span>
            ))}
          </div>
          {rule.condition && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">If </span>{rule.condition}
            </p>
          )}
          {rule.action && (
            <p className="text-[11px] leading-snug">
              <span className="text-muted-foreground">Then </span>{rule.action}
            </p>
          )}
          {rule.section_narrative && (
            <>
              <button
                type="button"
                onClick={() => setShowCtx((v) => !v)}
                className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-700"
              >
                {showCtx ? 'Hide context' : 'Why this rule?'}
              </button>
              {showCtx && (
                <p className="mt-1 text-[11px] leading-snug italic text-muted-foreground border-l-2 border-indigo-300 pl-2">
                  {rule.section_narrative}
                </p>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(rule.key)}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </li>
  );
}

// ── Inline editor (chips + open-picker button) ───────────────────────────────

interface NodeAttachmentsProps {
  workflowId: string;
  rules: AttachedSopRule[];
  tools: AttachedTool[];
  onChange: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
}

export default function NodeAttachments({
  workflowId, rules, tools, onChange,
}: NodeAttachmentsProps) {
  const [open, setOpen] = useState(false);

  const removeRule = (key: string) => onChange(rules.filter((r) => r.key !== key), tools);
  const removeTool = (key: string) => onChange(rules, tools.filter((t) => t.key !== key));

  const selectedKeys = useMemo(
    () => new Set<string>([...rules.map((r) => r.key), ...tools.map((t) => t.key)]),
    [rules, tools],
  );

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" />
            SOP Rules
          </label>
          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px]"
                  onClick={() => setOpen(true)}>
            <Plus className="h-3 w-3 mr-1" />
            Pick rules &amp; tools
          </Button>
        </div>

        {rules.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No rules attached. Click "Pick" to select lines from any SOP linked to this workflow.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rules.map((r) => (
              <AttachedRuleCard key={r.key} rule={r} onRemove={removeRule} />
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2 mt-4">
        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Wrench className="h-3 w-3" />
          Tool Calls
        </label>
        {tools.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">
            No tools attached.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tools.map((t) => (
              <li key={t.key} className="border border-border rounded p-2 bg-muted/30 flex items-center gap-2">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                  {t.method}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium truncate">{t.name || '(unnamed)'}</p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">{t.url}</p>
                </div>
                <button type="button" onClick={() => removeTool(t.key)}
                        className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {open && (
        <RulePicker
          workflowId={workflowId}
          selectedKeys={selectedKeys}
          onClose={() => setOpen(false)}
          onSave={(r, t) => onChange(r, t)}
        />
      )}
    </>
  );
}
