import { Container } from "@mantine/core";
import { notFound } from "next/navigation";

import { ErrorPanel } from "@/components/ErrorPanel";
import { PdfEditor } from "@/components/pdf-editor/PdfEditor";
import type { VariableGroup } from "@/components/pdf-editor/types";
import type { PdfComp } from "@/components/pdf-editor/types";
import { requireSession } from "@/lib/auth/dal";
import {
  ExperimentManagerError,
  getExperimentTemplate,
  getPdfTemplate,
  listExperiments,
} from "@/lib/experiment-manager/client";

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

  type SnapshotQuestion = {
    id: string;
    type?: string;
    label?: string;
    config?: {
      default?: unknown;
      questions?: Array<{ id: string; label?: string }>;
    };
  };

  function expandSourceVars(
    questions: SnapshotQuestion[],
    tag: "client" | "lab",
  ): Array<{ id: string; label: string }> {
    const vars: Array<{ id: string; label: string }> = [];
    for (const q of questions) {
      if (q.type === "repeatable-group") {
        for (const child of q.config?.questions ?? []) {
          vars.push({
            id: child.id,
            label: `${child.label ?? child.id} (lab)`,
          });
        }
      } else {
        vars.push({
          id: q.id,
          label: `${q.label ?? q.id} (${tag})`,
        });
      }
    }
    return vars;
  }

  // Build variable groups from template
  const sourceVars = [
    ...expandSourceVars(
      (template.clientForm?.questions ?? template.userForm?.questions ?? []) as SnapshotQuestion[],
      "client",
    ),
    ...expandSourceVars(
      (template.labForm?.questions ?? template.workerForm?.questions ?? []) as SnapshotQuestion[],
      "lab",
    ),
  ];
  const calcVars = Object.keys(template.calculations ?? {}).map((key) => ({
    id: key,
    label: key,
  }));
  const variableGroups: VariableGroup[] = [
    ...(sourceVars.length > 0
      ? [{ name: "Source", variables: sourceVars }]
      : []),
    ...(calcVars.length > 0
      ? [{ name: "Calculated", variables: calcVars }]
      : []),
  ];

  // Default values for preview (from question.config.default)
  const questionDefaults: Record<string, unknown> = {};
  for (const q of [
    ...(template.clientForm?.questions ?? template.userForm?.questions ?? []),
    ...(template.labForm?.questions ?? template.workerForm?.questions ?? []),
  ] as SnapshotQuestion[]) {
    if (q.type === "repeatable-group") continue;
    const def = q.config?.default;
    if (def !== undefined) questionDefaults[q.id] = def;
  }

  return (
    <PdfEditor
      sampleId={sampleId}
      templateId={templateId}
      lineageId={template.lineage_id}
      initialComponents={initialComponents}
      variableGroups={variableGroups}
      questionDefaults={questionDefaults}
      experiments={experiments}
    />
  );
}
