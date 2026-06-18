import { Container, Group, Paper, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { FormFlow } from "@/components/FormFlow";
import { LinkAnchor } from "@/components/LinkButton";
import { requireSession, toSessionUser } from "@/lib/auth/dal";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import {
  fetchSample,
  fetchTemplateForm,
} from "@/lib/experiment-manager/queries";
import { samplePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

interface TemplatePreviewPageProps {
  params: Promise<{ sampleId: string; templateId: string }>;
}

function loadErrorMessage(): string {
  return "This template is unavailable right now. Please try again later.";
}

export default async function TemplatePreviewPage({
  params,
}: TemplatePreviewPageProps) {
  const { sampleId, templateId } = await params;
  const ref = { sampleId, templateId };
  const session = await requireSession("client");

  let sample;
  let loaded;
  let error: string | null = null;

  try {
    [sample, loaded] = await Promise.all([
      fetchSample(sampleId),
      fetchTemplateForm(sampleId, templateId),
    ]);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage();
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Preview unavailable" message={error} />
      </Container>
    );
  }

  if (!loaded!.valid) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel
          title="Legacy template"
          message="This template uses a legacy format and cannot be filled."
        />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" c="dimmed">
              {sample!.name} · {loaded!.meta.title}
            </Text>
            <Text size="xs" c="dimmed">
              template {templateId}
            </Text>
          </div>
          <LinkAnchor href={samplePath(sampleId)} size="sm">
            Back to templates
          </LinkAnchor>
        </Group>
        <Paper withBorder p="lg" radius="md">
          <FormFlow
            key={templateId}
            template={loaded!.template}
            title={loaded!.meta.title}
            description={loaded!.meta.description}
            viewer={toSessionUser(session)}
            experimentRef={ref}
          />
        </Paper>
      </Stack>
    </Container>
  );
}
