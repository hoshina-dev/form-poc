import { Card, Container, Group, Stack, Text, Title } from "@mantine/core";

import { ErrorPanel } from "@/components/ErrorPanel";
import { LinkButton } from "@/components/LinkButton";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchSamples } from "@/lib/experiment-manager/queries";
import { samplePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load samples";
}

export default async function SamplesPage() {
  let samples;
  let error: string | null = null;

  try {
    samples = await fetchSamples();
  } catch (err) {
    error = loadErrorMessage(err);
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Samples unavailable" message={error} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={1}>Samples</Title>
          <Text c="dimmed">
            Choose a sample to browse experiment templates and run multi-phase
            forms.
          </Text>
        </div>

        {samples!.length === 0 ? (
          <ErrorPanel
            title="No samples"
            message="Experiment Manager returned an empty sample list."
          />
        ) : (
          <Stack gap="sm">
            {samples!.map((sample) => (
              <Card key={sample.id} withBorder radius="md" padding="md">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Title order={4}>{sample.name}</Title>
                    <Text size="xs" c="dimmed">
                      id: {sample.id}
                    </Text>
                    {sample.description && (
                      <Text size="sm" mt={4} lineClamp={2}>
                        {sample.description}
                      </Text>
                    )}
                  </div>
                  <LinkButton
                    href={samplePath(sample.id)}
                    variant="light"
                    size="xs"
                  >
                    Templates
                  </LinkButton>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
