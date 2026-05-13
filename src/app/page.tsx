import {
  Button,
  Card,
  Container,
  Group,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { DeleteButton } from "@/components/list/DeleteButton";
import { listForms } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ListPage() {
  const forms = await listForms();

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1}>Forms</Title>
            <Text c="dimmed">
              Browse, edit, preview, or delete saved form schemas.
            </Text>
          </div>
          <Button component="a" href="/builder">
            New form
          </Button>
        </Group>

        {forms.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Stack gap="sm" align="flex-start">
              <Title order={3}>No forms yet</Title>
              <Text c="dimmed">Get started by creating your first form.</Text>
              <Button component="a" href="/builder">
                Create your first form
              </Button>
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
                    <Button
                      component="a"
                      href={`/preview/${form.id}`}
                      variant="light"
                      size="xs"
                    >
                      Preview
                    </Button>
                    <Button
                      component="a"
                      href={`/builder/${form.id}`}
                      variant="default"
                      size="xs"
                    >
                      Edit
                    </Button>
                    <DeleteButton id={form.id} />
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
