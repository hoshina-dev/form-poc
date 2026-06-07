"use server";

import type { FormSchema } from "@hoshina-dev/forms";
import { revalidatePath } from "next/cache";

import { requireSession } from "@/lib/auth/dal";
import type { SessionPayload } from "@/lib/auth/definitions";
import {
  canResumeExperiment,
  canViewExperiment,
} from "@/lib/experiment-manager/access";
import {
  createExperiment,
  createExperimentTemplate,
  deleteExperiment,
  deleteExperimentTemplate,
  ExperimentManagerError,
  getExperiment,
  getExperimentTemplate,
  listExperimentTemplates,
  listSamples,
  updateExperiment,
  updateExperimentTemplate,
} from "@/lib/experiment-manager/client";
import { getDefaultSampleId } from "@/lib/experiment-manager/config";
import {
  formSchemaToTemplateCreate,
  formSchemaToTemplateUpdate,
  type TemplateRef,
  type TemplateSummary,
  templateToFormSchema,
  toTemplateSummary,
} from "@/lib/experiment-manager/mappers";
import {
  type ExperimentListItem,
  fetchExperiments,
} from "@/lib/experiment-manager/queries";
import {
  type ExperimentActor,
  type ExperimentRunState,
  parseExperimentRunState,
} from "@/lib/experiment-manager/state";

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

function stateRecord(state: ExperimentRunState): Record<string, unknown> {
  return state as unknown as Record<string, unknown>;
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
): Promise<ActionResult<FormSchema>> {
  try {
    const template = await getExperimentTemplate(ref.sampleId, ref.templateId);
    return { success: true, data: templateToFormSchema(template) };
  } catch (error) {
    return actionError(error, "Failed to load experiment template");
  }
}

/** Builder save (create) — replaces storage.writeForm for new templates */
export async function createTemplateAction(
  sampleId: string,
  form: FormSchema,
): Promise<ActionResult<FormSchema>> {
  try {
    await requireSession("client");
    const created = await createExperimentTemplate(
      sampleId,
      formSchemaToTemplateCreate(form),
    );
    revalidatePath("/");
    revalidatePath(`/samples/${sampleId}`);
    return {
      success: true,
      data: templateToFormSchema(created),
    };
  } catch (error) {
    return actionError(error, "Failed to create experiment template");
  }
}

/** Builder save (update) — replaces storage.writeForm for existing templates */
export async function updateTemplateAction(
  ref: TemplateRef,
  form: FormSchema,
): Promise<ActionResult<FormSchema>> {
  try {
    await requireSession("client");
    const updated = await updateExperimentTemplate(
      ref.sampleId,
      ref.templateId,
      formSchemaToTemplateUpdate(form),
    );
    revalidatePath("/");
    revalidatePath(`/samples/${ref.sampleId}`);
    revalidatePath(
      `/samples/${ref.sampleId}/templates/${ref.templateId}/builder`,
    );
    revalidatePath(
      `/samples/${ref.sampleId}/templates/${ref.templateId}/preview`,
    );
    return {
      success: true,
      data: templateToFormSchema(updated),
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
    await requireSession("client");
    await deleteExperimentTemplate(ref.sampleId, ref.templateId);
    revalidatePath("/");
    revalidatePath(`/samples/${ref.sampleId}`);
    return { success: true, data: undefined };
  } catch (error) {
    return actionError(error, "Failed to delete experiment template");
  }
}

/** Preview run — create a live experiment instance from a template */
export async function startExperimentAction(
  ref: TemplateRef,
  expId: string,
): Promise<ActionResult<{ expId: string }>> {
  try {
    await requireSession("client");
    await createExperiment({
      exp_id: expId,
      sample_id: ref.sampleId,
      template_id: ref.templateId,
    });
    revalidatePath("/experiments");
    return { success: true, data: { expId } };
  } catch (error) {
    return actionError(error, "Failed to start experiment");
  }
}

/** Preview — persist answers / result into experiment.state */
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
    const existingState = parseExperimentRunState(experiment.state);
    const normalized =
      session.appRole === "client"
        ? normalizeClientState(session, existingState, nextState)
        : normalizeTechnicianState(session, existingState, nextState);

    if (!normalized.success) return normalized;

    await updateExperiment(expId, { state: stateRecord(normalized.data) });
    revalidatePath("/experiments");
    revalidatePath(`/experiments/${expId}`);
    revalidatePath(`/experiments/${expId}/resume`);
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
    if (!canViewExperiment(session, parseExperimentRunState(data.state))) {
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
    const runState = parseExperimentRunState(experiment.state);
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
