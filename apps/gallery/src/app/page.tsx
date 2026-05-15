import { GALLERY } from "@hoshina-dev/forms";
import { Stack, Text, Title } from "@mantine/core";

export default function GalleryIndexPage() {
  return (
    <Stack gap="md" maw={720}>
      <Title order={2}>Component gallery</Title>
      <Text c="dimmed">
        Every question type the form engine supports. Pick one from the sidebar
        to see its JSON Schema, an example question, and a live preview.
      </Text>
      <Text size="sm" c="dimmed">
        {GALLERY.length} components.
      </Text>
    </Stack>
  );
}
