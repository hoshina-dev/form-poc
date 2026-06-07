"use client";

import {
  Alert,
  Button,
  Container,
  Paper,
  PasswordInput,
  Radio,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useActionState } from "react";

import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <Container size={420} py="xl">
      <Paper withBorder shadow="sm" radius="md" p="lg">
        <form action={action}>
          <Stack gap="md">
            <div>
              <Title order={1}>Sign in</Title>
              <Text c="dimmed" size="sm">
                Use your custapi account and choose which side of the POC you
                want to enter.
              </Text>
            </div>

            <TextInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              error={state?.errors?.email?.[0]}
            />
            <PasswordInput
              label="Password"
              name="password"
              autoComplete="current-password"
              required
              error={state?.errors?.password?.[0]}
            />
            <Radio.Group
              label="Login as"
              name="appRole"
              defaultValue="client"
              required
              error={state?.errors?.appRole?.[0]}
            >
              <Stack gap="xs" mt="xs">
                <Radio value="client" label="Client" />
                <Radio value="technician" label="Technician" />
              </Stack>
            </Radio.Group>

            {state?.message && (
              <Alert color="red" variant="light">
                {state.message}
              </Alert>
            )}

            <Button type="submit" loading={pending}>
              Sign in
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
