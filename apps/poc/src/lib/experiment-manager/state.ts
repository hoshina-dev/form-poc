import { ExperimentTemplate, FormAnswers } from "@hoshina-dev/forms";
import { z } from "zod";

export const EXPERIMENT_RUN_STATE_SCHEMA_VERSION = 2;

function stripNullFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNullFields);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== null)
        .map(([key, entryValue]) => [key, stripNullFields(entryValue)]),
    );
  }
  return value;
}

const TemplateSnapshot = z.preprocess(stripNullFields, ExperimentTemplate);

const ExperimentRunResult = z
  .object({
    calculations: z.record(z.string(), z.unknown()),
    summary: z.string(),
    errors: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type ExperimentRunResult = z.infer<typeof ExperimentRunResult>;

const ExperimentActor = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })
  .strict();

const TechnicianLog = z
  .object({
    technician: ExperimentActor,
    action: z.enum(["save-draft", "submit"]),
    at: z.string(),
  })
  .strict();

const ExperimentRunPhaseState = z
  .object({
    phase: z.enum(["user", "worker", "result"]),
    answers: z
      .object({
        user: FormAnswers.optional(),
        worker: FormAnswers.optional(),
      })
      .strict(),
    result: ExperimentRunResult.optional(),
  })
  .strict();

const ExperimentRunStateV1 = z
  .object({
    schemaVersion: z.literal(1),
    template: TemplateSnapshot,
    state: ExperimentRunPhaseState,
  })
  .strict();

export const ExperimentRunState = z
  .object({
    schemaVersion: z.literal(EXPERIMENT_RUN_STATE_SCHEMA_VERSION),
    template: TemplateSnapshot,
    createdBy: ExperimentActor.optional(),
    technicianLogs: z.array(TechnicianLog).default([]),
    state: ExperimentRunPhaseState,
  })
  .strict();

/** POC experiment run state persisted to experiment-manager. */
export type ExperimentRunState = z.infer<typeof ExperimentRunState>;
export type ExperimentPhase = ExperimentRunState["state"]["phase"];
export type ExperimentStateKind = "current" | "legacy" | "missing";
export type ExperimentActor = z.infer<typeof ExperimentActor>;
export type TechnicianLog = z.infer<typeof TechnicianLog>;

interface CreateExperimentRunStateInput {
  template: ExperimentTemplate;
  phase: ExperimentPhase;
  createdBy?: ExperimentActor;
  technicianLogs?: TechnicianLog[];
  user?: FormAnswers;
  worker?: FormAnswers;
  result?: ExperimentRunResult;
}

export function createExperimentRunState({
  template,
  phase,
  createdBy,
  technicianLogs = [],
  user,
  worker,
  result,
}: CreateExperimentRunStateInput): ExperimentRunState {
  return {
    schemaVersion: EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
    template: TemplateSnapshot.parse(template),
    ...(createdBy ? { createdBy } : {}),
    technicianLogs,
    state: {
      phase,
      answers: {
        ...(user !== undefined ? { user } : {}),
        ...(worker !== undefined ? { worker } : {}),
      },
      ...(result ? { result } : {}),
    },
  };
}

export function parseExperimentRunState(
  state: Record<string, unknown> | undefined,
): ExperimentRunState | null {
  const result = ExperimentRunState.safeParse(state);
  if (result.success) return result.data;

  const v1 = ExperimentRunStateV1.safeParse(state);
  if (v1.success) {
    return {
      schemaVersion: EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
      template: v1.data.template,
      technicianLogs: [],
      state: v1.data.state,
    };
  }

  return null;
}

export function getExperimentStateKind(
  state: Record<string, unknown> | undefined,
): ExperimentStateKind {
  if (parseExperimentRunState(state)) return "current";
  if (!state || typeof state !== "object") return "missing";

  const phase = state.phase;
  if (
    state.schemaVersion === undefined &&
    (phase === "user" || phase === "worker" || phase === "result")
  ) {
    return "legacy";
  }

  return "missing";
}

export function isResumablePhase(
  phase: ExperimentPhase | null | undefined,
): phase is "user" | "worker" {
  return phase === "user" || phase === "worker";
}

export function phaseToStage(
  phase: ExperimentPhase | null | undefined,
  skipUser: boolean,
): 0 | 1 | 2 {
  switch (phase) {
    case "user":
      return skipUser ? 1 : 0;
    case "worker":
      return 1;
    case "result":
      return 2;
    default:
      return skipUser ? 1 : 0;
  }
}
