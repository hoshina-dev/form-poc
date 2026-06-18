import type {
  AnswerValue,
  ExperimentTemplate,
  FormAnswers,
} from "@hoshina-dev/forms";
import { ExperimentTemplate as ExperimentTemplateSchema } from "@hoshina-dev/forms";

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

export interface LoadedTemplate {
  id: string;
  lineageId: string;
  meta: { title: string; description?: string };
  template: ExperimentTemplate;
  valid: boolean;
}

function mapStringCalcsToObject(
  calcs: Record<string, string> | undefined,
): Record<string, { formula: string }> {
  if (!calcs) return {};
  return Object.fromEntries(
    Object.entries(calcs).map(([name, formula]) => [name, { formula }]),
  );
}

export function mapObjectCalcsToString(
  calcs: ExperimentTemplate["calculations"],
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(calcs).map(([name, { formula }]) => [name, formula]),
  );
}

export function templateDetailToLoaded(
  detail: ExperimentTemplateDetail,
): LoadedTemplate {
  const candidate = {
    clientForm: detail.userForm ?? { title: "", questions: [] },
    labForm: detail.workerForm ?? { title: "", questions: [] },
    calculations: mapStringCalcsToObject(detail.calculations),
  };
  const parsed = ExperimentTemplateSchema.safeParse(candidate);
  const meta = {
    title: detail.name,
    description: detail.description ?? undefined,
  };
  return {
    id: detail.id,
    lineageId: detail.lineage_id,
    meta,
    template: parsed.success ? parsed.data : (candidate as ExperimentTemplate),
    valid: parsed.success,
  };
}

export function templateToCreate(
  meta: { title: string; description?: string },
  template: ExperimentTemplate,
): ExperimentTemplateCreate {
  return {
    title: meta.title,
    description: meta.description ?? null,
    userForm:
      template.clientForm.questions.length > 0
        ? (template.clientForm as ExperimentTemplateCreate["userForm"])
        : null,
    workerForm: template.labForm as ExperimentTemplateCreate["workerForm"],
    calculations: mapObjectCalcsToString(template.calculations),
    template: "",
  };
}

export function templateToUpdate(
  meta: { title: string; description?: string },
  template: ExperimentTemplate,
): ExperimentTemplateUpdate {
  return templateToCreate(meta, template);
}

type QuestionSnapshot = {
  id: string;
  type?: string;
  config?: { questions?: Array<{ id: string }> };
  value?: unknown;
  [key: string]: unknown;
};

export function extractValues(
  questions: QuestionSnapshot[] | undefined,
): FormAnswers {
  if (!questions?.length) return {};
  const answers: FormAnswers = {};
  for (const q of questions) {
    if (q.type === "repeatable-group") {
      const groupValue = q.value;
      if (
        groupValue &&
        typeof groupValue === "object" &&
        !Array.isArray(groupValue)
      ) {
        for (const [childId, childValue] of Object.entries(
          groupValue as Record<string, unknown>,
        )) {
          if (childValue !== undefined && childValue !== null) {
            answers[childId] = childValue as AnswerValue;
          }
        }
      }
      continue;
    }
    if (q.value !== undefined && q.value !== null) {
      answers[q.id] = q.value as AnswerValue;
    }
  }
  return answers;
}

export function injectValues(
  form: {
    title?: string | null;
    description?: string | null;
    questions: unknown[];
  },
  values: FormAnswers | undefined,
): {
  title?: string | null;
  description?: string | null;
  questions: unknown[];
} {
  if (!values) return form;
  return {
    title: form.title,
    description: form.description,
    questions: (form.questions as QuestionSnapshot[]).map((q) => {
      if (q.type === "repeatable-group") {
        const childQuestions = q.config?.questions ?? [];
        const groupValue: Record<string, AnswerValue> = {};
        for (const child of childQuestions) {
          if (child.id in values && values[child.id] !== undefined) {
            groupValue[child.id] = values[child.id]!;
          }
        }
        return Object.keys(groupValue).length > 0
          ? { ...q, value: groupValue }
          : q;
      }
      return q.id in values ? { ...q, value: values[q.id] } : q;
    }),
  };
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
