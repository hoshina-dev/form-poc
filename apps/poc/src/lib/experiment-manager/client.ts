import "server-only";

import type { ExperimentManager } from "@hoshina-dev/api-client";

import { getExperimentManagerUrl } from "./config";

export class ExperimentManagerError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ExperimentManagerError";
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export async function emFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${getExperimentManagerUrl()}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await parseJson(res);
    } catch {
      body = undefined;
    }
    throw new ExperimentManagerError(
      `Experiment Manager ${init?.method ?? "GET"} ${path} failed (${res.status})`,
      res.status,
      body,
    );
  }

  if (res.status === 204) return undefined as T;
  return parseJson<T>(res);
}

type Em = ExperimentManager.Components["schemas"];

export type SampleSummary = Em["SampleSummary"];
export type FormDocSnapshot = Em["FormDoc"];
export type CalculationSnapshot = Em["Calculation"];
export type ExperimentTemplateCreate = Em["ExperimentTemplateCreate"];
export type ExperimentTemplateUpdate = Em["ExperimentTemplateUpdate"];
export type ExperimentUpdate = Em["ExperimentUpdate"];

/**
 * Fields merged from experiment template / experiment state JSONB.
 * OpenAPI types detail responses as `[key: string]: unknown`; this narrows
 * known snapshot keys. Legacy userForm/workerForm kept for old DB rows.
 */
export interface TemplateSnapshotFields {
  clientForm?: FormDocSnapshot | null;
  labForm?: FormDocSnapshot | null;
  calculations?: Record<string, CalculationSnapshot | string>;
  values?: Record<string, unknown>;
  /** @deprecated Legacy wire format */
  userForm?: FormDocSnapshot | null;
  /** @deprecated Legacy wire format */
  workerForm?: FormDocSnapshot | null;
  /** @deprecated Removed from template JSONB */
  template?: string;
}

export type ExperimentTemplateDetail =
  ExperimentManager.Components["schemas"]["ExperimentTemplateDetail"] &
    TemplateSnapshotFields;

export type ExperimentTemplateSummary =
  ExperimentManager.Components["schemas"]["ExperimentTemplateSummary"];

export type ExperimentDetail =
  ExperimentManager.Components["schemas"]["ExperimentDetail"] &
    TemplateSnapshotFields & {
      name?: string;
      description?: string | null;
      /** @deprecated use name */
      title?: string;
    };

export type ExperimentSummary =
  ExperimentManager.Components["schemas"]["ExperimentSummary"];

export async function listSamples() {
  return emFetch<{ samples: SampleSummary[] }>("/api/samples");
}

export async function getSample(sampleId: string) {
  return emFetch<SampleSummary>(`/api/samples/${sampleId}`);
}

export async function listExperimentTemplates(sampleId: string) {
  return emFetch<{
    sample_id: string;
    experiments: ExperimentTemplateSummary[];
  }>(`/api/samples/${sampleId}/experiments`);
}

export async function getExperimentTemplate(
  sampleId: string,
  templateId: string,
) {
  return emFetch<ExperimentTemplateDetail>(
    `/api/samples/${sampleId}/experiments/${templateId}`,
  );
}

export async function createExperimentTemplate(
  sampleId: string,
  body: ExperimentTemplateCreate,
) {
  return emFetch<ExperimentTemplateDetail>(
    `/api/samples/${sampleId}/experiments`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function updateExperimentTemplate(
  sampleId: string,
  lineageId: string,
  body: ExperimentTemplateUpdate,
) {
  return emFetch<ExperimentTemplateDetail>(
    `/api/samples/${sampleId}/experiments/${lineageId}`,
    { method: "PUT", body: JSON.stringify(body) },
  );
}

export async function deleteExperimentTemplate(
  sampleId: string,
  templateId: string,
) {
  return emFetch<void>(`/api/samples/${sampleId}/experiments/${templateId}`, {
    method: "DELETE",
  });
}

export async function listExperiments() {
  return emFetch<{ experiments: ExperimentSummary[] }>("/api/experiments");
}

export async function createExperiment(
  body: ExperimentManager.Components["schemas"]["ExperimentCreate"],
) {
  return emFetch<ExperimentDetail>("/api/experiments", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function updateExperiment(expId: string, body: ExperimentUpdate) {
  return emFetch<ExperimentDetail>(`/api/experiments/${expId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function getExperiment(expId: string) {
  return emFetch<ExperimentDetail>(`/api/experiments/${expId}`);
}

export async function deleteExperiment(expId: string) {
  return emFetch<void>(`/api/experiments/${expId}`, { method: "DELETE" });
}

export async function calculateExperiment(expId: string) {
  return emFetch<ExperimentDetail>(`/api/experiments/${expId}/calculate`, {
    method: "POST",
  });
}

export interface PdfTemplateDetail {
  template_id: string;
  is_current: boolean;
  components: unknown[];
  updated_at: string;
}

export async function getPdfTemplate(sampleId: string, templateId: string) {
  return emFetch<PdfTemplateDetail>(
    `/api/samples/${sampleId}/experiments/${templateId}/pdf`,
  );
}

export async function upsertPdfTemplate(
  sampleId: string,
  lineageId: string,
  components: unknown[],
) {
  return emFetch<PdfTemplateDetail>(
    `/api/samples/${sampleId}/experiments/${lineageId}/pdf`,
    { method: "PUT", body: JSON.stringify({ components }) },
  );
}

export async function deletePdfTemplate(sampleId: string, templateId: string) {
  return emFetch<void>(
    `/api/samples/${sampleId}/experiments/${templateId}/pdf`,
    { method: "DELETE" },
  );
}

export interface TemplateVersionEntry {
  id: string;
  lineage_id: string;
  name: string;
  version: number;
  is_current: boolean;
}

export async function getTemplateHistory(sampleId: string, lineageId: string) {
  return emFetch<{ lineage_id: string; versions: TemplateVersionEntry[] }>(
    `/api/samples/${sampleId}/experiments/${lineageId}/history`,
  );
}

export async function generateReport(expId: string) {
  return emFetch<{ status: string }>(
    `/api/experiments/${expId}/report/generate`,
    {
      method: "POST",
    },
  );
}

export async function downloadReport(expId: string) {
  return emFetch<{ url: string; expires_in: number }>(
    `/api/experiments/${expId}/report/download`,
  );
}
