/* eslint-disable @typescript-eslint/no-namespace */

export namespace ExperimentManager {
  export type Paths = import("./experiment-manager").paths;
  export type Components = import("./experiment-manager").components;
  export type Operations = import("./experiment-manager").operations;
}

export type { UserDetailResponse, UserResponse } from "./custapi";
export {
  Configuration as CustApiConfiguration,
  ResponseError as CustApiResponseError,
  OrganizationsApi,
  UsersApi,
} from "./custapi";
export type {
  GithubComHoshinaDevTicketingServiceInternalDtoAddExperimentTemplateRequest as TicketingAddExperimentTemplateRequest,
  GithubComHoshinaDevTicketingServiceInternalDtoCreateTicketRequest as TicketingCreateTicketRequest,
  GithubComHoshinaDevTicketingServiceInternalDtoErrorResponse as TicketingErrorResponse,
  GithubComHoshinaDevTicketingServiceInternalDtoTicketExperimentTemplateResponse as TicketingExperimentTemplateResponse,
  GithubComHoshinaDevTicketingServiceInternalDtoTicketResponse as TicketingTicketResponse,
  GithubComHoshinaDevTicketingServiceInternalDtoTransitionStatusRequest as TicketingTransitionStatusRequest,
} from "./ticketing";
export {
  Configuration as TicketingConfiguration,
  ExperimentTemplatesApi as TicketingExperimentTemplatesApi,
  HealthApi as TicketingHealthApi,
  ResponseError as TicketingResponseError,
  TicketsApi,
} from "./ticketing";
