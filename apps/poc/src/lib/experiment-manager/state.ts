import { FormAnswers, FormSchema } from "@hoshina-dev/forms";
import { z } from "zod";

export const EXPERIMENT_RUN_STATE_SCHEMA_VERSION = 1;

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

const TemplateSnapshot = z.preprocess(stripNullFields, FormSchema);

const ExperimentRunResult = z
  .object({
    calculations: z.record(z.string(), z.unknown()),
    summary: z.string(),
    errors: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export type ExperimentRunResult = z.infer<typeof ExperimentRunResult>;

export const ExperimentRunState = z
  .object({
    schemaVersion: z.literal(EXPERIMENT_RUN_STATE_SCHEMA_VERSION),
    template: TemplateSnapshot,
    state: z
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
      .strict(),
  })
  .strict();

/** POC experiment run state persisted to experiment-manager. */
export type ExperimentRunState = z.infer<typeof ExperimentRunState>;
export type ExperimentPhase = ExperimentRunState["state"]["phase"];
export type ExperimentStateKind = "current" | "legacy" | "missing";

interface CreateExperimentRunStateInput {
  template: FormSchema;
  phase: ExperimentPhase;
  user?: FormAnswers;
  worker?: FormAnswers;
  result?: ExperimentRunResult;
}

export function createExperimentRunState({
  template,
  phase,
  user,
  worker,
  result,
}: CreateExperimentRunStateInput): ExperimentRunState {
  return {
    schemaVersion: EXPERIMENT_RUN_STATE_SCHEMA_VERSION,
    template: TemplateSnapshot.parse(template),
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
  return result.success ? result.data : null;
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
