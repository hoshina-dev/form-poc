import { Card, Container, Group, Stack, Text, Title } from "@mantine/core";
import { notFound } from "next/navigation";

import { EmptyStatePanel, ErrorPanel } from "@/components/ErrorPanel";
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { requireSession } from "@/lib/auth/dal";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import {
  fetchSample,
  fetchSampleTemplates,
} from "@/lib/experiment-manager/queries";
import {
  newTemplatePath,
  templateBuilderPath,
  templatePreviewPath,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

interface SampleTemplatesPageProps {
  params: Promise<{ sampleId: string }>;
}

function loadErrorMessage(): string {
  return "Templates are unavailable right now. Please try again later.";
}

export default async function SampleTemplatesPage({
  params,
}: SampleTemplatesPageProps) {
  await requireSession("client");
  const { sampleId } = await params;

  let sample;
  let templates;
  let error: string | null = null;

  try {
    [sample, templates] = await Promise.all([
      fetchSample(sampleId),
      fetchSampleTemplates(sampleId),
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
        <ErrorPanel title="Templates unavailable" message={error} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start">
          <div>
            <LinkAnchor href="/" size="sm">
              ← All samples
            </LinkAnchor>
            <Title order={1} mt="xs">
              {sample!.name}
            </Title>
            {sample!.description && (
              <Text c="dimmed" mt={4}>
                {sample!.description}
              </Text>
            )}
            <Text size="xs" c="dimmed" mt={4}>
              sample id: {sample!.id}
            </Text>
          </div>
          <LinkButton href={newTemplatePath(sampleId)} variant="filled">
            New template
          </LinkButton>
        </Group>

        <div>
          <Title order={3}>Experiment templates</Title>
          <Text size="sm" c="dimmed">
            Each template defines user and worker form phases plus calculations.
          </Text>
        </div>

        {templates!.length === 0 ? (
          <EmptyStatePanel
            title="No forms"
            message="This sample does not have any forms yet."
          />
        ) : (
          <Stack gap="sm">
            {templates!.map((template) => {
              const ref = {
                sampleId: template.sampleId,
                templateId: template.templateId,
              };
              return (
                <Card
                  key={template.templateId}
                  withBorder
                  radius="md"
                  padding="md"
                >
                  <Group justify="space-between" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Title order={4}>{template.title}</Title>
                      <Text size="xs" c="dimmed">
                        template id: {template.templateId}
                      </Text>
                      {template.description && (
                        <Text size="sm" mt={4} lineClamp={2}>
                          {template.description}
                        </Text>
                      )}
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      <LinkButton
                        href={templatePreviewPath(ref)}
                        variant="light"
                        size="xs"
                      >
                        Run
                      </LinkButton>
                      <LinkButton
                        href={templateBuilderPath(ref)}
                        variant="default"
                        size="xs"
                      >
                        Edit
                      </LinkButton>
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
