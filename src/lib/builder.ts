import type {
  FormSchema,
  Question,
  QuestionType,
  WorkerQuestion,
} from "./schema";

export interface CalcEntry {
  name: string;
  expression: string;
}

export interface FormDraft extends Omit<FormSchema, "calculations"> {
  calculations: CalcEntry[];
}

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: "string", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select-string", label: "Dropdown (text values)" },
  { value: "select-number", label: "Dropdown (number values)" },
];

export function emptyForm(): FormSchema {
  return {
    id: "",
    title: "Untitled Form",
    description: "",
    userForm: {
      title: "User form",
      description: "",
      questions: [],
    },
    workerForm: {
      title: "Worker form",
      description: "",
      questions: [],
    },
    calculations: {},
    template: "",
  };
}

export function toDraft(form: FormSchema): FormDraft {
  return {
    ...form,
    calculations: Object.entries(form.calculations).map(
      ([name, expression]) => ({ name, expression }),
    ),
  };
}

export function fromDraft(draft: FormDraft): FormSchema {
  const calcs: Record<string, string> = {};
  for (const { name, expression } of draft.calculations) {
    const trimmed = name.trim();
    if (trimmed) calcs[trimmed] = expression;
  }
  return {
    ...draft,
    calculations: calcs,
  };
}

interface QuestionBase {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
}

export function makeQuestion(
  type: QuestionType,
  base: Partial<QuestionBase> = {},
): Question {
  const common: QuestionBase = {
    id: base.id ?? "",
    label: base.label ?? "",
    description: base.description,
    required: base.required,
  };
  switch (type) {
    case "string":
      return { ...common, type: "string" };
    case "number":
      return { ...common, type: "number" };
    case "select-string":
      return { ...common, type: "select-string", options: [] };
    case "select-number":
      return { ...common, type: "select-number", options: [] };
  }
}

export function makeWorkerQuestion(
  type: QuestionType,
  base: Partial<QuestionBase> = {},
): WorkerQuestion {
  return makeQuestion(type, base) as WorkerQuestion;
}
