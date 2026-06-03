import { Badge, Card, Container, Group, Stack, Text, Title } from "@mantine/core";

import { ErrorPanel } from "@/components/ErrorPanel";
import { ExperimentPhaseBadge } from "@/components/ExperimentPhaseBadge";
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchExperiments } from "@/lib/experiment-manager/queries";
import { isResumablePhase } from "@/lib/experiment-manager/state";
import {
  experimentPath,
  experimentResumePath,
  templatePreviewPath,
} from "@/lib/routes";

export const dynamic = "force-dynamic";

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load experiments";
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ExperimentsPage() {
  let experiments;
  let error: string | null = null;

  try {
    experiments = await fetchExperiments();
  } catch (err) {
    error = loadErrorMessage(err);
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Experiments unavailable" message={error} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={1}>Experiments</Title>
          <Text c="dimmed">
            Live runs started from template preview. Resume unfinished runs or
            open completed ones for details.
          </Text>
        </div>

        {experiments!.length === 0 ? (
          <ErrorPanel
            title="No experiments yet"
            message="Run a template from a sample to create your first experiment."
          />
        ) : (
          <Stack gap="sm">
            {experiments!.map((row) => {
              const resumable = isResumablePhase(row.phase);
              return (
                <Card key={row.expId} withBorder radius="md" padding="md">
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <div style={{ minWidth: 0 }}>
                      <Group gap="xs" mb={4}>
                        <Title order={4}>{row.templateName}</Title>
                        <Badge variant="light" size="sm">
                          {row.sampleName}
                        </Badge>
                        <ExperimentPhaseBadge phase={row.phase} />
                      </Group>
                      <Text size="sm" c="dimmed">
                        Started {formatCreatedAt(row.createdAt)}
                      </Text>
                      <Text size="xs" c="dimmed" mt={4}>
                        id: {row.expId}
                      </Text>
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      {resumable ? (
                        <LinkButton
                          href={experimentResumePath(row.expId)}
                          variant="filled"
                          size="xs"
                        >
                          Resume
                        </LinkButton>
                      ) : (
                        <LinkButton
                          href={experimentPath(row.expId)}
                          variant="light"
                          size="xs"
                        >
                          View
                        </LinkButton>
                      )}
                      <LinkButton
                        href={templatePreviewPath({
                          sampleId: row.sampleId,
                          templateId: row.templateId,
                        })}
                        variant="default"
                        size="xs"
                      >
                        New run
                      </LinkButton>
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}

        <LinkAnchor href="/" size="sm">
          ← All samples
        </LinkAnchor>
      </Stack>
    </Container>
  );
}
