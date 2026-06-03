import type { FormAnswers } from "@hoshina-dev/forms";

/** POC experiment run state persisted to experiment-manager. Align with backend later. */
export type ExperimentRunState = {
  phase: "user" | "worker" | "result";
  user?: FormAnswers;
  worker?: FormAnswers;
  calculations?: Record<string, unknown>;
  summary?: string;
  errors?: Record<string, string>;
} & Record<string, unknown>;

export function parseExperimentRunState(
  state: Record<string, unknown> | undefined,
): ExperimentRunState | null {
  if (!state || typeof state !== "object") return null;
  const phase = state.phase;
  if (phase !== "user" && phase !== "worker" && phase !== "result") return null;
  return state as unknown as ExperimentRunState;
}

export function isResumablePhase(
  phase: ExperimentRunState["phase"] | null | undefined,
): phase is "user" | "worker" {
  return phase === "user" || phase === "worker";
}

export function phaseToStage(
  phase: ExperimentRunState["phase"] | null | undefined,
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
