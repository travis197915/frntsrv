import { useEffect, useState } from 'react';
import { Plus, Trash2, FileText, Globe } from 'lucide-react';
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
import type { RuntimeAgentInput } from '@/lib/workflowsApi';

interface CreateWorkflowDialogProps {
  open: boolean;
  name: string;
  description: string;
  creating: boolean;
  sopUrls: string[];
  runtimeAgents: RuntimeAgentInput[];
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onSopUrlsChange: (urls: string[]) => void;
  onRuntimeAgentsChange: (agents: RuntimeAgentInput[]) => void;
  onCreate: () => void;
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
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onSopUrlsChange,
  onRuntimeAgentsChange,
  onCreate,
}: CreateWorkflowDialogProps) {
  // Local mirrors so users can type freely without the parent rerendering
  // the entire list on every keystroke.
  const [urls, setUrls] = useState<string[]>(sopUrls.length ? sopUrls : ['']);
  const [agents, setAgents] = useState<RuntimeAgentInput[]>(runtimeAgents);

  useEffect(() => {
    if (open) {
      setUrls(sopUrls.length ? sopUrls : ['']);
      setAgents(runtimeAgents);
    }
  }, [open, sopUrls, runtimeAgents]);

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
    onSopUrlsChange(urls.map((u) => u.trim()).filter(Boolean));
    onRuntimeAgentsChange(
      agents
        .filter((a) => a.name.trim() && a.url.trim())
        .map((a) => ({ ...a, auth_token: a.auth_token?.trim() })),
    );
    onCreate();
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
              HTML links that will be crawled, contextualised, and stored against
              this workflow when it is created.
            </p>

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
