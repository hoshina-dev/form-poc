export const TICKET_STATUS_ORDER = [
  "REQUESTED",
  "PENDING",
  "EXPERIMENTING",
  "FINALIZING",
  "CLOSED",
] as const;

export type TicketStatus = (typeof TICKET_STATUS_ORDER)[number];

/** Human-friendly labels mapped to the demo flow narrative. */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  REQUESTED: "Requested",
  PENDING: "Sample received",
  EXPERIMENTING: "Experiment in progress",
  FINALIZING: "Results submitted",
  CLOSED: "Completed",
};

export const TICKET_STATUS_COLORS: Record<TicketStatus, string> = {
  REQUESTED: "blue",
  PENDING: "cyan",
  EXPERIMENTING: "yellow",
  FINALIZING: "indigo",
  CLOSED: "green",
};

export function ticketStatusIndex(status: string | null | undefined): number {
  if (!status) return -1;
  return TICKET_STATUS_ORDER.indexOf(status as TicketStatus);
}

export function ticketStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return TICKET_STATUS_LABELS[status as TicketStatus] ?? status;
}

export function ticketStatusColor(status: string | null | undefined): string {
  if (!status) return "gray";
  return TICKET_STATUS_COLORS[status as TicketStatus] ?? "gray";
}

/**
 * Returns the ordered list of statuses to PATCH through to move a ticket from
 * its current status up to `target`. The lifecycle is strictly linear, so a
 * multi-step jump (e.g. REQUESTED → EXPERIMENTING) walks each intermediate
 * status. Returns an empty array when the target is at or behind the current
 * status, or when either status is unknown.
 */
export function statusesToAdvance(
  current: string | null | undefined,
  target: TicketStatus,
): TicketStatus[] {
  const currentIndex = ticketStatusIndex(current);
  const targetIndex = TICKET_STATUS_ORDER.indexOf(target);
  if (currentIndex < 0 || targetIndex < 0 || targetIndex <= currentIndex) {
    return [];
  }
  return TICKET_STATUS_ORDER.slice(currentIndex + 1, targetIndex + 1);
}
