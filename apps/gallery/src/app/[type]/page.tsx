import { findGalleryEntry, GALLERY } from "@hoshina-dev/forms";
import { Badge, Code, Group, Paper, Stack, Text, Title } from "@mantine/core";
import { notFound } from "next/navigation";
import { z } from "zod";

import { GalleryValueDisplay } from "@/components/GalleryValueDisplay";

interface PageProps {
  params: Promise<{ type: string }>;
}

export default async function GalleryDetailPage({ params }: PageProps) {
  const { type } = await params;
  const entry = findGalleryEntry(type);
  if (!entry) notFound();

  const jsonSchema = z.toJSONSchema(entry.zodSchema);

  return (
    <Stack gap="lg" maw={900}>
      <Stack gap={4}>
        <Group gap="sm" align="center">
          <Title order={2}>{entry.label}</Title>
          <Badge variant="light" color="grape" size="lg">
            {entry.type}
          </Badge>
        </Group>
        <Text c="dimmed">{entry.description}</Text>
      </Stack>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Live preview
        </Title>
        <GalleryValueDisplay question={entry.example} />
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          Example JSON
        </Title>
        <Code block>{JSON.stringify(entry.example, null, 2)}</Code>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4} mb="sm">
          JSON Schema
        </Title>
        <Text size="sm" c="dimmed" mb="xs">
          Generated from the Zod schema for this question type.
        </Text>
        <Code block>{JSON.stringify(jsonSchema, null, 2)}</Code>
      </Paper>
    </Stack>
  );
}

export function generateStaticParams() {
  return GALLERY.map((entry) => ({ type: entry.type }));
}
