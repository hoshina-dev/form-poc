import { Badge, type BadgeProps } from "@mantine/core";

import type { ExperimentRunState } from "@/lib/experiment-manager/state";

const PHASE_LABELS: Record<
  NonNullable<ExperimentRunState["phase"]> | "unknown",
  string
> = {
  user: "User phase",
  worker: "Worker phase",
  result: "Complete",
  unknown: "No saved state",
};

const PHASE_COLORS: Record<
  NonNullable<ExperimentRunState["phase"]> | "unknown",
  BadgeProps["color"]
> = {
  user: "blue",
  worker: "yellow",
  result: "green",
  unknown: "gray",
};

export function experimentPhaseLabel(
  phase: ExperimentRunState["phase"] | null | undefined,
): string {
  if (!phase) return PHASE_LABELS.unknown;
  return PHASE_LABELS[phase] ?? PHASE_LABELS.unknown;
}

export function ExperimentPhaseBadge({
  phase,
  size = "sm",
}: {
  phase: ExperimentRunState["phase"] | null | undefined;
  size?: BadgeProps["size"];
}) {
  const key = phase ?? "unknown";
  return (
    <Badge
      color={PHASE_COLORS[key] ?? PHASE_COLORS.unknown}
      variant="light"
      size={size}
    >
      {experimentPhaseLabel(phase)}
    </Badge>
  );
}
