import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { ErrorPanel } from "@/components/ErrorPanel";
import { requireSession } from "@/lib/auth/dal";
import { toDraft } from "@/lib/builder";
import {
  ExperimentManagerError,
  getExperimentTemplate,
} from "@/lib/experiment-manager/client";
import { templateDetailToLoaded } from "@/lib/experiment-manager/mappers";

export const dynamic = "force-dynamic";

interface TemplateBuilderPageProps {
  params: Promise<{ sampleId: string; templateId: string }>;
}

function loadErrorMessage(): string {
  return "The form builder is unavailable right now. Please try again later.";
}

export default async function TemplateBuilderPage({
  params,
}: TemplateBuilderPageProps) {
  await requireSession("technician");
  const { sampleId, templateId } = await params;

  let initial;
  let lineageId: string | undefined;
  let legacy = false;
  let error: string | null = null;

  try {
    const detail = await getExperimentTemplate(sampleId, templateId);
    const loaded = templateDetailToLoaded(detail);
    lineageId = loaded.lineageId;
    if (!loaded.valid) {
      legacy = true;
    } else {
      initial = toDraft(loaded.meta, loaded.template);
    }
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage();
  }

  if (error) {
    return <ErrorPanel title="Builder unavailable" message={error} />;
  }

  if (legacy) {
    return (
      <ErrorPanel
        title="Cannot edit this template"
        message="This template uses a legacy format and cannot be edited in the new builder."
      />
    );
  }

  return (
    <BuilderApp
      initial={initial!}
      mode="edit"
      sampleId={sampleId}
      templateId={templateId}
      lineageId={lineageId}
    />
  );
}
