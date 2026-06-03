import { notFound } from "next/navigation";

import { BuilderApp } from "@/components/builder/BuilderApp";
import { ErrorPanel } from "@/components/ErrorPanel";
import { emptyForm } from "@/lib/builder";
import { ExperimentManagerError } from "@/lib/experiment-manager/client";
import { fetchSample } from "@/lib/experiment-manager/queries";

export const dynamic = "force-dynamic";

interface NewTemplateBuilderPageProps {
  params: Promise<{ sampleId: string }>;
}

function loadErrorMessage(error: unknown): string {
  if (error instanceof ExperimentManagerError) return error.message;
  if (error instanceof Error) return error.message;
  return "Failed to load sample";
}

export default async function NewTemplateBuilderPage({
  params,
}: NewTemplateBuilderPageProps) {
  const { sampleId } = await params;

  let error: string | null = null;

  try {
    await fetchSample(sampleId);
  } catch (err) {
    if (err instanceof ExperimentManagerError && err.status === 404) {
      notFound();
    }
    error = loadErrorMessage(err);
  }

  if (error) {
    return <ErrorPanel title="Builder unavailable" message={error} />;
  }

  return <BuilderApp initial={emptyForm()} mode="create" sampleId={sampleId} />;
}
