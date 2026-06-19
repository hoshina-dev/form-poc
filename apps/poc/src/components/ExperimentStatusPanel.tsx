import {
  Badge,
  Box,
  Code,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Stepper,
  StepperStep,
  Text,
  ThemeIcon,
  Timeline,
  TimelineItem,
} from "@mantine/core";

import { LinkAnchor } from "@/components/LinkButton";
import { experimentPhaseLabel } from "@/components/ExperimentPhaseBadge";
import type {
  ExperimentPhase,
  ExperimentRunState,
  ExperimentStateKind,
} from "@/lib/experiment-manager/state";
import { phaseToStage } from "@/lib/experiment-manager/state";
import { experimentResumePath } from "@/lib/routes";
import { formatDateTime } from "@/lib/format-datetime";
import {
  ticketStatusColor,
  ticketStatusLabel,
  TICKET_STATUS_ORDER,
} from "@/lib/ticketing/status";

interface ExperimentStatusPanelProps {
  expId: string;
  phase: ExperimentPhase | null;
  stateKind: ExperimentStateKind;
  runState: ExperimentRunState | null;
  ticketStatus: string | null;
  resumable: boolean;
}

function answerCount(answers: Record<string, unknown> | undefined): number {
  return Object.keys(answers ?? {}).length;
}

function StatusGlyph({ done, active }: { done: boolean; active: boolean }) {
  const label = done ? "Done" : active ? "In progress" : "Pending";
  const color = done ? "green" : active ? "blue" : "gray";
  return (
    <ThemeIcon
      size={28}
      radius="xl"
      variant={done || active ? "filled" : "light"}
      color={color}
      aria-label={label}
    >
      <Text size="xs" fw={700}>
        {done ? "✓" : active ? "…" : "·"}
      </Text>
    </ThemeIcon>
  );
}

