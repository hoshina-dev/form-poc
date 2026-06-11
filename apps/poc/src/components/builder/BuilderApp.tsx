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
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
} from "@/app/actions/experiment-manager";
import { FormFlow } from "@/components/FormFlow";
import type { SessionUser } from "@/lib/auth/definitions";
import { type FormDraft, fromDraft, toDraft } from "@/lib/builder";
import { samplePath, templateBuilderPath, templatePdfPath } from "@/lib/routes";

import { CalculationsEditor } from "./CalculationsEditor";
import { SectionEditor } from "./SectionEditor";

interface BuilderAppProps {
  initial: FormSchema;
  mode: "create" | "edit";
  sampleId: string;
  templateId?: string;
}

const previewUser: SessionUser = {
  userId: "preview-client",
  name: "Preview Client",
  email: "preview@example.com",
  appRole: "client",
};

export function BuilderApp({
  initial,
  mode,
  sampleId,
  templateId,
}: BuilderAppProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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

  const save = () => {
    const parsed = safeSchema(form.values);
    if (!parsed) {
      setSaveError("Fix validation errors before saving.");
      return;
    }
    setSaveError(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createTemplateAction(sampleId, parsed);
        if (!result.success) {
          setSaveError(result.error);
          return;
        }
        router.push(
          templateBuilderPath({
            sampleId,
            templateId: result.data.id,
          }),
        );
        router.refresh();
        return;
      }
      if (!templateId) return;
      const result = await updateTemplateAction(
        { sampleId, templateId },
        parsed,
      );
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const remove = () => {
    if (!templateId) return;
    if (!window.confirm("Delete this experiment template?")) return;
    startTransition(async () => {
      const result = await deleteTemplateAction({ sampleId, templateId });
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      router.push(samplePath(sampleId));
      router.refresh();
    });
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>
            {mode === "create" ? "New template" : `Edit: ${initial.title}`}
          </Title>
          <Button variant="subtle" component={Link} href={samplePath(sampleId)}>
            Back to templates
          </Button>
        </Group>

        {saveError && (
          <Alert color="red" variant="light" title="Save failed">
            {saveError}
          </Alert>
        )}

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Title order={3}>Metadata</Title>
            {mode === "edit" && templateId && (
              <TextInput label="Template ID" value={templateId} readOnly />
            )}
            <TextInput label="Name" required {...form.getInputProps("title")} />
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
              <Title order={3}>Result template</Title>
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
          {mode === "edit" && templateId && (
            <Button
              variant="default"
              component={Link}
              href={templatePdfPath({ sampleId, templateId })}
            >
              PDF template
            </Button>
          )}
          <Button onClick={save} loading={isPending}>
            {mode === "create" ? "Create template" : "Save changes"}
          </Button>
          {mode === "edit" && templateId && (
            <Button
              color="red"
              variant="light"
              onClick={remove}
              loading={isPending}
            >
              Delete
            </Button>
          )}
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
          <FormFlow form={draftSchema} viewer={previewUser} />
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
