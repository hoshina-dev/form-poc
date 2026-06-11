import type { SessionPayload } from "@/lib/auth/definitions";

import type { ExperimentRunState } from "./state";

export function isRunOwner(
  session: SessionPayload,
  runState: ExperimentRunState | null,
): boolean {
  return runState?.createdBy?.id === session.userId;
}

export function canViewExperiment(
  session: SessionPayload,
  runState: ExperimentRunState | null,
): boolean {
  if (!runState) return false;
  if (session.appRole === "client") {
    return runState.state.phase === "user";
  }
  return runState.state.phase === "worker" || runState.state.phase === "result";
}

export function canResumeExperiment(
  session: SessionPayload,
  runState: ExperimentRunState | null,
): boolean {
  if (!runState) return false;
  if (session.appRole === "client") {
    return runState.state.phase === "user";
  }
  return runState.state.phase === "worker";
}
