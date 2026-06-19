import { Container, Group, Paper, Stack, Text } from "@mantine/core";
import { notFound, redirect } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { LinkAnchor } from "@/components/LinkButton";
import { ResumeExperimentFlow } from "@/components/ResumeExperimentFlow";
import { requireSession, toSessionUser } from "@/lib/auth/dal";
import {
  canResumeExperiment,
  canViewExperiment,
} from "@/lib/experiment-manager/access";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperimentRun } from "@/lib/experiment-manager/queries";
import { experimentPath, experimentsPath, samplePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface ExperimentResumePageProps {
  params: Promise<{ expId: string }>;
}

function loadErrorMessage(): string {
  return "This experiment is unavailable right now. Please try again later.";
}

export default async function ExperimentResumePage({
  params,
}: ExperimentResumePageProps) {
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

  const { experiment, sample, form, runState } = data!;
  const templateRef = {
    sampleId: experiment.sample_id,
    templateId: experiment.template_id,
  };

  if (!runState) {
    redirect(experimentPath(expId));
  }

  const resumable = canResumeExperiment(session, runState);
  const viewableResult =
    runState.state.phase === "result" && canViewExperiment(session, runState);

  if (!resumable && !viewableResult) {
    redirect(experimentPath(expId));
  }

  const experimentTitle = experiment.name ?? experiment.title ?? "Experiment";

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" c="dimmed">
              {sample.name} · {experimentTitle}
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
            template={form}
            title={experimentTitle}
            description={form.labForm?.description ?? undefined}
            experimentRef={templateRef}
            expId={expId}
            runState={runState}
            viewer={toSessionUser(session)}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
