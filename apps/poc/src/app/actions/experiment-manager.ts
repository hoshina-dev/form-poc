"use server";

import type { ExperimentTemplate } from "@hoshina-dev/forms";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/dal";
import type { SessionPayload } from "@/lib/auth/definitions";
import type { TemplateMeta } from "@/lib/builder";
import {
  canResumeExperiment,
  canViewExperiment,
} from "@/lib/experiment-manager/access";
import {
  createExperiment,
  createExperimentTemplate,
  deleteExperiment,
  deleteExperimentTemplate,
  downloadReport,
  ExperimentManagerError,
  generateReport,
  getExperiment,
  getExperimentTemplate,
  listExperimentTemplates,
  listSamples,
  updateExperiment,
  updateExperimentTemplate,
  upsertPdfTemplate,
  type WorkerForm,
} from "@/lib/experiment-manager/client";
import { getDefaultSampleId } from "@/lib/experiment-manager/config";
import {
  injectValues,
  type LoadedTemplate,
  mapObjectCalcsToString,
  templateDetailToLoaded,
  type TemplateRef,
  type TemplateSummary,
  templateToCreate,
  templateToUpdate,
  toTemplateSummary,
} from "@/lib/experiment-manager/mappers";
import {
  deriveRunStateFromDetail,
  type ExperimentListItem,
  fetchExperiments,
} from "@/lib/experiment-manager/queries";
import {
  type ExperimentActor,
  type ExperimentRunState,
  parseExperimentRunState,
} from "@/lib/experiment-manager/state";
import {
  advanceTicketTo,
  createTicket,
  findTicketByExpId,
} from "@/lib/ticketing/client";
import type { TicketStatus } from "@/lib/ticketing/status";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

function actionError(error: unknown, fallback: string): ActionResult<never> {
  if (error instanceof ExperimentManagerError) {
    return { success: false, error: fallback };
  }
  if (error instanceof Error) {
    return { success: false, error: fallback };
  }
  return { success: false, error: fallback };
}

function actorFromSession(session: SessionPayload): ExperimentActor {
  return {
    id: session.userId,
    name: session.name,
    email: session.email,
  };
}

async function loadRunStateFromExperiment(
  expId: string,
  experiment: Awaited<ReturnType<typeof getExperiment>>,
): Promise<ExperimentRunState | null> {
  let ticket = null;
  try {
    ticket = await findTicketByExpId(expId);
  } catch {
    // ticketing lifecycle is advisory in the POC — ignore lookup failures
  }
  return deriveRunStateFromDetail(experiment, ticket);
}

function buildExperimentUpdateBody(state: ExperimentRunState) {
  const userAnswers = state.state.answers.user;
  const workerAnswers = state.state.answers.worker;
  return {
    workerForm: injectValues(
      state.template.labForm,
      workerAnswers,
    ) as WorkerForm,
    calculations: mapObjectCalcsToString(state.template.calculations),
    template: "",
    userForm:
      state.template.clientForm.questions.length > 0
        ? (injectValues(state.template.clientForm, userAnswers) as WorkerForm)
        : null,
  };
}

function normalizeClientState(
  session: SessionPayload,
  existingState: ExperimentRunState | null,
  nextState: ExperimentRunState,
): ActionResult<ExperimentRunState> {
  if (nextState.state.phase === "result") {
    return {
      success: false,
      error: "Clients cannot submit calculation results",
    };
  }
  if (
    existingState?.createdBy &&
    existingState.createdBy.id !== session.userId
  ) {
    return { success: false, error: "You can only edit your own form" };
  }
  if (existingState && existingState.state.phase !== "user") {
    return {
      success: false,
      error: "This form was already submitted to technicians",
    };
  }

  return {
    success: true,
    data: {
      ...nextState,
      createdBy: existingState?.createdBy ?? actorFromSession(session),
      technicianLogs: existingState?.technicianLogs ?? [],
    },
  };
}

function normalizeTechnicianState(
  session: SessionPayload,
  existingState: ExperimentRunState | null,
  nextState: ExperimentRunState,
): ActionResult<ExperimentRunState> {
  if (!existingState || existingState.state.phase !== "worker") {
    return {
      success: false,
      error: "This form is not ready for technician edits",
    };
  }
  if (
    nextState.state.phase !== "worker" &&
    nextState.state.phase !== "result"
  ) {
    return {
      success: false,
      error: "Technicians can only save or complete technician forms",
    };
  }

  const action = nextState.state.phase === "result" ? "submit" : "save-draft";
  return {
    success: true,
    data: {
      ...nextState,
      createdBy: existingState.createdBy,
      technicianLogs: [
        ...existingState.technicianLogs,
        {
          technician: actorFromSession(session),
          action,
          at: new Date().toISOString(),
        },
      ],
      state: {
        ...nextState.state,
        answers: {
          ...nextState.state.answers,
          user: existingState.state.answers.user,
        },
      },
    },
  };
}

