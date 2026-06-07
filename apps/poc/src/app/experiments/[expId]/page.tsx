import {
  Code,
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
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperimentRun } from "@/lib/experiment-manager/queries";
import { isResumablePhase } from "@/lib/experiment-manager/state";
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

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load experiment";
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps) {
  const { expId } = await params;

  let data;
  let error: string | null = null;

  try {
    data = await fetchExperimentRun(expId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage(err);
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
  const resumable = stateKind === "current" && isResumablePhase(phase);
  const displayTitle = stateKind === "current" ? form.title : template.name;
  const displayDescription =
    stateKind === "current" ? form.description : template.description;

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
            <LinkButton
              href={templatePreviewPath(templateRef)}
              variant="light"
              size="xs"
            >
              New run
            </LinkButton>
            <DeleteExperimentButton expId={expId} />
          </Group>
        </Group>

        {result?.summary && (
          <Paper withBorder p="md" radius="md">
            <Title order={4}>Summary</Title>
            <Text mt="xs">{result.summary}</Text>
          </Paper>
        )}

        <Paper withBorder p="md" radius="md">
          <Title order={4}>Saved state</Title>
          {legacy ? (
            <Text size="sm" c="dimmed" mt="xs">
              This experiment uses the old flat state schema, so it is disabled
              instead of being resumed with the new template-snapshot state.
            </Text>
          ) : runState ? (
            <Code block mt="xs">
              {JSON.stringify(runState, null, 2)}
            </Code>
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
