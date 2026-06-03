import { Container, Group, Paper, Stack, Text } from "@mantine/core";
import { notFound, redirect } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { LinkAnchor } from "@/components/LinkButton";
import { ResumeExperimentFlow } from "@/components/ResumeExperimentFlow";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperimentRun } from "@/lib/experiment-manager/queries";
import { isResumablePhase } from "@/lib/experiment-manager/state";
import {
  experimentPath,
  experimentsPath,
  samplePath,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

interface ExperimentResumePageProps {
  params: Promise<{ expId: string }>;
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load experiment";
}

export default async function ExperimentResumePage({
  params,
}: ExperimentResumePageProps) {
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

  const { experiment, sample, form, runState } = data!;
  const templateRef = {
    sampleId: experiment.sample_id,
    templateId: experiment.template_id,
  };

  if (!runState) {
    redirect(experimentPath(expId));
  }

  if (!isResumablePhase(runState.phase)) {
    redirect(experimentPath(expId));
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" c="dimmed">
              {sample.name} · {form.title}
            </Text>
            <Text size="xs" c="dimmed">
              resuming experiment {expId}
            </Text>
          </div>
          <Group gap="md">
            <LinkAnchor href={experimentPath(expId)} size="sm">
              View details
            </LinkAnchor>
            <LinkAnchor href={experimentsPath()} size="sm">
              All experiments
            </LinkAnchor>
            <LinkAnchor href={samplePath(experiment.sample_id)} size="sm">
              Back to templates
            </LinkAnchor>
          </Group>
        </Group>
        <Paper withBorder p="lg" radius="md">
          <ResumeExperimentFlow
            form={form}
            experimentRef={templateRef}
            expId={expId}
            runState={runState}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