async function listAllTemplateSummaries(): Promise<TemplateSummary[]> {
  const defaultSampleId = getDefaultSampleId();
  if (defaultSampleId) {
    const { experiments } = await listExperimentTemplates(defaultSampleId);
    return experiments.map((row) => toTemplateSummary(defaultSampleId, row));
  }

  const { samples } = await listSamples();
  const rows = await Promise.all(
    samples.map(async (sample) => {
      const { experiments } = await listExperimentTemplates(sample.id);
      return experiments.map((row) => toTemplateSummary(sample.id, row));
    }),
  );
  return rows.flat().sort((a, b) => a.title.localeCompare(b.title));
}

/** List page — replaces storage.listForms */
export async function listTemplatesAction(): Promise<
  ActionResult<TemplateSummary[]>
> {
  try {
    const data = await listAllTemplateSummaries();
    return { success: true, data };
  } catch (error) {
    return actionError(error, "Failed to list experiment templates");
  }
}

/** Builder / preview load — replaces storage.readForm */
export async function getTemplateAction(
  ref: TemplateRef,
): Promise<ActionResult<LoadedTemplate>> {
  try {
    const template = await getExperimentTemplate(ref.sampleId, ref.templateId);
    return { success: true, data: templateDetailToLoaded(template) };
  } catch (error) {
    return actionError(error, "Failed to load experiment template");
  }
}

/** Builder save (create) — replaces storage.writeForm for new templates */
export async function createTemplateAction(
  sampleId: string,
  payload: { meta: TemplateMeta; template: ExperimentTemplate },
): Promise<ActionResult<LoadedTemplate>> {
  try {
    await requireSession("technician");
    const created = await createExperimentTemplate(
      sampleId,
      templateToCreate(payload.meta, payload.template),
    );
    revalidatePath("/");
    revalidatePath(`/samples/${sampleId}`);
    return {
      success: true,
      data: templateDetailToLoaded(created),
    };
  } catch (error) {
    return actionError(error, "Failed to create experiment template");
  }
}

/** Builder save (update) — replaces storage.writeForm for existing templates */
export async function updateTemplateAction(
  ref: TemplateRef,
  payload: { meta: TemplateMeta; template: ExperimentTemplate },
  lineageId: string,
): Promise<ActionResult<LoadedTemplate>> {
  try {
    await requireSession("technician");
    const updated = await updateExperimentTemplate(
      ref.sampleId,
      lineageId,
      templateToUpdate(payload.meta, payload.template),
    );
    revalidatePath("/");
    revalidatePath(`/samples/${ref.sampleId}`);
    revalidatePath(
      `/samples/${ref.sampleId}/templates/${ref.templateId}/builder`,
    );
    revalidatePath(
      `/samples/${ref.sampleId}/templates/${ref.templateId}/preview`,
    );
    if (updated.id !== ref.templateId) {
      revalidatePath(
        `/samples/${ref.sampleId}/templates/${updated.id}/builder`,
      );
      revalidatePath(
        `/samples/${ref.sampleId}/templates/${updated.id}/preview`,
      );
    }
    return {
      success: true,
      data: templateDetailToLoaded(updated),
    };
  } catch (error) {
    return actionError(error, "Failed to update experiment template");
  }
}

