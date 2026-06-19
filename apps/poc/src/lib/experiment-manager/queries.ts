import "server-only";

import type { ExperimentTemplate, FormAnswers } from "@hoshina-dev/forms";

import type { SessionPayload } from "@/lib/auth/definitions";
import { usersApi } from "@/lib/custapi/client";
import {
  findTicketByExpId,
  listTickets,
  type Ticket,
} from "@/lib/ticketing/client";
import { ticketStatusIndex } from "@/lib/ticketing/status";

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
import {
  extractExperimentAnswers,
  templateDetailToLoaded,
  toTemplateSummary,
} from "./mappers";
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

function isClientSubmissionComplete(
  ticket: Ticket | null | undefined,
): boolean {
  if (!ticket?.status) return false;
  return ticketStatusIndex(ticket.status) >= ticketStatusIndex("PENDING");
}

function derivePhase(
  _detail: ExperimentDetail,
  template: ExperimentTemplate,
  answers: { user: FormAnswers; worker: FormAnswers },
  ticket?: Ticket | null,
): ExperimentPhase {
  const userQuestions = template.clientForm.questions;
  const workerQuestions = template.labForm.questions;

  function questionHasAnswer(q: { id: string; required?: boolean }): boolean {
    const value = answers.user[q.id] ?? answers.worker[q.id];
    return value !== undefined && value !== null;
  }

  if (userQuestions.length > 0) {
    const unansweredRequiredUser = userQuestions.some(
      (q) => q.required && !questionHasAnswer(q),
    );
    if (unansweredRequiredUser) return "user";

    if (ticket) {
      if (!isClientSubmissionComplete(ticket)) return "user";
    } else {
      const hasUserValues = userQuestions.some((q) => questionHasAnswer(q));
      const requiredUserCount = userQuestions.filter((q) => q.required).length;
      if (requiredUserCount === 0 && !hasUserValues) return "user";

      const workerHasValues = workerQuestions.some((q) => questionHasAnswer(q));
      if (!workerHasValues) return "user";
    }
  }

  if (workerQuestions.length > 0) {
    const requiredWorker = workerQuestions.filter((q) => q.required);
    if (requiredWorker.length > 0) {
      const allAnswered = requiredWorker.every((q) => questionHasAnswer(q));
      if (allAnswered) return "result";
    }
  }
  return "worker";
}

export function deriveRunStateFromDetail(
  detail: ExperimentDetail,
  ticket?: Ticket | null,
): ExperimentRunState | null {
  try {
    const templateLike = {
      id: detail.template_id,
      lineage_id: "",
      name: detail.name ?? detail.title ?? "",
      version: 0,
      is_current: true,
      description: detail.description ?? null,
      clientForm: detail.clientForm ?? detail.userForm ?? null,
      labForm: detail.labForm ?? detail.workerForm,
      calculations: detail.calculations,
    };
    const loaded = templateDetailToLoaded(templateLike);
    if (!loaded.valid) return null;

    const { user: userAnswers, worker: workerAnswers } =
      extractExperimentAnswers(detail, loaded.template);

    const phase = derivePhase(
      detail,
      loaded.template,
      {
        user: userAnswers,
        worker: workerAnswers,
      },
      ticket,
    );

    return {
      schemaVersion: EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
      template: loaded.template,
      technicianLogs: [],
      state: {
        phase,
        answers: {
          ...(Object.keys(userAnswers).length > 0
            ? { user: userAnswers as FormAnswers }
            : {}),
          ...(Object.keys(workerAnswers).length > 0
            ? { worker: workerAnswers as FormAnswers }
            : {}),
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
  return templateDetailToLoaded(template);
}

async function buildUserNameLookup(): Promise<Map<string, string>> {
  const lookup = new Map<string, string>();
  try {
    const users = await usersApi.usersGet();
    for (const user of users) {
      lookup.set(user.id, user.name);
    }
  } catch {
    // custapi unavailable — requester names stay unknown
  }
  return lookup;
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
  const userNames = await buildUserNameLookup();
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
      const ticket = ticketByExpId.get(row.id) ?? null;
      const runState = detail ? deriveRunStateFromDetail(detail, ticket) : null;
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
        createdByName:
          runState?.createdBy?.name ??
          (ticket?.userId ? userNames.get(ticket.userId) : null) ??
          null,
        technicianLogCount: runState?.technicianLogs.length ?? 0,
        ticketStatus: ticket?.status ?? null,
      };
    })
    .filter((row): row is ExperimentListItem => row !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function fetchExperimentRun(expId: string) {
  const experiment = await getExperiment(expId);

  let ticket: Ticket | null = null;
  try {
    ticket = await findTicketByExpId(expId);
  } catch {
    // ticketing service is advisory in the POC — ignore lookup failures
  }

  const runState = deriveRunStateFromDetail(experiment, ticket);
  const [sample, template] = await Promise.all([
    getSample(experiment.sample_id),
    getExperimentTemplate(experiment.sample_id, experiment.template_id),
  ]);
  const loaded = templateDetailToLoaded(template);

  return {
    experiment,
    sample,
    template,
    ticket,
    form: runState?.template ?? loaded.template,
    runState,
    stateKind: (runState ? "current" : "missing") as ExperimentStateKind,
  };
}
