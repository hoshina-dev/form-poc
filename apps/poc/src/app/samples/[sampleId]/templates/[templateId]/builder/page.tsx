import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { ErrorPanel } from "@/components/ErrorPanel";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchTemplateForm } from "@/lib/experiment-manager/queries";

export const dynamic = "force-dynamic";

interface TemplateBuilderPageProps {
  params: Promise<{ sampleId: string; templateId: string }>;
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load template";
}

export default async function TemplateBuilderPage({
  params,
}: TemplateBuilderPageProps) {
  const { sampleId, templateId } = await params;

  let form;
  let error: string | null = null;

  try {
    form = await fetchTemplateForm(sampleId, templateId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage(err);
  }

  if (error) {
    return <ErrorPanel title="Builder unavailable" message={error} />;
  }

  return (
    <BuilderApp
      initial={form!}
      mode="edit"
      sampleId={sampleId}
      templateId={templateId}
    />
  );
}
