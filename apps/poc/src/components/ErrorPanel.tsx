import { Alert, Paper, Stack, Text, Title } from "@mantine/core";

interface ErrorPanelProps {
  title: string;
  message: string;
}

export function ErrorPanel({ title, message }: ErrorPanelProps) {
  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap="sm">
        <Title order={3}>{title}</Title>
        <Alert color="red" variant="light" title="Unable to load data">
          {message}
        </Alert>
      </Stack>
    </Paper>
  );
}

export function EmptyStatePanel({ title, message }: ErrorPanelProps) {
  return (
    <Paper withBorder p="xl" radius="md">
      <Stack gap={4}>
        <Title order={3}>{title}</Title>
        <Text size="sm" c="dimmed">
          {message}
        </Text>
      </Stack>
    </Paper>
  );
}
