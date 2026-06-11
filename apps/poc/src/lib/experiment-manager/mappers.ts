import type {
  FormSchema,
  FormSection,
  WorkerFormSection,
} from "@hoshina-dev/forms";

import type {
  ExperimentTemplateCreate,
  ExperimentTemplateDetail,
  ExperimentTemplateSummary,
  ExperimentTemplateUpdate,
} from "./client";

/** Composite key when listing templates across samples. */
export interface TemplateRef {
  sampleId: string;
  templateId: string;
}

export interface TemplateSummary {
  sampleId: string;
  templateId: string;
  lineageId: string;
  title: string;
  description?: string;
}

function asFormSection(
  section: ExperimentTemplateDetail["userForm"],
): FormSection {
  if (!section?.questions?.length) {
    return {
      title: section?.title ?? "",
      description: section?.description ?? undefined,
      questions: [],
    };
  }
  return {
    title: section.title ?? "",
    description: section.description ?? undefined,
    questions: section.questions as FormSection["questions"],
  };
}

function asWorkerFormSection(
  section: ExperimentTemplateDetail["workerForm"],
): WorkerFormSection {
  return {
    title: section.title ?? "",
    description: section.description ?? undefined,
    questions: section.questions as WorkerFormSection["questions"],
  };
}

export function templateToFormSchema(
  template: ExperimentTemplateDetail,
): FormSchema {
  return {
    id: template.id,
    title: template.name,
    description: template.description ?? undefined,
    userForm: asFormSection(template.userForm),
    workerForm: asWorkerFormSection(template.workerForm),
    calculations: template.calculations,
    template: template.template,
  };
}

export function formSchemaToTemplateCreate(
  form: FormSchema,
): ExperimentTemplateCreate {
  return {
    title: form.title,
    description: form.description ?? null,
    userForm:
      form.userForm.questions.length > 0
        ? (form.userForm as ExperimentTemplateCreate["userForm"])
        : null,
    workerForm: form.workerForm as ExperimentTemplateCreate["workerForm"],
    calculations: form.calculations,
    template: form.template,
  };
}

export function formSchemaToTemplateUpdate(
  form: FormSchema,
): ExperimentTemplateUpdate {
  return formSchemaToTemplateCreate(form);
}

export function toTemplateSummary(
  sampleId: string,
  row: ExperimentTemplateSummary,
): TemplateSummary {
  return {
    sampleId,
    templateId: row.id,
    lineageId: row.lineage_id,
    title: row.name,
    description: row.description ?? undefined,
  };
}

export function templateRefPath(
  ref: TemplateRef,
  defaultSampleId?: string,
): string {
  if (defaultSampleId && ref.sampleId === defaultSampleId) {
    return ref.templateId;
  }
  return `${ref.sampleId}/${ref.templateId}`;
}

export function parseTemplateRoute(
  segments: string[],
  defaultSampleId?: string,
): TemplateRef | null {
  if (segments.length === 1 && defaultSampleId) {
    return { sampleId: defaultSampleId, templateId: segments[0]! };
  }
  if (segments.length === 2) {
    return { sampleId: segments[0]!, templateId: segments[1]! };
  }
  return null;
}
