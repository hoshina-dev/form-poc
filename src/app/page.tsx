"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Container,
  Grid,
  JsonInput,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { FormSchema } from "@/lib/schema";
import { FormFlow } from "@/components/FormFlow";
import sampleForm from "../../examples/sample-form.json";

const initialJson = JSON.stringify(sampleForm, null, 2);
const initialForm = FormSchema.parse(sampleForm);

type Validation =
  | { ok: true; form: FormSchema }
  | { ok: false; kind: "json"; message: string }
  | { ok: false; kind: "schema"; issues: SchemaIssue[] };

interface SchemaIssue {
  path: string;
  message: string;
}

function validate(text: string): Validation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    return { ok: false, kind: "json", message: (e as Error).message };
  }
  const result = FormSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({
      path: i.path.length ? i.path.join(".") : "(root)",
      message: i.message,
    }));
    return { ok: false, kind: "schema", issues };
  }
  return { ok: true, form: result.data };
}

export default function HomePage() {
  const [text, setText] = useState(initialJson);
  const [lastValid, setLastValid] = useState<FormSchema>(initialForm);

  const validation = useMemo(() => validate(text), [text]);

  useEffect(() => {
    if (validation.ok) {
      setLastValid(validation.form);
    }
  }, [validation]);

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Box>
          <Title order={1}>Form Builder POC</Title>
          <Text c="dimmed">
            Edit the JSON on the left. The preview on the right updates when
            the schema is valid, and pauses on the last valid form otherwise.
          </Text>
        </Box>

        <Grid gap="lg">
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Title order={3}>Schema</Title>
              <JsonInput
                value={text}
                onChange={setText}
                formatOnBlur
                autosize
                minRows={20}
                maxRows={40}
                styles={{ input: { fontFamily: "var(--mantine-font-family-monospace)" } }}
                spellCheck={false}
              />
              <ValidationStatus validation={validation} />
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Stack gap="sm">
              <Title order={3}>Preview</Title>
              <Paper withBorder p="lg" radius="md">
                <FormFlow form={lastValid} />
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}

function ValidationStatus({ validation }: { validation: Validation }) {
  if (validation.ok) {
    return (
      <Alert color="green" variant="light" title="Valid">
        Schema parses cleanly.
      </Alert>
    );
  }

  if (validation.kind === "json") {
    return (
      <Alert color="red" variant="light" title="Invalid JSON">
        <Text size="sm">{validation.message}</Text>
        <Text size="xs" c="dimmed" mt="xs">
          Preview is paused on the last valid schema.
        </Text>
      </Alert>
    );
  }

  return (
    <Alert color="red" variant="light" title="Schema validation failed">
      <Stack gap={4}>
        {validation.issues.map((issue, idx) => (
          <Text size="sm" key={idx}>
            <Text component="span" fw={600}>
              {issue.path}
            </Text>
            : {issue.message}
          </Text>
        ))}
      </Stack>
      <Text size="xs" c="dimmed" mt="xs">
        Preview is paused on the last valid schema.
      </Text>
    </Alert>
  );
}
