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

export type SampleSummary =
  ExperimentManager.Components["schemas"]["SampleSummary"];

/**
 * The experiment manager serialises the form snapshot (userForm / workerForm /
 * calculations / template) as free-form additional properties, so the
 * generated `ExperimentTemplateDetail` / `ExperimentDetail` schemas type them
 * as `unknown`. These bridging types re-expose the snapshot shape the POC
 * relies on without touching the generated codegen.
 */
export interface FormSnapshotSection {
  title?: string | null;
  description?: string | null;
  questions: Array<{ id: string; [key: string]: unknown }>;
}

interface ExperimentSnapshotFields {
  name?: string;
  description?: string | null;
  userForm?: FormSnapshotSection | null;
  workerForm: FormSnapshotSection;
  calculations: Record<string, string>;
  template: string;
}

export type ExperimentTemplateDetail =
  ExperimentManager.Components["schemas"]["ExperimentTemplateDetail"] &
    ExperimentSnapshotFields;
export type ExperimentTemplateSummary =
  ExperimentManager.Components["schemas"]["ExperimentTemplateSummary"];
export type ExperimentTemplateCreate =
  ExperimentManager.Components["schemas"]["ExperimentTemplateCreate"];
export type ExperimentTemplateUpdate =
  ExperimentManager.Components["schemas"]["ExperimentTemplateUpdate"];
export type ExperimentDetail =
  ExperimentManager.Components["schemas"]["ExperimentDetail"] &
    ExperimentSnapshotFields & { title: string };
export type ExperimentSummary =
  ExperimentManager.Components["schemas"]["ExperimentSummary"];
export type WorkerForm = ExperimentManager.Components["schemas"]["WorkerForm"];

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
  templateId: string,
  body: ExperimentTemplateUpdate,
) {
  return emFetch<ExperimentTemplateDetail>(
    `/api/samples/${sampleId}/experiments/${templateId}`,
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

export async function updateExperiment(
  expId: string,
  body: ExperimentManager.Components["schemas"]["ExperimentUpdate"],
) {
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
