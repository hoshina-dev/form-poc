import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { ErrorPanel } from "@/components/ErrorPanel";
import { requireSession } from "@/lib/auth/dal";
import { emptyDraft } from "@/lib/builder";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchSample } from "@/lib/experiment-manager/queries";

export const dynamic = "force-dynamic";

interface NewTemplateBuilderPageProps {
  params: Promise<{ sampleId: string }>;
}

function loadErrorMessage(): string {
  return "The form builder is unavailable right now. Please try again later.";
}

export default async function NewTemplateBuilderPage({
  params,
}: NewTemplateBuilderPageProps) {
  await requireSession("technician");
  const { sampleId } = await params;

  let error: string | null = null;

  try {
    await fetchSample(sampleId);
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
    <BuilderApp initial={emptyDraft()} mode="create" sampleId={sampleId} />
  );
}
