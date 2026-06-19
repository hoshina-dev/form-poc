import {
  Badge,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { notFound } from "next/navigation";

import { DeleteExperimentButton } from "@/components/DeleteExperimentButton";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ExperimentPhaseBadge } from "@/components/ExperimentPhaseBadge";
import { ExperimentStatusPanel } from "@/components/ExperimentStatusPanel";
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { ReportPanel } from "@/components/ReportPanel";
import { requireSession } from "@/lib/auth/dal";
import {
  canResumeExperiment,
  canViewExperiment,
} from "@/lib/experiment-manager/access";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperimentRun } from "@/lib/experiment-manager/queries";
import { formatDateTime } from "@/lib/format-datetime";
import {
  experimentPath,
  experimentResumePath,
  experimentsPath,
  samplePath,
  templatePreviewPath,
} from "@/lib/routes";
import { ticketStatusColor, ticketStatusLabel } from "@/lib/ticketing/status";

export const dynamic = "force-dynamic";

interface ExperimentDetailPageProps {
  params: Promise<{ expId: string }>;
}

function loadErrorMessage(): string {
  return "This experiment is unavailable right now. Please try again later.";
}

export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps) {
  const { expId } = await params;
  const session = await requireSession();

  let data;
  let error: string | null = null;

  try {
    data = await fetchExperimentRun(expId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage();
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Experiment unavailable" message={error} />
      </Container>
    );
  }

  const { experiment, sample, template, ticket, runState, stateKind } = data!;
  const templateRef = {
    sampleId: experiment.sample_id,
    templateId: experiment.template_id,
  };
  const phase = runState?.state.phase ?? null;
  const result = runState?.state.result;
  const reportStatus = (experiment.report_status as string | null) ?? null;
  const reportGeneratedAt =
    (experiment.report_generated_at as string | null) ?? null;
  const canGenerateReport =
    session.appRole === "technician" && phase === "result";
  const resumable =
    stateKind === "current" && canResumeExperiment(session, runState);
  if (!canViewExperiment(session, runState)) {
    notFound();
  }
  const displayTitle = experiment.name ?? experiment.title ?? template.name;
  const displayDescription =
    typeof template.description === "string" ? template.description : undefined;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <LinkAnchor href={experimentsPath()} size="sm">
              ← All experiments
            </LinkAnchor>
            <Group gap="xs" mt="xs" mb={4}>
              <Title order={1}>{displayTitle}</Title>
              <ExperimentPhaseBadge phase={phase} stateKind={stateKind} />
              {ticket?.status && (
                <Badge color={ticketStatusColor(ticket.status)} variant="light">
                  {ticketStatusLabel(ticket.status)}
                </Badge>
              )}
            </Group>
            <Text c="dimmed">{sample.name}</Text>
            {displayDescription && (
              <Text size="sm" c="dimmed" mt={4}>
                {displayDescription}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              Started {formatDateTime(experiment.created_at)} · id: {expId}
            </Text>
            {runState?.createdBy && (
              <Text size="xs" c="dimmed" mt={4}>
                Client: {runState.createdBy.name}
                {runState.technicianLogs.length > 0
                  ? ` · technician changes: ${runState.technicianLogs.length}`
                  : ""}
              </Text>
            )}
          </div>
          <Group gap="xs">
            {resumable && (
              <LinkButton
                href={experimentResumePath(expId)}
                variant="filled"
                size="xs"
              >
                Resume
              </LinkButton>
            )}
            {session.appRole === "client" && (
              <LinkButton
                href={templatePreviewPath(templateRef)}
                variant="light"
                size="xs"
              >
                New run
              </LinkButton>
            )}
            {session.appRole === "client" && phase === "user" && (
              <DeleteExperimentButton expId={expId} />
            )}
          </Group>
        </Group>

        {result?.summary && (
          <Paper withBorder p="md" radius="md">
            <Title order={4}>Summary</Title>
            <Text mt="xs">{result.summary}</Text>
          </Paper>
        )}

        {(phase === "result" || reportStatus) && (
          <ReportPanel
            expId={expId}
            reportStatus={reportStatus}
            reportGeneratedAt={reportGeneratedAt}
            canGenerate={canGenerateReport}
          />
        )}

        <Paper withBorder p="md" radius="md">
          <Title order={4} mb="sm">
            Form progress
          </Title>
          <ExperimentStatusPanel
            expId={expId}
            phase={phase}
            stateKind={stateKind}
            runState={runState}
            ticketStatus={(ticket?.status as string | null) ?? null}
            resumable={resumable}
          />
        </Paper>

        <Group gap="md">
          <LinkAnchor href={samplePath(experiment.sample_id)} size="sm">
            View sample templates
          </LinkAnchor>
          <LinkAnchor href={experimentPath(expId)} size="sm" c="dimmed">
            Refresh
          </LinkAnchor>
        </Group>
      </Stack>
    </Container>
  );
}
