"use client";

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
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { FormFlow } from "@/components/FormFlow";
import { type FormDraft, fromDraft, toDraft } from "@/lib/builder";
import { FormSchema } from "@/lib/schema";

import { CalculationsEditor } from "./CalculationsEditor";
import { SectionEditor } from "./SectionEditor";

interface BuilderAppProps {
  initial: FormSchema;
  mode: "create" | "edit";
}

interface SaveError {
  path: string;
  message: string;
}

export function BuilderApp({ initial, mode }: BuilderAppProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<SaveError[]>([]);
  const [saving, setSaving] = useState(false);
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

  const buildSchema = (): FormSchema | null => {
    const candidate = fromDraft(form.values);
    const result = FormSchema.safeParse(candidate);
    if (!result.success) {
      setErrors(
        result.error.issues.map((i) => ({
          path: i.path.length ? i.path.join(".") : "(root)",
          message: i.message,
        })),
      );
      return null;
    }
    setErrors([]);
    return result.data;
  };

  const submit = async (after: "stay" | "preview") => {
    const schema = buildSchema();
    if (!schema) return;
    setSaving(true);
    try {
      const url = mode === "create" ? "/api/forms" : `/api/forms/${initial.id}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(schema),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          issues?: { path: (string | number)[]; message: string }[];
        };
        if (body.issues) {
          setErrors(
            body.issues.map((i) => ({
              path: i.path.length ? i.path.join(".") : "(root)",
              message: i.message,
            })),
          );
        } else {
          setErrors([
            { path: "(server)", message: body.error ?? "Save failed" },
          ]);
        }
        return;
      }

      if (after === "preview") {
        router.push(`/preview/${schema.id}`);
        return;
      }

      if (mode === "create") {
        router.replace(`/builder/${schema.id}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  };

  const draftSchema = previewOpen ? safeSchema(form.values) : null;

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>
            {mode === "create" ? "New form" : `Edit: ${initial.title}`}
          </Title>
          <Button variant="subtle" component={Link} href="/">
            Cancel
          </Button>
        </Group>

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

        {errors.length > 0 && (
          <Alert color="red" variant="light" title="Cannot save">
            <Stack gap={2}>
              {errors.map((e, i) => (
                <Text size="sm" key={i}>
                  <Text component="span" fw={600}>
                    {e.path}
                  </Text>
                  : {e.message}
                </Text>
              ))}
            </Stack>
          </Alert>
        )}

        <Group
          style={{
            position: "sticky",
            bottom: 0,
            background: "var(--mantine-color-body)",
            padding: "var(--mantine-spacing-sm) 0",
            borderTop: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Button onClick={() => submit("stay")} loading={saving}>
            Save
          </Button>
          <Button
            variant="filled"
            color="grape"
            onClick={() => submit("preview")}
            loading={saving}
          >
            Save & preview
          </Button>
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
            Fix the schema errors before previewing. Press Save to see the
            validation messages.
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
