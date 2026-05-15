import {
  Card,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { LinkButton } from "@/components/LinkButton";
import { listForms } from "@/lib/storage";

export default async function ListPage() {
  const forms = await listForms();

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={1}>Forms</Title>
          <Text c="dimmed">
            Browse the example form schemas. Open one to preview it or inspect
            its builder view.
          </Text>
        </div>

        {forms.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Stack gap="sm" align="flex-start">
              <Title order={3}>No forms bundled</Title>
              <Text c="dimmed">
                The build didn&apos;t include any form JSON. Drop files into{" "}
                <code>data/forms/</code> and rebuild.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <Stack gap="sm">
            {forms.map((form) => (
              <Card key={form.id} withBorder radius="md" padding="md">
                <Group justify="space-between" wrap="nowrap">
                  <div style={{ minWidth: 0 }}>
                    <Title order={4}>{form.title}</Title>
                    <Text size="xs" c="dimmed">
                      id: {form.id}
                    </Text>
                    {form.description && (
                      <Text size="sm" mt={4} lineClamp={2}>
                        {form.description}
                      </Text>
                    )}
                  </div>
                  <Group gap="xs" wrap="nowrap">
                    <LinkButton
                      href={`/preview/${form.id}`}
                      variant="light"
                      size="xs"
                    >
                      Preview
                    </LinkButton>
                    <LinkButton
                      href={`/builder/${form.id}`}
                      variant="default"
                      size="xs"
                    >
                      Inspect
                    </LinkButton>
                  </Group>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
