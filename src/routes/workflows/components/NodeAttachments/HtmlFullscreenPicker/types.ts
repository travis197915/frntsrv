import type { AttachedSopRule, AttachedTool } from "@/interfaces/workflows";

export type ActiveTab = "rules" | "tools";

export interface SopHtmlState {
  html: string;
  loading: boolean;
  err: string | null;
  /** `true` when showing synthesised/fallback content, not the live source */
  isFallback: boolean;
  /** "neo4j" | "live_html" | "synthesised" | "source-html" | "" */
  source: string;
  sourceUrl: string;
}

export interface SopEntry {
  sop_id: number;
  title: string;
  narrative: string;
  ruleCount: number;
}

export interface FullscreenAttachmentPickerProps {
  workflowId: string;
  selectedKeys: Set<string>;
  existingRules: AttachedSopRule[];
  onClose: () => void;
  onSave: (rules: AttachedSopRule[], tools: AttachedTool[]) => void;
  readOnly?: boolean;
}
