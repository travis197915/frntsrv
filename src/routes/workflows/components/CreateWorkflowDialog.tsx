import { useEffect, useRef, useState } from 'react';
import {
  Plus, Trash2, FileText, Globe, Wand2, Upload, Loader2, File as FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { workflowsApi, type RuntimeAgentInput } from '@/lib/workflowsApi';

interface UploadedSop {
  url: string;
  name: string;
  size: number;
}

const ACCEPTED_SOP_TYPES = '.pdf,.docx,.doc,.xlsx,.xls,.html,.htm';

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

interface CreateWorkflowDialogProps {
  open: boolean;
  name: string;
  description: string;
  creating: boolean;
  sopUrls: string[];
  runtimeAgents: RuntimeAgentInput[];
  autoBuild: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSopUrlsChange: (urls: string[]) => void;
  onRuntimeAgentsChange: (agents: RuntimeAgentInput[]) => void;
  onAutoBuildChange: (value: boolean) => void;
  onCreate: (override?: {
    sopUrls: string[];
    runtimeAgents: RuntimeAgentInput[];
  }) => void;
}

const EMPTY_AGENT: RuntimeAgentInput = {
  name:        '',
  url:         '',
  method:      'GET',
  auth_type:   'none',
  auth_token:  '',
  description: '',
};

export default function CreateWorkflowDialog({
  open,
  name,
  description,
  creating,
  sopUrls,
  runtimeAgents,
  autoBuild,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onSopUrlsChange,
  onRuntimeAgentsChange,
  onAutoBuildChange,
  onCreate,
}: CreateWorkflowDialogProps) {
  // Local mirrors so users can type freely without the parent rerendering
  // the entire list on every keystroke.
  const [urls, setUrls] = useState<string[]>(sopUrls.length ? sopUrls : ['']);
  const [agents, setAgents] = useState<RuntimeAgentInput[]>(runtimeAgents);
  const [uploads, setUploads] = useState<UploadedSop[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setUrls(sopUrls.length ? sopUrls : ['']);
      setAgents(runtimeAgents);
      setUploads([]);
      setUploadError(null);
    }
  }, [open, sopUrls, runtimeAgents]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    try {
      const done: UploadedSop[] = [];
      for (const file of Array.from(files)) {
        const res = await workflowsApi.uploadSopDocument(file);
        done.push(res);
      }
      setUploads((u) => [...u, ...done]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeUpload = (i: number) =>
    setUploads((u) => u.filter((_, idx) => idx !== i));

  const pushUrl = () => setUrls((u) => [...u, '']);
  const removeUrl = (i: number) => setUrls((u) => u.filter((_, idx) => idx !== i));
  const updateUrl = (i: number, v: string) =>
    setUrls((u) => u.map((x, idx) => (idx === i ? v : x)));

  const pushAgent = () =>
    setAgents((a) => [...a, { ...EMPTY_AGENT }]);
  const removeAgent = (i: number) =>
    setAgents((a) => a.filter((_, idx) => idx !== i));
  const updateAgent = (i: number, patch: Partial<RuntimeAgentInput>) =>
    setAgents((a) => a.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const handleCreate = () => {
    const cleanUrls = [
      ...urls.map((u) => u.trim()).filter(Boolean),
      ...uploads.map((u) => u.url),
    ];
    const cleanAgents = agents
      .filter((a) => a.name.trim() && a.url.trim())
      .map((a) => ({ ...a, auth_token: a.auth_token?.trim() }));
    // Keep parent state in sync for any other consumers...
    onSopUrlsChange(cleanUrls);
    onRuntimeAgentsChange(cleanAgents);
    // ...but pass the freshly-computed values straight through so the create
    // call doesn't read stale parent state (setState is async — the parent's
    // newSopUrls/newRuntimeAgents wouldn't be updated yet in this same tick).
    onCreate({ sopUrls: cleanUrls, runtimeAgents: cleanAgents });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Define the workflow, attach static SOP documents, and register
            runtime API agents that will be called per claim at execution time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Basics ─────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Workflow Name</label>
              <Input
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g. Eligibility Audit"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="What does this workflow automate?"
                className="min-h-[70px]"
              />
            </div>
          </div>

          {/* ── SOP links (static rules) ───────────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">SOP Documents (static rules)</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={pushUrl}>
                <Plus className="h-3 w-3 mr-1" /> Add URL
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              HTML links or uploaded PDFs/documents. Each is crawled,
              contextualised, and stored against this workflow — a PDF builds the
              exact same step-by-step canvas as an HTML link.
            </p>

            {/* ── File upload (drag & drop) ─────────────────────────── */}
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed px-3 py-5 transition-colors ${
                dragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-primary/40 bg-primary/5 hover:bg-primary/10'
              }`}
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              ) : (
                <Upload className="h-5 w-5 text-primary" />
              )}
              <span className="text-xs font-medium">
                {uploading ? 'Uploading…' : 'Upload SOP files'}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Drag &amp; drop or click — PDF, DOCX, XLSX, HTML
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_SOP_TYPES}
                multiple
                className="sr-only"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            {/* Uploaded documents */}
            {uploads.length > 0 && (
              <div className="space-y-1.5">
                {uploads.map((u, i) => (
                  <div
                    key={u.url}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5"
                  >
                    <FileIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-sm" title={u.name}>
                      {u.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatBytes(u.size)}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeUpload(i)}
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {uploadError && (
              <p className="text-[11px] text-destructive">{uploadError}</p>
            )}

            <div className="space-y-2">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updateUrl(i, e.target.value)}
                    placeholder="https://example.com/sop.html"
                    className="text-sm"
                  />
                  {urls.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeUrl(i)}
                      className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* ── Auto-build toggle ──────────────────────────────────── */}
            <label
              className="mt-2 flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/30 p-3"
            >
              <input
                type="checkbox"
                checked={autoBuild}
                onChange={(e) => onAutoBuildChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              />
              <span className="space-y-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  <Wand2 className="h-3.5 w-3.5 text-primary" />
                  Auto-build workflow from SOP
                </span>
                <span className="block text-[11px] text-muted-foreground">
                  When ingestion finishes, every step becomes a node and every
                  rule is attached automatically. You then add the tool calls
                  per node. Leave off to ingest + link only (manual canvas).
                </span>
              </span>
            </label>
          </div>

          {/* ── Runtime API agents ─────────────────────────────────── */}
          <div className="space-y-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Runtime API Agents</h3>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={pushAgent}>
                <Plus className="h-3 w-3 mr-1" /> Add Agent
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              External APIs invoked per claim when you upload an Excel sheet for
              audit. The response feeds into the SOP rules above.
            </p>

            <div className="space-y-3">
              {agents.length === 0 ? (
                <p className="text-xs italic text-muted-foreground px-1">
                  No runtime agents attached.
                </p>
              ) : (
                agents.map((agent, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-border bg-muted/30 p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={agent.name}
                        onChange={(e) => updateAgent(i, { name: e.target.value })}
                        placeholder="Agent name (e.g. Member Eligibility)"
                        className="text-sm flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeAgent(i)}
                        className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={agent.method}
                        onChange={(e) =>
                          updateAgent(i, { method: e.target.value as RuntimeAgentInput['method'] })
                        }
                        className="text-xs h-9 px-2 rounded-md border border-input bg-background"
                      >
                        {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <Input
                        value={agent.url}
                        onChange={(e) => updateAgent(i, { url: e.target.value })}
                        placeholder="https://api.example.com/members/{member_id}"
                        className="text-sm flex-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={agent.auth_type}
                        onChange={(e) =>
                          updateAgent(i, {
                            auth_type: e.target.value as RuntimeAgentInput['auth_type'],
                          })
                        }
                        className="text-xs h-9 px-2 rounded-md border border-input bg-background"
                      >
                        <option value="none">No auth</option>
                        <option value="bearer">Bearer</option>
                        <option value="api_key">API Key</option>
                        <option value="basic">Basic (user:pass)</option>
                      </select>
                      {agent.auth_type !== 'none' && (
                        <Input
                          type="password"
                          value={agent.auth_token ?? ''}
                          onChange={(e) => updateAgent(i, { auth_token: e.target.value })}
                          placeholder={
                            agent.auth_type === 'basic' ? 'username:password' : 'token / key'
                          }
                          className="text-sm flex-1"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
          >
            {creating ? 'Creating...' : 'Create Workflow'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
