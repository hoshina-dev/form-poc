import "server-only";

import {
  type ExperimentSummary,
  getExperiment,
  getExperimentTemplate,
  getSample,
  listExperiments,
  listExperimentTemplates,
  listSamples,
} from "./client";
import { templateToFormSchema, toTemplateSummary } from "./mappers";
import {
  type ExperimentPhase,
  type ExperimentStateKind,
  getExperimentStateKind,
  parseExperimentRunState,
} from "./state";

export interface ExperimentListItem {
  expId: string;
  sampleId: string;
  sampleName: string;
  templateId: string;
  templateName: string;
  createdAt: string;
  phase: ExperimentPhase | null;
  stateKind: ExperimentStateKind;
}

export async function fetchSamples() {
  const { samples } = await listSamples();
  return samples.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchSample(sampleId: string) {
  return getSample(sampleId);
}

export async function fetchSampleTemplates(sampleId: string) {
  const { experiments } = await listExperimentTemplates(sampleId);
  return experiments
    .map((row) => toTemplateSummary(sampleId, row))
    .sort((a, b) => a.title.localeCompare(b.title));
}

export async function fetchTemplateForm(sampleId: string, templateId: string) {
  const template = await getExperimentTemplate(sampleId, templateId);
  return templateToFormSchema(template);
}

async function buildTemplateNameLookup(
  experiments: ExperimentSummary[],
): Promise<Map<string, string>> {
  const sampleIds = [...new Set(experiments.map((row) => row.sample_id))];
  const lookup = new Map<string, string>();

  await Promise.all(
    sampleIds.map(async (sampleId) => {
      const templates = await fetchSampleTemplates(sampleId);
      for (const template of templates) {
        lookup.set(`${sampleId}/${template.templateId}`, template.title);
      }
    }),
  );

  return lookup;
}

export async function fetchExperiments(): Promise<ExperimentListItem[]> {
  const [{ experiments }, samples] = await Promise.all([
    listExperiments(),
    fetchSamples(),
  ]);
  const sampleById = new Map(samples.map((sample) => [sample.id, sample.name]));
  const templateNames = await buildTemplateNameLookup(experiments);

  const details = await Promise.all(
    experiments.map(async (row) => {
      try {
        return await getExperiment(row.exp_id);
      } catch {
        return null;
      }
    }),
  );

  return experiments
    .map((row, index) => {
      const runState = parseExperimentRunState(details[index]?.state);
      return {
        expId: row.exp_id,
        sampleId: row.sample_id,
        sampleName: sampleById.get(row.sample_id) ?? row.sample_id,
        templateId: row.template_id,
        templateName:
          runState?.template.title ??
          templateNames.get(`${row.sample_id}/${row.template_id}`) ??
          row.template_id,
        createdAt: row.created_at,
        phase: runState?.state.phase ?? null,
        stateKind: getExperimentStateKind(details[index]?.state),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchExperimentRun(expId: string) {
  const experiment = await getExperiment(expId);
  const runState = parseExperimentRunState(experiment.state);
  const [sample, template] = await Promise.all([
    getSample(experiment.sample_id),
    getExperimentTemplate(experiment.sample_id, experiment.template_id),
  ]);

  return {
    experiment,
    sample,
    template,
    form: runState?.template ?? templateToFormSchema(template),
    runState,
    stateKind: getExperimentStateKind(experiment.state),
  };
}
