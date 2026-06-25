/** Types for the DB-backed SOP field mapping + claim ontology config screens. */

export interface SystemLabel {
  key: string;
  label: string;
}

/** A canonical SOP business field → source-system key mapping. */
export interface SopFieldMapping {
  id: string;
  sop_field: string;
  description: string;
  category: string;
  /** { FACETS: ["PRPR_NPI"], DOC360: ["24 RENDERING NPI"], ... } */
  systems: Record<string, string[]>;
  notes: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SopFieldMappingInput = Pick<
  SopFieldMapping,
  "sop_field" | "description" | "category" | "systems" | "notes" | "is_active"
>;

/** A CMS-1500 ontology row: canonical field + the raw labels that alias to it. */
export interface ClaimOntologyField {
  id: string;
  namespace: string;
  canonical_field: string;
  description: string;
  aliases: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ClaimOntologyFieldInput = Pick<
  ClaimOntologyField,
  "namespace" | "canonical_field" | "description" | "aliases" | "is_active"
>;
