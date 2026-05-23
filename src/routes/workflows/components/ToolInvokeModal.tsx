/**
 * ToolInvokeModal — interactive form to invoke any agent_tools registry
 * entry against the LangGraph single-tool runtime.
 *
 * Two states:
 *   • "edit"   — JSON args textarea, prefilled with a deterministic
 *                example derived from the tool's args_schema.
 *   • "result" — pretty-printed JSON response from
 *                ``POST /api/agent-tools/{name}/invoke``.
 *
 * Used from:
 *   - NodePalette  → "Test" button on each tool row.
 *   - RulePicker right-rail → same "Test" affordance.
 *   - ConfigPanel  → optional per-binding invoke shortcut.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Play, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import {
  toolRegistryApi,
  type ToolInvokeResponse,
  type ToolRegistryEntry,
} from '@/lib/workflowsApi';

interface ToolInvokeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The tool whose invoke surface this modal exposes. */
  tool: ToolRegistryEntry | null;
  /** Optional seed args (e.g. existing args_template from a binding). */
  initialArgs?: Record<string, unknown>;
}

/**
 * Build a deterministic example payload by walking the tool's
 * Pydantic JSON-Schema and picking a placeholder per declared field.
 * Falls back to ``{}`` when no schema is available.
 */
function exampleFromSchema(schema: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!schema || typeof schema !== 'object') return {};
  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props || typeof props !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(props)) {
    if (!raw || typeof raw !== 'object') continue;
    const desc = raw as { type?: string; default?: unknown; items?: { type?: string }; example?: unknown };
    if (desc.example !== undefined) {
      out[key] = desc.example;
      continue;
    }
    if (desc.default !== undefined) {
      out[key] = desc.default;
      continue;
    }
    switch (desc.type) {
      case 'string':  out[key] = ''; break;
      case 'integer':
      case 'number':  out[key] = 0; break;
      case 'boolean': out[key] = false; break;
      case 'array':   out[key] = []; break;
      case 'object':  out[key] = {}; break;
      default:        out[key] = null; break;
    }
  }
  return out;
}

export default function ToolInvokeModal({
  open,
  onOpenChange,
  tool,
  initialArgs,
}: ToolInvokeModalProps) {
  const seed = useMemo(() => {
    if (initialArgs && Object.keys(initialArgs).length > 0) return initialArgs;
    return exampleFromSchema(tool?.args_schema);
  }, [tool, initialArgs]);

  const [argsText, setArgsText] = useState<string>(() =>
    JSON.stringify(seed, null, 2),
  );
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<ToolInvokeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setArgsText(JSON.stringify(seed, null, 2));
    setResponse(null);
    setError(null);
  }, [seed, open]);

  if (!tool) return null;

  const run = async () => {
    setError(null);
    setRunning(true);
    let parsed: Record<string, unknown>;
    try {
      parsed = argsText.trim() ? JSON.parse(argsText) : {};
    } catch (err) {
      setError(`Invalid JSON: ${(err as Error).message}`);
      setRunning(false);
      return;
    }
    try {
      const resp = await toolRegistryApi.invoke(tool.name, parsed);
      setResponse(resp);
    } catch (err) {
      setError((err as Error).message || 'Invocation failed');
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setArgsText(JSON.stringify(seed, null, 2));
    setResponse(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{tool.display_name || tool.name}</span>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {tool.tool_kind || tool.kind}
            </Badge>
          </DialogTitle>
          <DialogDescription>{tool.description || tool.name}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Arguments (JSON)
            </label>
            <Textarea
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              className="mt-1 font-mono text-xs h-48"
              spellCheck={false}
            />
          </div>

          {error && (
            <div className="rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </div>
          )}

          {response && (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Response{response.ok ? '' : ' (error)'}
              </label>
              <pre className="mt-1 max-h-72 overflow-auto rounded border border-border bg-muted/30 p-3 text-[11px] leading-relaxed">
                {JSON.stringify(response.result ?? response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={reset} disabled={running}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset
          </Button>
          <Button onClick={run} disabled={running}>
            {running ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 mr-1" />
            )}
            Invoke
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
