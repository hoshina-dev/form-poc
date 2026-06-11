import { Container } from "@mantine/core";
import { notFound } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { PdfEditor } from "@/components/pdf-editor/PdfEditor";
import { requireSession } from "@/lib/auth/dal";
import {
  ExperimentManagerError,
  getPdfTemplate,
  getExperimentTemplate,
  listExperiments,
} from "@/lib/experiment-manager/client";
import type { VariableGroup } from "@/components/pdf-editor/types";
import type { PdfComp } from "@/components/pdf-editor/types";

export const dynamic = "force-dynamic";

interface PdfEditorPageProps {
  params: Promise<{ sampleId: string; templateId: string }>;
}

export default async function PdfEditorPage({ params }: PdfEditorPageProps) {
  await requireSession("technician");
  const { sampleId, templateId } = await params;

  let template;
  try {
    template = await getExperimentTemplate(sampleId, templateId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) notFound();
    return (
      <Container size="xl" py="lg">
        <ErrorPanel
          title="PDF editor unavailable"
          message="Could not load the experiment template."
        />
      </Container>
    );
  }

  // PDF components — 404 is fine (no layout yet)
  let initialComponents: PdfComp[] = [];
  try {
    const pdf = await getPdfTemplate(sampleId, templateId);
    initialComponents = (pdf.components ?? []) as PdfComp[];
  } catch (err) {
    if (!(err instanceof ExperimentManagerError && err.status === 404)) {
      return (
        <Container size="xl" py="lg">
          <ErrorPanel
            title="PDF editor unavailable"
            message="Could not load the PDF template."
          />
        </Container>
      );
    }
  }

  // Experiments that used this template version (for preview)
  let experiments: Array<{ id: string; label: string }> = [];
  try {
    const { experiments: all } = await listExperiments();
    experiments = all
      .filter((e) => e.template_id === templateId)
      .map((e) => ({
        id: e.id,
        label: `${e.id.slice(0, 8)}… · ${new Date(e.created_at).toLocaleDateString()}`,
      }));
  } catch {
    // non-fatal — preview dropdown just won't have entries
  }

  // Build variable groups from template
  const sourceVars = [
    ...(template.userForm?.questions ?? []).map((q) => ({
      id: q.id,
      label: `${(q as { label?: string }).label ?? q.id} (user)`,
    })),
    ...template.workerForm.questions.map((q) => ({
      id: q.id,
      label: `${(q as { label?: string }).label ?? q.id} (worker)`,
    })),
  ];
  const calcVars = Object.keys(template.calculations).map((key) => ({
    id: key,
    label: key,
  }));
  const variableGroups: VariableGroup[] = [
    ...(sourceVars.length > 0 ? [{ name: "Source", variables: sourceVars }] : []),
    ...(calcVars.length > 0 ? [{ name: "Calculated", variables: calcVars }] : []),
  ];

  // Default values for preview (from question.default)
  const questionDefaults: Record<string, unknown> = {};
  for (const q of [
    ...(template.userForm?.questions ?? []),
    ...template.workerForm.questions,
  ]) {
    const qd = q as { id: string; default?: unknown };
    if (qd.default !== undefined) questionDefaults[qd.id] = qd.default;
  }

  return (
    <PdfEditor
      sampleId={sampleId}
      templateId={templateId}
      lineageId={template.lineage_id}
      initialComponents={initialComponents}
      variableGroups={variableGroups}
      questionDefaults={questionDefaults}
      calculations={template.calculations}
      experiments={experiments}
    />
  );
}
