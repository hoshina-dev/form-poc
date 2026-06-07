import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { ErrorPanel } from "@/components/ErrorPanel";
import { requireSession } from "@/lib/auth/dal";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchTemplateForm } from "@/lib/experiment-manager/queries";

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
  await requireSession("client");
  const { sampleId, templateId } = await params;

  let form;
  let error: string | null = null;

  try {
    form = await fetchTemplateForm(sampleId, templateId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage();
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
