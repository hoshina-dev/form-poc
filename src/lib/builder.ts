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
  { value: "string", label: "Text (short answer)" },
  { value: "textarea", label: "Paragraph" },
  { value: "password", label: "Password" },
  { value: "number", label: "Number" },
  { value: "select-string", label: "Dropdown (text values)" },
  { value: "select-number", label: "Dropdown (number values)" },
  { value: "multi-select", label: "Multi-select dropdown" },
  { value: "radio", label: "Radio (multiple choice)" },
  { value: "checkbox-group", label: "Checkboxes (multi)" },
  { value: "boolean", label: "Yes/No switch" },
  { value: "segmented", label: "Segmented control" },
  { value: "slider", label: "Slider (linear scale)" },
  { value: "rating", label: "Star rating" },
  { value: "color", label: "Color" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & time" },
  { value: "tags", label: "Tags" },
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
    case "textarea":
      return { ...common, type: "textarea" };
    case "password":
      return { ...common, type: "password" };
    case "number":
      return { ...common, type: "number" };
    case "select-string":
      return { ...common, type: "select-string", options: [] };
    case "select-number":
      return { ...common, type: "select-number", options: [] };
    case "multi-select":
      return { ...common, type: "multi-select", options: [] };
    case "radio":
      return { ...common, type: "radio", options: [] };
    case "checkbox-group":
      return { ...common, type: "checkbox-group", options: [] };
    case "boolean":
      return { ...common, type: "boolean" };
    case "segmented":
      return { ...common, type: "segmented", options: [] };
    case "slider":
      return { ...common, type: "slider", min: 0, max: 10 };
    case "rating":
      return { ...common, type: "rating" };
    case "color":
      return { ...common, type: "color" };
    case "date":
      return { ...common, type: "date" };
    case "time":
      return { ...common, type: "time" };
    case "datetime":
      return { ...common, type: "datetime" };
    case "tags":
      return { ...common, type: "tags" };
  }
}

export function makeWorkerQuestion(
  type: QuestionType,
  base: Partial<QuestionBase> = {},
): WorkerQuestion {
  return makeQuestion(type, base) as WorkerQuestion;
}
