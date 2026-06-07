import {
  Code,
  Container,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notFound } from "next/navigation";

import { DeleteExperimentButton } from "@/components/DeleteExperimentButton";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ExperimentPhaseBadge } from "@/components/ExperimentPhaseBadge";
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { requireSession } from "@/lib/auth/dal";
import {
  canResumeExperiment,
  canViewExperiment,
} from "@/lib/experiment-manager/access";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperimentRun } from "@/lib/experiment-manager/queries";
import {
  experimentPath,
  experimentResumePath,
  experimentsPath,
  samplePath,
  templatePreviewPath,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

interface ExperimentDetailPageProps {
  params: Promise<{ expId: string }>;
}

function loadErrorMessage(): string {
  return "This experiment is unavailable right now. Please try again later.";
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatPhase(phase: string | null): string {
  switch (phase) {
    case "user":
      return "Waiting for client";
    case "worker":
      return "Waiting for technician";
    case "result":
      return "Completed";
    default:
      return "Not started";
  }
}

function answerCount(answers: Record<string, unknown> | undefined): string {
  const count = Object.keys(answers ?? {}).length;
  return count === 1 ? "1 answer" : `${count} answers`;
}

function fallback(value: string | undefined): string {
  return value?.trim() || "-";
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

  const { experiment, form, sample, template, runState, stateKind } = data!;
  const templateRef = {
    sampleId: experiment.sample_id,
    templateId: experiment.template_id,
  };
  const phase = runState?.state.phase ?? null;
  const result = runState?.state.result;
  const legacy = stateKind === "legacy";
  const resumable =
    stateKind === "current" && canResumeExperiment(session, runState);
  if (!canViewExperiment(session, runState)) {
    notFound();
  }
  const displayTitle = stateKind === "current" ? form.title : template.name;
  const displayDescription =
    stateKind === "current" ? form.description : template.description;
  const latestTechnicianLog = runState?.technicianLogs.at(-1);

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
            </Group>
            <Text c="dimmed">{sample.name}</Text>
            {displayDescription && (
              <Text size="sm" c="dimmed" mt={4}>
                {displayDescription}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              Started {formatCreatedAt(experiment.created_at)} · id: {expId}
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

        <Paper withBorder p="md" radius="md">
          <Title order={4}>Form status</Title>
          {legacy ? (
            <Text size="sm" c="dimmed" mt="xs">
              This experiment uses the old flat state schema, so it is disabled
              instead of being resumed with the new template-snapshot state.
            </Text>
          ) : runState ? (
            <Stack gap="md" mt="xs">
              <Table withTableBorder withColumnBorders>
                <tbody>
                  <tr>
                    <th>Status</th>
                    <td>{formatPhase(phase)}</td>
                  </tr>
                  <tr>
                    <th>Client</th>
                    <td>
                      {runState.createdBy
                        ? `${runState.createdBy.name} (${runState.createdBy.email})`
                        : "-"}
                    </td>
                  </tr>
                  <tr>
                    <th>Client section</th>
                    <td>{answerCount(runState.state.answers.user)}</td>
                  </tr>
                  <tr>
                    <th>Technician section</th>
                    <td>{answerCount(runState.state.answers.worker)}</td>
                  </tr>
                  <tr>
                    <th>Technician changes</th>
                    <td>{runState.technicianLogs.length}</td>
                  </tr>
                  <tr>
                    <th>Latest technician</th>
                    <td>
                      {latestTechnicianLog
                        ? `${latestTechnicianLog.technician.name} (${formatCreatedAt(latestTechnicianLog.at)})`
                        : "-"}
                    </td>
                  </tr>
                  <tr>
                    <th>Calculation result</th>
                    <td>
                      {runState.state.result
                        ? fallback(runState.state.result.summary)
                        : "-"}
                    </td>
                  </tr>
                </tbody>
              </Table>

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
          ) : (
            <Text size="sm" c="dimmed" mt="xs">
              This experiment has no recognized run state yet.{" "}
              {resumable ? (
                <LinkAnchor href={experimentResumePath(expId)} size="sm">
                  Resume the run
                </LinkAnchor>
              ) : (
                "Start a new run from the template preview."
              )}
            </Text>
          )}
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
