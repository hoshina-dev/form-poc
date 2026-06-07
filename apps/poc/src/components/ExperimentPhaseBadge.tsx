import { Badge, type BadgeProps } from "@mantine/core";

import type {
  ExperimentPhase,
  ExperimentStateKind,
} from "@/lib/experiment-manager/state";

type PhaseBadgeKey = ExperimentPhase | "legacy" | "unknown";

const PHASE_LABELS: Record<PhaseBadgeKey, string> = {
  user: "User phase",
  worker: "Worker phase",
  result: "Complete",
  legacy: "Legacy state",
  unknown: "No saved state",
};

const PHASE_COLORS: Record<PhaseBadgeKey, BadgeProps["color"]> = {
  user: "blue",
  worker: "yellow",
  result: "green",
  legacy: "gray",
  unknown: "gray",
};

export function experimentPhaseLabel(
  phase: ExperimentPhase | null | undefined,
  stateKind: ExperimentStateKind = phase ? "current" : "missing",
): string {
  if (stateKind === "legacy") return PHASE_LABELS.legacy;
  if (!phase) return PHASE_LABELS.unknown;
  return PHASE_LABELS[phase] ?? PHASE_LABELS.unknown;
}

export function ExperimentPhaseBadge({
  phase,
  stateKind,
  size = "sm",
}: {
  phase: ExperimentPhase | null | undefined;
  stateKind?: ExperimentStateKind;
  size?: BadgeProps["size"];
}) {
  const key: PhaseBadgeKey =
    stateKind === "legacy" ? "legacy" : (phase ?? "unknown");
  return (
    <Badge
      color={PHASE_COLORS[key] ?? PHASE_COLORS.unknown}
      variant="light"
      size={size}
    >
      {experimentPhaseLabel(phase, stateKind)}
    </Badge>
  );
}
