import { Card, Container, Group, Stack, Text, Title } from "@mantine/core";

import { EmptyStatePanel, ErrorPanel } from "@/components/ErrorPanel";
import { LinkButton } from "@/components/LinkButton";
import { requireSession } from "@/lib/auth/dal";
import { fetchSamples } from "@/lib/experiment-manager/queries";
import { samplePath } from "@/lib/routes";

export const dynamic = "force-dynamic";

function loadErrorMessage(): string {
  return "Samples are unavailable right now. Please try again later.";
}

export default async function SamplesPage() {
  await requireSession();

  let samples;
  let error: string | null = null;

  try {
    samples = await fetchSamples();
  } catch {
    error = loadErrorMessage();
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
          <EmptyStatePanel
            title="No samples"
            message="No samples are available yet."
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
