import { useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Globe,
  Plus,
  Network,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  workflowsApi,
  type RuntimeAgentInput,
  type WorkflowAgent,
  type WorkflowSop,
} from '@/lib/workflowsApi';
import SopGraphDialog from './SopGraphDialog';
import { cn } from '@/utils/utils';

type SopTab = 'queued' | 'completed' | 'failed';

interface WorkflowContextPanelProps {
  workflowId: string;
  workflowName: string;
  workflowDescription: string;
  sops: WorkflowSop[];
  agents: WorkflowAgent[];
  onAttached: () => void;
}

const STATUS_STYLES: Record<string, { label: string; icon: typeof Clock; tone: string }> = {
  QUEUED:    { label: 'Queued',    icon: Clock,         tone: 'text-amber-500 bg-amber-50 border-amber-200' },
  RUNNING:   { label: 'Running',   icon: Loader2,       tone: 'text-blue-600 bg-blue-50 border-blue-200' },
  COMPLETED: { label: 'Completed', icon: CheckCircle2,  tone: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  PARTIAL:   { label: 'Partial',   icon: AlertTriangle, tone: 'text-amber-600 bg-amber-50 border-amber-200' },
  FAILED:    { label: 'Failed',    icon: AlertTriangle, tone: 'text-red-600 bg-red-50 border-red-200' },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_STYLES[status] ?? STATUS_STYLES.QUEUED;
  const Icon = meta.icon;
  const animated = status === 'RUNNING' || status === 'QUEUED';
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium ${meta.tone}`}>
      <Icon className={`h-2.5 w-2.5 ${animated ? 'animate-spin' : ''}`} />
      {meta.label}
    </span>
  );
}

function groupSopsByStatus(sops: WorkflowSop[]) {
  const queued: WorkflowSop[] = [];
  const completed: WorkflowSop[] = [];
  const failed: WorkflowSop[] = [];

  for (const sop of sops) {
    if (sop.status === 'FAILED') {
      failed.push(sop);
    } else if (sop.status === 'COMPLETED' || sop.status === 'PARTIAL') {
      completed.push(sop);
    } else {
      queued.push(sop);
    }
  }

  return { queued, completed, failed };
}

const SOP_TABS: { key: SopTab; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'queued', label: 'Queued' },
  { key: 'failed', label: 'Failed' },
];

function sopTabButtonClass(active: boolean) {
  return cn(
    'relative flex-1 px-2 py-1.5 rounded-md inline-flex items-center justify-center gap-1 text-[11px] transition-all min-w-0',
    active
      ? 'bg-white text-foreground shadow-md ring-1 ring-black/5 z-10 dark:bg-zinc-600 dark:text-zinc-50 dark:ring-white/10'
      : 'text-muted-foreground hover:text-foreground',
  );
}

function sopTabCountClass(active: boolean) {
  return cn(
    'text-[10px] tabular-nums',
    active ? 'text-muted-foreground' : 'text-muted-foreground/70',
  );
}

function SopListItem({
  sop,
  onOpenGraph,
}: {
  sop: WorkflowSop;
  onOpenGraph: (sop: WorkflowSop) => void;
}) {
  const canOpenGraph = sop.status === 'COMPLETED' || sop.status === 'PARTIAL';

  return (
    <li>
      <button
        type="button"
        onClick={() => canOpenGraph && onOpenGraph(sop)}
        disabled={!canOpenGraph}
        className={`w-full text-left text-xs rounded-md border border-border bg-background p-2 transition-colors ${
          canOpenGraph
            ? 'hover:border-primary hover:bg-muted/50 cursor-pointer'
            : 'opacity-80 cursor-not-allowed'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-medium truncate flex items-center gap-1 min-w-0">
            <span className="truncate">{shortenUrl(sop.seed_url)}</span>
            {canOpenGraph && <Network className="h-3 w-3 shrink-0 opacity-60" />}
          </span>
          <StatusBadge status={sop.status} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {canOpenGraph
            ? 'Click to view knowledge graph'
            : `${sop.docs_processed} doc${sop.docs_processed === 1 ? '' : 's'} parsed${
                sop.docs_failed > 0 ? ` · ${sop.docs_failed} failed` : ''
              }`}
        </p>
      </button>
    </li>
  );
}

export default function WorkflowContextPanel({
  workflowId,
  workflowName,
  workflowDescription,
  sops,
  agents,
  onAttached,
}: WorkflowContextPanelProps) {
  const [adding, setAdding] = useState<'sop' | 'agent' | null>(null);
  const [graphSop, setGraphSop] = useState<WorkflowSop | null>(null);
  const [newSopUrl, setNewSopUrl] = useState('');
  const [newAgent, setNewAgent] = useState<RuntimeAgentInput>({
    name: '', url: '', method: 'GET', auth_type: 'none', auth_token: '',
  });
  const [busy, setBusy] = useState(false);
  const [sopTab, setSopTab] = useState<SopTab>('completed');
  const groupedSops = groupSopsByStatus(sops);
  const activeSops = groupedSops[sopTab];

  const hasPending = sops.some((s) => s.status === 'QUEUED' || s.status === 'RUNNING');

  // Poll the workflow while any ingestion is still in flight.
  useEffect(() => {
    if (!hasPending || !workflowId) return;
    const t = setInterval(() => onAttached(), 4000);
    return () => clearInterval(t);
  }, [hasPending, workflowId, onAttached]);

  const attachSop = useCallback(async () => {
    const url = newSopUrl.trim();
    if (!url) return;
    setBusy(true);
    try {
      await workflowsApi.attach(workflowId, { sopUrls: [url] });
      setNewSopUrl('');
      setAdding(null);
      onAttached();
    } finally {
      setBusy(false);
    }
  }, [newSopUrl, workflowId, onAttached]);

  const attachAgent = useCallback(async () => {
    if (!newAgent.name.trim() || !newAgent.url.trim()) return;
    setBusy(true);
    try {
      await workflowsApi.attach(workflowId, { runtimeAgents: [newAgent] });
      setNewAgent({ name: '', url: '', method: 'GET', auth_type: 'none', auth_token: '' });
      setAdding(null);
      onAttached();
    } finally {
      setBusy(false);
    }
  }, [newAgent, workflowId, onAttached]);

  return (
    <aside className="w-full h-full border-l border-border bg-card overflow-y-auto">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold">{workflowName || 'Workflow'}</h2>
        {workflowDescription && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {workflowDescription}
          </p>
        )}
        <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-wide">
          Workflow Context
        </p>
      </div>

      {/* ── SOP Documents ──────────────────────────────────────────────── */}
      <section className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              SOPs <span className="text-foreground">({sops.length})</span>
            </h3>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setAdding(adding === 'sop' ? null : 'sop')}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {adding === 'sop' && (
          <div className="mb-3 flex gap-2">
            <Input
              value={newSopUrl}
              onChange={(e) => setNewSopUrl(e.target.value)}
              placeholder="https://…/sop.html"
              className="text-xs h-8"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') void attachSop(); }}
            />
            <Button size="sm" onClick={attachSop} disabled={busy}>
              Add
            </Button>
          </div>
        )}

        {sops.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No SOPs attached.</p>
        ) : (
          <>
            <div
              role="tablist"
              aria-label="SOP status"
              className="mb-3 flex rounded-lg bg-muted p-1 gap-0.5 dark:bg-zinc-900/80"
            >
              {SOP_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={sopTab === key}
                  onClick={() => setSopTab(key)}
                  className={sopTabButtonClass(sopTab === key)}
                >
                  {label}{' '}
                  <span className={sopTabCountClass(sopTab === key)}>
                    ({groupedSops[key].length})
                  </span>
                </button>
              ))}
            </div>

            {activeSops.length === 0 ? (
              <p className="text-xs italic text-muted-foreground">
                No {sopTab} SOPs.
              </p>
            ) : (
              <ul className="space-y-2">
                {activeSops.map((sop) => (
                  <SopListItem
                    key={sop.job_id}
                    sop={sop}
                    onOpenGraph={setGraphSop}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      {/* ── Runtime Agents ─────────────────────────────────────────────── */}
      <section className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Runtime Agents <span className="text-foreground">({agents.length})</span>
            </h3>
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setAdding(adding === 'agent' ? null : 'agent')}
            disabled={busy}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {adding === 'agent' && (
          <div className="mb-3 space-y-2 p-2 rounded-md border border-border bg-muted/30">
            <Input
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="Agent name"
              className="text-xs h-8"
              autoFocus
            />
            <div className="flex gap-1.5">
              <select
                value={newAgent.method}
                onChange={(e) => setNewAgent({ ...newAgent, method: e.target.value as RuntimeAgentInput['method'] })}
                className="text-[11px] h-8 px-1.5 rounded-md border border-input bg-background"
              >
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <Input
                value={newAgent.url}
                onChange={(e) => setNewAgent({ ...newAgent, url: e.target.value })}
                placeholder="https://api.example.com/…"
                className="text-xs h-8 flex-1"
              />
            </div>
            <div className="flex gap-1.5">
              <select
                value={newAgent.auth_type}
                onChange={(e) => setNewAgent({ ...newAgent, auth_type: e.target.value as RuntimeAgentInput['auth_type'] })}
                className="text-[11px] h-8 px-1.5 rounded-md border border-input bg-background"
              >
                <option value="none">No auth</option>
                <option value="bearer">Bearer</option>
                <option value="api_key">API Key</option>
                <option value="basic">Basic</option>
              </select>
              {newAgent.auth_type !== 'none' && (
                <Input
                  type="password"
                  value={newAgent.auth_token ?? ''}
                  onChange={(e) => setNewAgent({ ...newAgent, auth_token: e.target.value })}
                  placeholder="token"
                  className="text-xs h-8 flex-1"
                />
              )}
            </div>
            <Button size="sm" onClick={attachAgent} disabled={busy} className="w-full">
              Register Agent
            </Button>
          </div>
        )}

        {agents.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">No runtime agents.</p>
        ) : (
          <ul className="space-y-2">
            {agents.map((agent, i) => (
              <li
                key={agent.endpoint_id || `${agent.name}-${i}`}
                className="text-xs rounded-md border border-border bg-background p-2"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {agent.method}
                  </span>
                  <span className="font-medium truncate flex-1">{agent.name || '(unnamed)'}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate font-mono">
                  {agent.url}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  auth: <span className="font-medium">{agent.auth_type}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SopGraphDialog
        open={!!graphSop}
        jobId={graphSop?.job_id ?? ''}
        auditSopId={graphSop?.audit_sop_id ?? null}
        onClose={() => setGraphSop(null)}
      />
    </aside>
  );
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.length > 36 ? u.pathname.slice(0, 33) + '…' : u.pathname;
    return `${u.hostname}${path}`;
  } catch {
    return url;
  }
}
