/**
 * JsonTree — a lightweight, dependency-free collapsible JSON viewer.
 *
 * - Objects/arrays render as expandable nodes with a key + a summary
 *   (``{…} 5 keys`` / ``[…] 3 items``).
 * - Primitives are colour-coded by type.
 * - String values that *contain* JSON (a common API shape, e.g. a ``raw``
 *   field holding a stringified payload) are auto-parsed and shown as a
 *   nested tree, tagged ``json`` so it's clear it was unwrapped.
 */
import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

interface ParsedJson {
  data: JsonValue;
  /** True when the source string was truncated and we recovered a prefix. */
  truncated: boolean;
}

/**
 * Recover the largest valid prefix of a truncated JSON array/object — e.g. a
 * server that caps a payload at 32k chars and cuts off mid-object. We walk back
 * from the end to the last complete ``}``, close the container, and re-parse.
 */
function salvageTruncated(t: string, first: string): JsonValue | undefined {
  const closer = first === "[" ? "]" : "}";
  let end = t.lastIndexOf("}");
  for (let attempts = 0; attempts < 8 && end > 0; attempts++) {
    let candidate = t.slice(0, end + 1).replace(/,\s*$/, "");
    if (first === "[") candidate += closer; // array still needs its closer
    try {
      return JSON.parse(candidate) as JsonValue;
    } catch {
      end = t.lastIndexOf("}", end - 1);
    }
  }
  return undefined;
}

/** Parse a string only if it actually looks like a JSON object/array. */
function tryParseJson(value: string): ParsedJson | undefined {
  const t = value.trim();
  if (t.length < 2) return undefined;
  const first = t[0];
  if (first !== "{" && first !== "[") return undefined;
  try {
    return { data: JSON.parse(t) as JsonValue, truncated: false };
  } catch {
    const salvaged = salvageTruncated(t, first);
    if (salvaged !== undefined) return { data: salvaged, truncated: true };
    return undefined;
  }
}

function isContainer(v: unknown): v is JsonValue[] | Record<string, JsonValue> {
  return v !== null && typeof v === "object";
}

function Leaf({ value }: { value: string | number | boolean | null }) {
  if (value === null)
    return <span className="text-muted-foreground italic">null</span>;
  switch (typeof value) {
    case "number":
      return <span className="text-amber-300">{String(value)}</span>;
    case "boolean":
      return <span className="text-purple-300">{String(value)}</span>;
    default:
      return <span className="text-emerald-400 break-all">"{value}"</span>;
  }
}

interface NodeProps {
  /** Key label (object key or array index); null for the root. */
  label?: string | number | null;
  value: JsonValue;
  depth: number;
  defaultOpen?: boolean;
}

function JsonNode({ label, value, depth, defaultOpen = false }: NodeProps) {
  // Auto-unwrap a JSON-in-string value into a real subtree.
  let parsedFromString = false;
  let truncated = false;
  let effective: JsonValue = value;
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== undefined) {
      effective = parsed.data;
      parsedFromString = true;
      truncated = parsed.truncated;
    }
  }

  const [open, setOpen] = useState(defaultOpen || depth < 1);

  const keyLabel =
    label === null || label === undefined ? null : (
      <span className="text-sky-300">{label}</span>
    );

  if (!isContainer(effective)) {
    return (
      <div className="flex gap-1.5" style={{ paddingLeft: depth * 12 }}>
        {keyLabel && (
          <>
            {keyLabel}
            <span className="text-muted-foreground/60">:</span>
          </>
        )}
        <Leaf value={effective as string | number | boolean | null} />
      </div>
    );
  }

  const isArray = Array.isArray(effective);
  const entries: [string, JsonValue][] = isArray
    ? (effective as JsonValue[]).map((v, i) => [String(i), v])
    : Object.entries(effective as Record<string, JsonValue>);

  const summary = isArray
    ? `[] ${entries.length} item${entries.length === 1 ? "" : "s"}`
    : `{} ${entries.length} key${entries.length === 1 ? "" : "s"}`;

  return (
    <div style={{ paddingLeft: depth * 12 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-left hover:bg-muted/40 rounded px-0.5 -ml-0.5"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />
        )}
        {keyLabel && (
          <>
            {keyLabel}
            <span className="text-muted-foreground/60">:</span>
          </>
        )}
        <span className="text-muted-foreground/70">{summary}</span>
        {parsedFromString && (
          <span className="ml-1 rounded bg-sky-500/15 px-1 text-[9px] uppercase tracking-wide text-sky-300">
            json
          </span>
        )}
        {truncated && (
          <span className="ml-1 rounded bg-amber-500/15 px-1 text-[9px] uppercase tracking-wide text-amber-300">
            truncated
          </span>
        )}
      </button>
      {open && (
        <div className="border-l border-border/50 ml-[6px]">
          {entries.map(([k, v]) => (
            <JsonNode key={k} label={k} value={v} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface JsonTreeProps {
  data: unknown;
  className?: string;
}

export default function JsonTree({ data, className = "" }: JsonTreeProps) {
  return (
    <div
      className={`max-h-72 overflow-auto rounded border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed ${className}`}
    >
      <JsonNode value={data as JsonValue} depth={0} defaultOpen />
    </div>
  );
}
