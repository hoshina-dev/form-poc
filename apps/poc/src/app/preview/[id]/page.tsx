import { Container, Group, Paper, Stack, Text } from "@mantine/core";
import { notFound } from "next/navigation";

import { FormFlow } from "@/components/FormFlow";
import { LinkAnchor } from "@/components/LinkButton";
import { readForm } from "@/lib/storage";

export const dynamic = "force-dynamic";

interface PreviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const form = await readForm(id);
  if (!form) {
    notFound();
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed">
            Previewing form id: <strong>{id}</strong>
          </Text>
          <Group gap="md">
            <LinkAnchor href={`/builder/${id}`} size="sm">
              Inspect schema
            </LinkAnchor>
            <LinkAnchor href="/" size="sm">
              Back to list
            </LinkAnchor>
          </Group>
        </Group>
        <Paper withBorder p="lg" radius="md">
          <FormFlow form={form} />
        </Paper>
      </Stack>
    </Container>
  );
}
