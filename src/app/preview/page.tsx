import { Button, Container, Paper, Stack, Text, Title } from "@mantine/core";

export default function PreviewIndexPage() {
  return (
    <Container size="xl" py="lg">
      <Paper withBorder p="xl" radius="md">
        <Stack gap="sm" align="flex-start">
          <Title order={2}>Preview a form</Title>
          <Text c="dimmed">
            Pick a form from the List to run it through the user → worker →
            result flow.
          </Text>
          <Button component="a" href="/" variant="light">
            Go to list
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