/** List / builder delete — replaces storage.deleteForm */
export async function deleteTemplateAction(
  ref: TemplateRef,
): Promise<ActionResult<void>> {
  try {
    await requireSession("technician");
    await deleteExperimentTemplate(ref.sampleId, ref.templateId);
    revalidatePath("/");
    revalidatePath(`/samples/${ref.sampleId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error, "Failed to delete experiment template");
  }
}

/**
 * Best-effort ticket lifecycle advance tied to the experiment phase. Failures
 * here must never break the form flow, so everything is swallowed.
 */
async function advanceTicketForPhase(
  expId: string,
  appRole: SessionPayload["appRole"],
  phase: ExperimentRunState["state"]["phase"],
): Promise<void> {
  let target: TicketStatus | null = null;
  if (appRole === "client" && phase === "worker") {
    target = "PENDING";
  } else if (appRole === "technician" && phase === "worker") {
    target = "EXPERIMENTING";
  } else if (appRole === "technician" && phase === "result") {
    target = "FINALIZING";
  }
  if (!target) return;

  try {
    const ticket = await findTicketByExpId(expId);
    if (ticket?.id) {
      await advanceTicketTo(ticket.id, target);
    }
  } catch {
    // ticketing lifecycle is advisory in the POC — ignore failures
  }
}

/**
 * Client requests an analysis: opens a ticket in the ticketing service, then
 * materialises the experiment in the experiment manager using the ticket's
 * experiment-template slot id as the experiment id.
 */
export async function startExperimentAction(
  ref: TemplateRef,
): Promise<ActionResult<{ expId: string }>> {
  try {
    const session = await requireSession("client");
    if (!session.organizationId) {
      return {
        success: false,
        error:
          "Your account is not linked to an organization, so a ticket cannot be created.",
      };
    }

    const template = await getExperimentTemplate(ref.sampleId, ref.templateId);
    const ticket = await createTicket({
      userId: session.userId,
      organizationId: session.organizationId,
      experimentTemplateId: template.lineage_id,
    });

    const expId = ticket.experimentTemplate?.id;
    if (!expId) {
      return {
        success: false,
        error: "Ticket was created without an experiment slot.",
      };
    }

    await createExperiment({
      exp_id: expId,
      sample_id: ref.sampleId,
      lineage_id: template.lineage_id,
    });
    revalidatePath("/experiments");
    return { success: true, data: { expId } };
  } catch (error) {
    return actionError(error, "Failed to create ticket and start experiment");
  }
}

/** Preview — persist answers / result into experiment state */
export async function saveExperimentStateAction(
  expId: string,
  state: Record<string, unknown>,
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    const nextState = parseExperimentRunState(state);
    if (!nextState) {
      return { success: false, error: "Invalid experiment state" };
    }

    const experiment = await getExperiment(expId);
    const existingState = await loadRunStateFromExperiment(expId, experiment);
    const normalized =
      session.appRole === "client"
        ? normalizeClientState(session, existingState, nextState)
        : normalizeTechnicianState(session, existingState, nextState);

    if (!normalized.success) return normalized;

    await updateExperiment(expId, buildExperimentUpdateBody(normalized.data));
    await advanceTicketForPhase(
      expId,
      session.appRole,
      normalized.data.state.phase,
    );
    revalidatePath("/experiments");
    revalidatePath(`/experiments/${expId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error, "Failed to save experiment state");
  }
}

export async function getExperimentAction(
  expId: string,
): Promise<ActionResult<Awaited<ReturnType<typeof getExperiment>>>> {
  try {
    const session = await requireSession();
    const data = await getExperiment(expId);
    if (
      !canViewExperiment(session, await loadRunStateFromExperiment(expId, data))
    ) {
      return { success: false, error: "Experiment not found" };
    }
    return { success: true, data };
  } catch (error) {
    return actionError(error, "Failed to load experiment");
  }
}

export async function deleteExperimentAction(
  expId: string,
): Promise<ActionResult<void>> {
  try {
    const session = await requireSession();
    const experiment = await getExperiment(expId);
    const runState = await loadRunStateFromExperiment(expId, experiment);
    if (
      session.appRole !== "client" ||
      !canViewExperiment(session, runState) ||
      !canResumeExperiment(session, runState)
    ) {
      return { success: false, error: "Experiment not found" };
    }
    await deleteExperiment(expId);
    revalidatePath("/experiments");
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error, "Failed to delete experiment");
  }
}

export async function listExperimentsAction(): Promise<
  ActionResult<ExperimentListItem[]>
> {
  try {
    const session = await requireSession();
    const data = await fetchExperiments(session);
    return { success: true, data };
  } catch (error) {
    return actionError(error, "Failed to list experiments");
  }
}

export async function listSamplesAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listSamples>>["samples"]>
> {
  try {
    const { samples } = await listSamples();
    return { success: true, data: samples };
  } catch (error) {
    return actionError(error, "Failed to list samples");
  }
}

export async function savePdfAction(
  sampleId: string,
  lineageId: string,
  components: unknown[],
  currentTemplateId?: string,
): Promise<ActionResult<{ templateId: string }>> {
  try {
    await requireSession("technician");
    const pdf = await upsertPdfTemplate(sampleId, lineageId, components);
    revalidatePath(`/samples/${sampleId}`);
    if (currentTemplateId) {
      revalidatePath(`/samples/${sampleId}/templates/${currentTemplateId}/pdf`);
    }
    if (pdf.template_id !== currentTemplateId) {
      revalidatePath(`/samples/${sampleId}/templates/${pdf.template_id}/pdf`);
    }
    return { success: true, data: { templateId: pdf.template_id } };
  } catch (error) {
    return actionError(error, "Failed to save PDF template");
  }
}

export async function generateReportAction(
  expId: string,
): Promise<ActionResult<void>> {
  try {
    await requireSession();
    await generateReport(expId);
    try {
      const ticket = await findTicketByExpId(expId);
      if (ticket?.id) {
        await advanceTicketTo(ticket.id, "CLOSED");
      }
    } catch {
      // ticketing lifecycle is advisory in the POC — ignore failures
    }
    revalidatePath(`/experiments/${expId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error, "Failed to queue report generation");
  }
}

export async function downloadReportAction(
  expId: string,
): Promise<ActionResult<{ url: string }>> {
  try {
    await requireSession();
    const { url } = await downloadReport(expId);
    return { success: true, data: { url } };
  } catch (error) {
    return actionError(error, "The report is not ready to download yet");
  }
}
