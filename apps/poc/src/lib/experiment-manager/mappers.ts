import type {
  AnswerValue,
  ExperimentTemplate,
  FormAnswers,
  FormDoc,
  Question,
} from "@hoshina-dev/forms";
import { ExperimentTemplate as ExperimentTemplateSchema } from "@hoshina-dev/forms";

import type {
  CalculationSnapshot,
  ExperimentDetail,
  ExperimentTemplateCreate,
  ExperimentTemplateDetail,
  ExperimentTemplateSummary,
  ExperimentTemplateUpdate,
  ExperimentUpdate,
  FormDocSnapshot,
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

type QuestionSnapshot = {
  id: string;
  type?: string;
  config?: { questions?: Array<{ id: string }> };
  value?: unknown;
  [key: string]: unknown;
};

type CalculationWire = CalculationSnapshot | string;

function readFormDoc(
  detail: {
    clientForm?: FormDocSnapshot | null;
    labForm?: FormDocSnapshot | null;
    userForm?: FormDocSnapshot | null;
    workerForm?: FormDocSnapshot | null;
  },
  kind: "client" | "lab",
): FormDocSnapshot {
  if (kind === "client") {
    return detail.clientForm ?? detail.userForm ?? { title: "", questions: [] };
  }
  return detail.labForm ?? detail.workerForm ?? { title: "", questions: [] };
}

export function normalizeCalculations(
  calcs: Record<string, CalculationWire> | undefined,
): ExperimentTemplate["calculations"] {
  if (!calcs) return {};
  return Object.fromEntries(
    Object.entries(calcs).map(([name, entry]) => {
      if (typeof entry === "string") {
        return [name, { formula: entry }];
      }
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.formula === "string"
      ) {
        return [
          name,
          entry.result !== undefined
            ? { formula: entry.formula, result: entry.result as never }
            : { formula: entry.formula },
        ];
      }
      return [name, { formula: "" }];
    }),
  );
}

export function mapCalculationsToApi(
  calcs: ExperimentTemplate["calculations"],
): Record<string, CalculationSnapshot> {
  return Object.fromEntries(
    Object.entries(calcs).map(([name, { formula, result }]) => [
      name,
      result !== undefined ? { formula, result } : { formula },
    ]),
  );
}

/** @deprecated Use mapCalculationsToApi */
export function mapObjectCalcsToString(
  calcs: ExperimentTemplate["calculations"],
): Record<string, CalculationSnapshot> {
  return mapCalculationsToApi(calcs);
}

export function templateDetailToLoaded(
  detail: ExperimentTemplateDetail,
): LoadedTemplate {
  const candidate = {
    clientForm: readFormDoc(detail, "client"),
    labForm: readFormDoc(detail, "lab"),
    calculations: normalizeCalculations(detail.calculations),
  };
  const parsed = ExperimentTemplateSchema.safeParse(candidate);
  const meta = {
    title: detail.name,
    description:
      typeof detail.description === "string" ? detail.description : undefined,
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
    clientForm: template.clientForm as FormDocSnapshot,
    labForm: template.labForm as FormDocSnapshot,
    calculations: mapCalculationsToApi(template.calculations),
  };
}

export function templateToUpdate(
  meta: { title: string; description?: string },
  template: ExperimentTemplate,
): ExperimentTemplateUpdate {
  return templateToCreate(meta, template);
}

function collectQuestionIds(form: FormDoc | FormDocSnapshot): Set<string> {
  const ids = new Set<string>();
  for (const q of form.questions as Question[]) {
    ids.add(q.id);
    if (q.type === "repeatable-group") {
      for (const child of q.config?.questions ?? []) {
        ids.add(child.id);
      }
    }
  }
  return ids;
}

export function partitionValuesByForm(
  template: ExperimentTemplate,
  values: Record<string, unknown> | undefined,
): { user: FormAnswers; worker: FormAnswers } {
  const user: FormAnswers = {};
  const worker: FormAnswers = {};
  if (!values) return { user, worker };

  const clientIds = collectQuestionIds(template.clientForm);
  const labIds = collectQuestionIds(template.labForm);

  for (const [id, value] of Object.entries(values)) {
    if (value === undefined) continue;
    if (clientIds.has(id)) user[id] = value as AnswerValue;
    else if (labIds.has(id)) worker[id] = value as AnswerValue;
  }
  return { user, worker };
}

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

export function extractExperimentAnswers(
  detail: ExperimentDetail,
  template: ExperimentTemplate,
): { user: FormAnswers; worker: FormAnswers } {
  const fromValues = partitionValuesByForm(template, detail.values);
  const fromClient = extractValues(readFormDoc(detail, "client").questions);
  const fromLab = extractValues(readFormDoc(detail, "lab").questions);

  return {
    user: { ...fromClient, ...fromValues.user },
    worker: { ...fromLab, ...fromValues.worker },
  };
}

export function mergeFormAnswers(
  user?: FormAnswers,
  worker?: FormAnswers,
): Record<string, unknown> {
  return { ...(user ?? {}), ...(worker ?? {}) };
}

export function buildExperimentUpdateBody(
  template: ExperimentTemplate,
  answers: { user?: FormAnswers; worker?: FormAnswers },
): ExperimentUpdate {
  return {
    clientForm: template.clientForm as FormDocSnapshot,
    labForm: template.labForm as FormDocSnapshot,
    calculations: mapCalculationsToApi(template.calculations),
    values: mergeFormAnswers(answers.user, answers.worker),
  };
}

/** @deprecated Answers are stored in top-level values; kept for read fallbacks. */
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
