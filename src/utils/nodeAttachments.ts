/** Stable picker key for a tool row — attachable API rows carry `key`; hydrated
 *  shape properties carry `name` / `endpoint_id` / binding `id` instead. */
export function toolPickKey(t: {
  key?: string;
  name?: string;
  endpoint_id?: string;
  id?: string;
}): string {
  if (t.key) return t.key;
  if (t.name) return `tool:${t.name}`;
  if (t.endpoint_id) return `agent:${t.endpoint_id}`;
  if (t.id) return `binding:${t.id}`;
  return "";
}

export function isRulePickKey(key: string | undefined): key is string {
  return !!key && (key.startsWith("pre:") || key.startsWith("step:"));
}

export function isToolPickKey(key: string | undefined): key is string {
  return (
    !!key &&
    (key.startsWith("tool:") ||
      key.startsWith("agent:") ||
      key.startsWith("binding:"))
  );
}

export const DECISION_TONE: Record<string, string> = {
  DENY: "bg-red-50 text-red-700 border-red-200",
  ALLOW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  BYPASS: "bg-blue-50 text-blue-700 border-blue-200",
  PEND: "bg-amber-50 text-amber-700 border-amber-200",
  REFER: "bg-violet-50 text-violet-700 border-violet-200",
  SYSTEM: "bg-slate-100 text-slate-700 border-slate-200",
  STOP: "bg-red-100 text-red-800 border-red-300",
  WAIVE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CONDITIONAL: "bg-slate-50 text-slate-600 border-slate-200",
  NOTE: "bg-sky-50 text-sky-700 border-sky-200",
};
