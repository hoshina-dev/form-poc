"use client";

import type { FormSchema } from "@hoshina-dev/forms";
import { useRouter } from "next/navigation";

import { FormFlow } from "@/components/FormFlow";
import type { TemplateRef } from "@/lib/experiment-manager/mappers";
import type { ExperimentRunState } from "@/lib/experiment-manager/state";
import { templatePreviewPath } from "@/lib/routes";

interface ResumeExperimentFlowProps {
  form: FormSchema;
  experimentRef: TemplateRef;
  expId: string;
  runState: ExperimentRunState;
}

export function ResumeExperimentFlow({
  form,
  experimentRef,
  expId,
  runState,
}: ResumeExperimentFlowProps) {
  const router = useRouter();

  return (
    <FormFlow
      form={form}
      experimentRef={experimentRef}
      resume={{ expId, runState }}
      onRestart={() => router.push(templatePreviewPath(experimentRef))}
    />
  );
}
