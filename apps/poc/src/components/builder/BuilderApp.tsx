"use client";

import { ExperimentTemplate } from "@hoshina-dev/forms";
import {
  Alert,
  Button,
  Container,
  Drawer,
  Group,
  Paper,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createTemplateAction,
  deleteTemplateAction,
  updateTemplateAction,
} from "@/app/actions/experiment-manager";
import { FormFlow } from "@/components/FormFlow";
import type { SessionUser } from "@/lib/auth/definitions";
import { type FormDraft, fromDraft } from "@/lib/builder";
import { samplePath, templateBuilderPath, templatePdfPath } from "@/lib/routes";

import { CalculationsEditor } from "./CalculationsEditor";
import { SectionEditor } from "./SectionEditor";

interface BuilderAppProps {
  initial: FormDraft;
  mode: "create" | "edit";
  sampleId: string;
  templateId?: string;
  /** Stable lineage id — required for PUT updates in edit mode. */
  lineageId?: string;
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
  lineageId,
}: BuilderAppProps) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormDraft>({
    initialValues: initial,
  });

  const draftTemplate = previewOpen ? safeTemplate(form.values) : null;

  const save = () => {
    const { meta, template } = fromDraft(form.values);
    const parsed = ExperimentTemplate.safeParse(template);
    if (!parsed.success) {
      setSaveError("Fix validation errors before saving.");
      return;
    }
    setSaveError(null);
    startTransition(async () => {
      if (mode === "create") {
        const result = await createTemplateAction(sampleId, {
          meta,
          template: parsed.data,
        });
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
      if (!templateId || !lineageId) return;
      const result = await updateTemplateAction(
        { sampleId, templateId },
        { meta, template: parsed.data },
        lineageId,
      );
      if (!result.success) {
        setSaveError(result.error);
        return;
      }
      if (result.data.id !== templateId) {
        router.push(
          templateBuilderPath({
            sampleId,
            templateId: result.data.id,
          }),
        );
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
            {mode === "create"
              ? "New template"
              : `Edit: ${form.values.title || initial.title}`}
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

        <SectionEditor form={form} path="clientForm" />
        <SectionEditor form={form} path="labForm" />
        <CalculationsEditor form={form} />

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
        {draftTemplate ? (
          <FormFlow
            template={draftTemplate.template}
            title={draftTemplate.meta.title}
            description={draftTemplate.meta.description}
            viewer={previewUser}
          />
        ) : (
          <Alert color="red" variant="light" title="Draft is not valid">
            Fix the schema before previewing.
          </Alert>
        )}
      </Drawer>
    </Container>
  );
}

function safeTemplate(draft: FormDraft): {
  meta: { title: string; description?: string };
  template: ExperimentTemplate;
} | null {
  const { meta, template } = fromDraft(draft);
  const parsed = ExperimentTemplate.safeParse(template);
  if (!parsed.success) return null;
  return { meta, template: parsed.data };
}
