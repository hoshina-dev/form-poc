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
        <Alert color="red" variant="light" title="Experiment Manager">
          {message}
        </Alert>
        <Text size="sm" c="dimmed">
          Check that <code>EXPERIMENT_MANAGER_URL</code> in{" "}
          <code>apps/poc/.env</code> points at a reachable service.
        </Text>
      </Stack>
    </Paper>
  );
}
