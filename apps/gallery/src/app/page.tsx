import { GALLERY } from "@hoshina-dev/forms";
import { Stack, Text, Title } from "@mantine/core";

export default function GalleryIndexPage() {
  return (
    <Stack gap="md" maw={720}>
      <Title order={2}>Hoshina Form Gallery</Title>
      <Text c="dimmed">
        Every question type the form engine supports. Pick one from the sidebar
        to customize its JSON fields and see a live preview.
      </Text>
      <Text size="sm" c="dimmed">
        {GALLERY.length} components.
      </Text>
    </Stack>
  );
}
