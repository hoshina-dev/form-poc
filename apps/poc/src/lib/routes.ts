import type { TemplateRef } from "@/lib/experiment-manager/mappers";

export function samplePath(sampleId: string) {
  return `/samples/${sampleId}`;
}

export function experimentsPath() {
  return "/experiments";
}

export function experimentPath(expId: string) {
  return `/experiments/${expId}`;
}

export function experimentResumePath(expId: string) {
  return `/experiments/${expId}/resume`;
}

export function templatePreviewPath(ref: TemplateRef) {
  return `/samples/${ref.sampleId}/templates/${ref.templateId}/preview`;
}

export function templateBuilderPath(ref: TemplateRef) {
  return `/samples/${ref.sampleId}/templates/${ref.templateId}/builder`;
}

export function newTemplatePath(sampleId: string) {
  return `/samples/${sampleId}/builder/new`;
}