export function ExperimentStatusPanel({
  expId,
  phase,
  stateKind,
  runState,
  ticketStatus,
  resumable,
}: ExperimentStatusPanelProps) {
  if (stateKind === "legacy") {
    return (
      <Text size="sm" c="dimmed">
        This experiment uses the old flat state schema, so it is disabled instead
        of being resumed with the new template-snapshot state.
      </Text>
    );
  }

  if (!runState) {
    return (
      <Text size="sm" c="dimmed">
        This experiment has no recognized run state yet.{" "}
        {resumable ? (
          <LinkAnchor href={experimentResumePath(expId)} size="sm">
            Resume the run
          </LinkAnchor>
        ) : (
          "Start a new run from the template preview."
        )}
      </Text>
    );
  }

  const activeStage = phaseToStage(phase);
  const clientAnswers = answerCount(runState.state.answers.user);
  const workerAnswers = answerCount(runState.state.answers.worker);
  const latestTechnicianLog = runState.technicianLogs.at(-1);
  const resultSummary = runState.state.result?.summary;
  const ticketIndex = ticketStatus
    ? TICKET_STATUS_ORDER.indexOf(ticketStatus as (typeof TICKET_STATUS_ORDER)[number])
    : -1;

  return (
    <Stack gap="lg">
      <Stepper active={activeStage} allowNextStepsSelect={false} size="sm">
        <StepperStep
          label="Client intake"
          description={
            clientAnswers > 0
              ? `${clientAnswers} field${clientAnswers === 1 ? "" : "s"} answered`
              : "Waiting for client"
          }
        />
        <StepperStep
          label="Lab work"
          description={
            workerAnswers > 0
              ? `${workerAnswers} field${workerAnswers === 1 ? "" : "s"} recorded`
              : "Waiting for technician"
          }
        />
        <StepperStep
          label="Results"
          description={
            resultSummary ? "Calculated" : phase === "result" ? "Ready" : "Pending"
          }
        />
      </Stepper>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        <Paper withBorder p="md" radius="md">
          <Group gap="sm" mb="xs">
            <StatusGlyph done={clientAnswers > 0} active={phase === "user"} />
            <div>
              <Text fw={600}>Client</Text>
              <Text size="xs" c="dimmed">
                {experimentPhaseLabel("user")}
              </Text>
            </div>
          </Group>
          {runState.createdBy ? (
            <Stack gap={4}>
              <Text size="sm">{runState.createdBy.name}</Text>
              <Text size="xs" c="dimmed">
                {runState.createdBy.email}
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No client on file
            </Text>
          )}
          <Badge
            mt="sm"
            variant="light"
            color={clientAnswers > 0 ? "green" : "gray"}
          >
            {clientAnswers > 0
              ? `${clientAnswers} answer${clientAnswers === 1 ? "" : "s"} saved`
              : "Not started"}
          </Badge>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group gap="sm" mb="xs">
            <StatusGlyph
              done={workerAnswers > 0 || phase === "result"}
              active={phase === "worker"}
            />
            <div>
              <Text fw={600}>Technician</Text>
              <Text size="xs" c="dimmed">
                {experimentPhaseLabel("worker")}
              </Text>
            </div>
          </Group>
          {latestTechnicianLog ? (
            <Stack gap={4}>
              <Text size="sm">{latestTechnicianLog.technician.name}</Text>
              <Text size="xs" c="dimmed">
                Last activity {formatDateTime(latestTechnicianLog.at)}
              </Text>
            </Stack>
          ) : (
            <Text size="sm" c="dimmed">
              No technician activity yet
            </Text>
          )}
          <Group gap="xs" mt="sm">
            <Badge
              variant="light"
              color={workerAnswers > 0 ? "green" : "gray"}
            >
              {workerAnswers > 0
                ? `${workerAnswers} answer${workerAnswers === 1 ? "" : "s"} saved`
                : "Not started"}
            </Badge>
            {runState.technicianLogs.length > 0 && (
              <Badge variant="light" color="yellow">
                {runState.technicianLogs.length} save
                {runState.technicianLogs.length === 1 ? "" : "s"}
              </Badge>
            )}
          </Group>
        </Paper>
      </SimpleGrid>

      {resultSummary && (
        <Paper withBorder p="md" radius="md" bg="green.0">
          <Group gap="sm" mb="xs">
            <StatusGlyph done active={false} />
            <Text fw={600}>Calculation summary</Text>
          </Group>
          <Text size="sm">{resultSummary}</Text>
        </Paper>
      )}

      {ticketStatus && (
        <Box>
          <Text fw={600} mb="sm">
            Ticket progress
          </Text>
          <Timeline active={ticketIndex} bulletSize={22} lineWidth={2}>
            {TICKET_STATUS_ORDER.map((status, index) => {
              const reached = ticketIndex >= index;
              const isCurrent = ticketStatus === status;
              return (
                <TimelineItem
                  key={status}
                  title={ticketStatusLabel(status)}
                  bullet={
                    <ThemeIcon
                      size={22}
                      radius="xl"
                      variant={reached ? "filled" : "light"}
                      color={
                        reached ? ticketStatusColor(status) : "gray"
                      }
                    >
                      <Text size="10px" fw={700}>
                        {reached ? "✓" : index + 1}
                      </Text>
                    </ThemeIcon>
                  }
                >
                  {isCurrent && (
                    <Badge
                      size="xs"
                      variant="light"
                      color={ticketStatusColor(status)}
                    >
                      Current
                    </Badge>
                  )}
                </TimelineItem>
              );
            })}
          </Timeline>
        </Box>
      )}

      {resumable && (
        <Text size="sm">
          <LinkAnchor href={experimentResumePath(expId)}>
            Continue where you left off →
          </LinkAnchor>
        </Text>
      )}

      <details>
        <summary>
          <Text component="span" size="sm" fw={600}>
            View raw state JSON
          </Text>
        </summary>
        <Code block mt="xs">
          {JSON.stringify(runState, null, 2)}
        </Code>
      </details>
    </Stack>
  );
}
