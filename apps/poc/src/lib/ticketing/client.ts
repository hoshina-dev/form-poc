import "server-only";

import {
  TicketingConfiguration,
  type TicketingTicketResponse,
  TicketsApi,
} from "@hoshina-dev/api-client";

import { statusesToAdvance, type TicketStatus } from "./status";

const DEFAULT_URL = "http://ticketing-service.mapfox.hoshina.san";

export function getTicketingUrl(): string {
  return process.env.TICKETING_SERVICE_URL?.replace(/\/$/, "") ?? DEFAULT_URL;
}

const configuration = new TicketingConfiguration({
  basePath: getTicketingUrl(),
  fetchApi: (input, init) => fetch(input, { ...init, cache: "no-store" }),
});

const ticketsApi = new TicketsApi(configuration);

export type Ticket = TicketingTicketResponse;

export async function createTicket(params: {
  userId: string;
  organizationId: string;
  experimentTemplateId: string;
}): Promise<Ticket> {
  return ticketsApi.apiV1TicketsPost({
    userId: params.userId,
    organizationId: params.organizationId,
    experimentTemplateId: params.experimentTemplateId,
  });
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  return ticketsApi.apiV1TicketsIdGet(ticketId);
}

export async function listTickets(
  filter: { userId?: string } = {},
): Promise<Ticket[]> {
  return ticketsApi.apiV1TicketsGet(filter.userId);
}

/**
 * Resolves the ticket that owns an experiment. The experiment id equals the
 * ticket's `experiment_template.id` (the join-row id assigned by the ticketing
 * service), so we list tickets and match on that.
 */
export async function findTicketByExpId(
  expId: string,
  filter: { userId?: string } = {},
): Promise<Ticket | null> {
  const tickets = await listTickets(filter);
  return tickets.find((t) => t.experimentTemplate?.id === expId) ?? null;
}

/** Walks a ticket forward through the linear lifecycle up to `target`. */
export async function advanceTicketTo(
  ticketId: string,
  target: TicketStatus,
): Promise<void> {
  const ticket = await getTicket(ticketId);
  for (const next of statusesToAdvance(ticket.status, target)) {
    await ticketsApi.apiV1TicketsIdStatusPatch(ticketId, { status: next });
  }
}
