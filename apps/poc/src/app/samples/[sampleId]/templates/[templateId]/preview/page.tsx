import { Container, Group, Paper, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { FormFlow } from "@/components/FormFlow";
import { LinkAnchor } from "@/components/LinkButton";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import {
  fetchSample,
  fetchTemplateForm,
} from "@/lib/experiment-manager/queries";
import { samplePath, templateBuilderPath } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface TemplatePreviewPageProps {
  params: Promise<{ sampleId: string; templateId: string }>;
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load template";
}

export default async function TemplatePreviewPage({
  params,
}: TemplatePreviewPageProps) {
  const { sampleId, templateId } = await params;
  const ref = { sampleId, templateId };

  let sample;
  let form;
  let error: string | null = null;

  try {
    [sample, form] = await Promise.all([
      fetchSample(sampleId),
      fetchTemplateForm(sampleId, templateId),
    ]);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage(err);
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Preview unavailable" message={error} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" c="dimmed">
              {sample!.name} · {form!.title}
            </Text>
            <Text size="xs" c="dimmed">
              template {templateId}
            </Text>
          </div>
          <Group gap="md">
            <LinkAnchor href={templateBuilderPath(ref)} size="sm">
              Edit template
            </LinkAnchor>
            <LinkAnchor href={samplePath(sampleId)} size="sm">
              Back to templates
            </LinkAnchor>
          </Group>
        </Group>
        <Paper withBorder p="lg" radius="md">
          <FormFlow key={templateId} form={form!} experimentRef={ref} />
        </Paper>
      </Stack>
    </Container>
  );
}
