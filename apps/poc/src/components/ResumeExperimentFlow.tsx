"use client";

import type { ExperimentTemplate } from "@hoshina-dev/forms";
import { useRouter } from "next/navigation";

import { FormFlow } from "@/components/FormFlow";
import type { SessionUser } from "@/lib/auth/definitions";
import type { TemplateRef } from "@/lib/experiment-manager/mappers";
import type { ExperimentRunState } from "@/lib/experiment-manager/state";
import { templatePreviewPath } from "@/lib/routes";

interface ResumeExperimentFlowProps {
  template: ExperimentTemplate;
  title: string;
  description?: string;
  experimentRef: TemplateRef;
  expId: string;
  runState: ExperimentRunState;
  viewer: SessionUser;
}

export function ResumeExperimentFlow({
  template,
  title,
  description,
  experimentRef,
  expId,
  runState,
  viewer,
}: ResumeExperimentFlowProps) {
  const router = useRouter();

  return (
    <FormFlow
      template={template}
      title={title}
      description={description}
      viewer={viewer}
      experimentRef={experimentRef}
      resume={{ expId, runState }}
      onRestart={() => router.push(templatePreviewPath(experimentRef))}
    />
  );
}
