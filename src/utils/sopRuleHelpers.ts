import type { AttachableSopRule } from '@/interfaces/workflows';
import type { SopExclusionTargetKind } from '@/interfaces/sop';

/** Resolve a rule_key to a (target_kind, target_key) tuple for the SOP-exclusions API. */
export function ruleKeyToExclusionTarget(
  rule: AttachableSopRule,
): { kind: SopExclusionTargetKind; key: string } {
  return { kind: 'rule', key: rule.key };
}

/** Walk the `references` graph from `start`, collecting every reachable key. */
export function expandReferences(
  start:     string,
  ruleByKey: Map<string, AttachableSopRule>,
): string[] {
  const visited = new Set<string>();
  const stack   = [start];
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
}
