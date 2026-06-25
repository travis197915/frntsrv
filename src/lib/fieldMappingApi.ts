/**
 * API module for the SOP field mapping + claim ontology config (Django
 * ``/api/agent-tools/*``). These configs are the runtime source of truth the
 * audit engine reads when interpreting claim data.
 */
import { toolsClient } from "@/lib/clients";
import type {
  ClaimOntologyField,
  ClaimOntologyFieldInput,
  SopFieldMapping,
  SopFieldMappingInput,
  SystemLabel,
} from "@/interfaces/fieldMapping";

export const fieldMappingKeys = {
  all: ["field-mappings"] as const,
  list: () => ["field-mappings", "list"] as const,
  meta: () => ["field-mappings", "meta"] as const,
};

export const ontologyKeys = {
  all: ["claim-ontology"] as const,
  list: () => ["claim-ontology", "list"] as const,
};

export const fieldMappingApi = {
  meta: () => toolsClient.get<{ systems: SystemLabel[] }>("/field-mappings/meta/"),
  list: () => toolsClient.get<SopFieldMapping[]>("/field-mappings/"),
  create: (body: SopFieldMappingInput) =>
    toolsClient.post<SopFieldMapping>("/field-mappings/", body),
  update: (id: string, body: Partial<SopFieldMappingInput>) =>
    toolsClient.put<SopFieldMapping>(`/field-mappings/${id}/`, body),
  remove: (id: string) => toolsClient.delete(`/field-mappings/${id}/`),
};

export const ontologyApi = {
  list: () => toolsClient.get<ClaimOntologyField[]>("/claim-ontology/"),
  create: (body: ClaimOntologyFieldInput) =>
    toolsClient.post<ClaimOntologyField>("/claim-ontology/", body),
  update: (id: string, body: Partial<ClaimOntologyFieldInput>) =>
    toolsClient.put<ClaimOntologyField>(`/claim-ontology/${id}/`, body),
  remove: (id: string) => toolsClient.delete(`/claim-ontology/${id}/`),
};
