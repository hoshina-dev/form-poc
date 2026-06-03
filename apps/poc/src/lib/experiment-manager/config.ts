import "server-only";

const DEFAULT_URL = "http://experiment-manager.mapfox.hoshina.san";

export function getExperimentManagerUrl(): string {
  return process.env.EXPERIMENT_MANAGER_URL?.replace(/\/$/, "") ?? DEFAULT_URL;
}

/** When set, the POC scopes template CRUD to a single sample. */
export function getDefaultSampleId(): string | undefined {
  const id = process.env.EXPERIMENT_MANAGER_SAMPLE_ID?.trim();
  return id || undefined;
}
