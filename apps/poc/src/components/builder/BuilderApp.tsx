"use client";

import { FormSchema } from "@hoshina-dev/forms";
import {
  Alert,
  Button,
  Container,
  Drawer,
  Group,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useMemo, useState } from "react";

import { FormFlow } from "@/components/FormFlow";
import { type FormDraft, fromDraft, toDraft } from "@/lib/builder";

import { CalculationsEditor } from "./CalculationsEditor";
import { SectionEditor } from "./SectionEditor";

interface BuilderAppProps {
  initial: FormSchema;
  mode: "create" | "edit";
}

export function BuilderApp({ initial, mode }: BuilderAppProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const form = useForm<FormDraft>({
    initialValues: toDraft(initial),
  });

  const userQuestionIds = useMemo(
    () =>
      form.values.userForm.questions
        .map((q) => q.id)
        .filter((id) => id.length > 0),
    [form.values.userForm.questions],
  );

  const draftSchema = previewOpen ? safeSchema(form.values) : null;

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>
            {mode === "create" ? "New form" : `Edit: ${initial.title}`}
          </Title>
          <Button variant="subtle" component={Link} href="/">
            Back to list
          </Button>
        </Group>

        <Alert color="yellow" variant="light" title="Preview-only demo">
          Edits in this builder are kept in the browser for live preview. Form
          JSON is loaded by the POC server from <code>data/forms/</code>.
        </Alert>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Title order={3}>Metadata</Title>
            <Group grow>
              <TextInput
                label="ID"
                description="Letters, digits, underscore, hyphen. Used as the filename."
                required
                readOnly={mode === "edit"}
                {...form.getInputProps("id")}
              />
              <TextInput
                label="Title"
                required
                {...form.getInputProps("title")}
              />
            </Group>
            <TextInput
              label="Description"
              {...form.getInputProps("description")}
            />
          </Stack>
        </Paper>

        <SectionEditor form={form} path="userForm" isWorker={false} />
        <SectionEditor
          form={form}
          path="workerForm"
          isWorker
          userQuestionIds={userQuestionIds}
        />
        <CalculationsEditor form={form} />

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <div>
              <Title order={3}>Template</Title>
              <Text size="sm" c="dimmed">
                Use <code>{"{{name}}"}</code> to interpolate user, worker, and
                calculation values.
              </Text>
            </div>
            <Textarea
              autosize
              minRows={3}
              maxRows={8}
              {...form.getInputProps("template")}
            />
          </Stack>
        </Paper>

        <Group
          style={{
            position: "sticky",
            bottom: 0,
            background: "var(--mantine-color-body)",
            padding: "var(--mantine-spacing-sm) 0",
            borderTop: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Button variant="default" onClick={() => setPreviewOpen(true)}>
            Live preview
          </Button>
        </Group>
      </Stack>

      <Drawer
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        position="right"
        size="xl"
        title="Live preview"
      >
        {draftSchema ? (
          <FormFlow form={draftSchema} />
        ) : (
          <Alert color="red" variant="light" title="Draft is not valid">
            Fix the schema before previewing.
          </Alert>
        )}
      </Drawer>
    </Container>
  );
}

function safeSchema(draft: FormDraft): FormSchema | null {
  const result = FormSchema.safeParse(fromDraft(draft));
  return result.success ? result.data : null;
}
