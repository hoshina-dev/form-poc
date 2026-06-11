import "server-only";

import type { FormAnswers } from "@hoshina-dev/forms";

import type { SessionPayload } from "@/lib/auth/definitions";
import {
  findTicketByExpId,
  listTickets,
  type Ticket,
} from "@/lib/ticketing/client";

import {
  type ExperimentDetail,
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
  EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
  type ExperimentPhase,
  type ExperimentRunState,
  type ExperimentStateKind,
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
  createdByName: string | null;
  technicianLogCount: number;
  ticketStatus: string | null;
}

function isExperimentVisible(
  session: SessionPayload,
  runState: ExperimentRunState | null,
  ticket: Ticket | null,
  hasTickets: boolean,
): boolean {
  if (!runState) return false;
  if (session.appRole === "client") {
    if (ticket) return ticket.userId === session.userId;
    // Ticket data is available but none matched this experiment → not ours.
    if (hasTickets) return false;
    // Ticketing unavailable: fall back to phase-based visibility.
    return runState.state.phase === "user" || runState.state.phase === "result";
  }
  return runState.state.phase === "worker" || runState.state.phase === "result";
}

function extractAnswersFromQuestions(
  questions: Array<{ id: string; [key: string]: unknown }> | undefined,
): Record<string, unknown> | undefined {
  if (!questions?.length) return undefined;
  const answers: Record<string, unknown> = {};
  for (const q of questions) {
    if (q["value"] !== undefined && q["value"] !== null) {
      answers[q.id] = q["value"];
    }
  }
  return Object.keys(answers).length > 0 ? answers : undefined;
}

function derivePhase(detail: ExperimentDetail): ExperimentPhase {
  if (detail.userForm?.questions?.length) {
    const anyUnanswered = detail.userForm.questions.some(
      (q) =>
        (q as Record<string, unknown>)["required"] &&
        ((q as Record<string, unknown>)["value"] === undefined ||
          (q as Record<string, unknown>)["value"] === null),
    );
    if (anyUnanswered) return "user";
  }
  if (detail.workerForm?.questions?.length) {
    const requiredQuestions = detail.workerForm.questions.filter(
      (q) => (q as Record<string, unknown>)["required"],
    );
    if (requiredQuestions.length > 0) {
      const allAnswered = requiredQuestions.every(
        (q) =>
          (q as Record<string, unknown>)["value"] !== undefined &&
          (q as Record<string, unknown>)["value"] !== null,
      );
      if (allAnswered) return "result";
    }
  }
  return "worker";
}

export function deriveRunStateFromDetail(
  detail: ExperimentDetail,
): ExperimentRunState | null {
  try {
    const templateLike = {
      id: detail.template_id,
      lineage_id: "",
      name: detail.title,
      version: 0,
      is_current: true,
      description: null,
      userForm: detail.userForm ?? null,
      workerForm: detail.workerForm,
      calculations: detail.calculations,
      template: detail.template,
    };
    const formSchema = templateToFormSchema(templateLike);

    const userAnswers = extractAnswersFromQuestions(
      detail.userForm?.questions as
        | Array<{ id: string; [key: string]: unknown }>
        | undefined,
    );
    const workerAnswers = extractAnswersFromQuestions(
      detail.workerForm.questions as Array<{
        id: string;
        [key: string]: unknown;
      }>,
    );

    const phase = derivePhase(detail);

    return {
      schemaVersion: EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
      template: formSchema,
      technicianLogs: [],
      state: {
        phase,
        answers: {
          ...(userAnswers ? { user: userAnswers as FormAnswers } : {}),
          ...(workerAnswers ? { worker: workerAnswers as FormAnswers } : {}),
        },
      },
    };
  } catch {
    return null;
  }
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

export async function fetchExperiments(
  session: SessionPayload,
): Promise<ExperimentListItem[]> {
  const [{ experiments }, samples] = await Promise.all([
    listExperiments(),
    fetchSamples(),
  ]);

  let tickets: Ticket[] = [];
  try {
    tickets = await listTickets();
  } catch {
    tickets = [];
  }
  const ticketByExpId = new Map<string, Ticket>();
  for (const ticket of tickets) {
    if (ticket.experimentTemplate?.id) {
      ticketByExpId.set(ticket.experimentTemplate.id, ticket);
    }
  }

  const sampleById = new Map(samples.map((sample) => [sample.id, sample.name]));
  const templateNames = await buildTemplateNameLookup(experiments);

  const details = await Promise.all(
    experiments.map(async (row) => {
      try {
        return await getExperiment(row.id);
      } catch {
        return null;
      }
    }),
  );

  return experiments
    .map((row, index): ExperimentListItem | null => {
      const detail = details[index];
      const runState = detail ? deriveRunStateFromDetail(detail) : null;
      const ticket = ticketByExpId.get(row.id) ?? null;
      if (!isExperimentVisible(session, runState, ticket, tickets.length > 0)) {
        return null;
      }
      return {
        expId: row.id,
        sampleId: row.sample_id,
        sampleName: sampleById.get(row.sample_id) ?? row.sample_id,
        templateId: row.template_id,
        templateName:
          detail?.title ??
          templateNames.get(`${row.sample_id}/${row.template_id}`) ??
          row.template_id,
        createdAt: row.created_at,
        phase: runState?.state.phase ?? null,
        stateKind: detail ? "current" : "missing",
        createdByName: runState?.createdBy?.name ?? null,
        technicianLogCount: runState?.technicianLogs.length ?? 0,
        ticketStatus: ticket?.status ?? null,
      };
    })
    .filter((row): row is ExperimentListItem => row !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchExperimentRun(expId: string) {
  const experiment = await getExperiment(expId);
  const runState = deriveRunStateFromDetail(experiment);
  const [sample, template] = await Promise.all([
    getSample(experiment.sample_id),
    getExperimentTemplate(experiment.sample_id, experiment.template_id),
  ]);

  let ticket: Ticket | null = null;
  try {
    ticket = await findTicketByExpId(expId);
  } catch {
    // ticketing service is advisory in the POC — ignore lookup failures
  }

  return {
    experiment,
    sample,
    template,
    ticket,
    form: runState?.template ?? templateToFormSchema(template),
    runState,
    stateKind: (runState ? "current" : "missing") as ExperimentStateKind,
  };
}
