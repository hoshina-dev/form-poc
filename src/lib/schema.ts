import { z } from "zod";

const BaseQuestion = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

export const StringQuestion = BaseQuestion.extend({
  type: z.literal("string"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  default: z.string().optional(),
  placeholder: z.string().optional(),
});
export type StringQuestion = z.infer<typeof StringQuestion>;

export const NumberQuestion = BaseQuestion.extend({
  type: z.literal("number"),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  default: z.number().optional(),
  placeholder: z.string().optional(),
});
export type NumberQuestion = z.infer<typeof NumberQuestion>;

export const StringSelectOption = z.object({
  label: z.string(),
  value: z.string(),
});
export type StringSelectOption = z.infer<typeof StringSelectOption>;

export const NumberSelectOption = z.object({
  label: z.string(),
  value: z.number(),
});
export type NumberSelectOption = z.infer<typeof NumberSelectOption>;

export const StringSelectQuestion = BaseQuestion.extend({
  type: z.literal("select-string"),
  options: z.array(StringSelectOption),
  default: z.string().optional(),
  placeholder: z.string().optional(),
});
export type StringSelectQuestion = z.infer<typeof StringSelectQuestion>;

export const NumberSelectQuestion = BaseQuestion.extend({
  type: z.literal("select-number"),
  options: z.array(NumberSelectOption),
  default: z.number().optional(),
  placeholder: z.string().optional(),
});
export type NumberSelectQuestion = z.infer<typeof NumberSelectQuestion>;

export const Question = z.discriminatedUnion("type", [
  StringQuestion,
  NumberQuestion,
  StringSelectQuestion,
  NumberSelectQuestion,
]);
export type Question = z.infer<typeof Question>;
export type QuestionType = Question["type"];
export type QuestionId = Question["id"];

const prefillExt = { prefillFrom: z.string().optional() };

export const WorkerStringQuestion = StringQuestion.extend(prefillExt);
export type WorkerStringQuestion = z.infer<typeof WorkerStringQuestion>;

export const WorkerNumberQuestion = NumberQuestion.extend(prefillExt);
export type WorkerNumberQuestion = z.infer<typeof WorkerNumberQuestion>;

export const WorkerStringSelectQuestion =
  StringSelectQuestion.extend(prefillExt);
export type WorkerStringSelectQuestion = z.infer<
  typeof WorkerStringSelectQuestion
>;

export const WorkerNumberSelectQuestion =
  NumberSelectQuestion.extend(prefillExt);
export type WorkerNumberSelectQuestion = z.infer<
  typeof WorkerNumberSelectQuestion
>;

export const WorkerQuestion = z.discriminatedUnion("type", [
  WorkerStringQuestion,
  WorkerNumberQuestion,
  WorkerStringSelectQuestion,
  WorkerNumberSelectQuestion,
]);
export type WorkerQuestion = z.infer<typeof WorkerQuestion>;

export const FormSection = z.object({
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(Question),
});
export type FormSection = z.infer<typeof FormSection>;

export const WorkerFormSection = z.object({
  title: z.string(),
  description: z.string().optional(),
  questions: z.array(WorkerQuestion),
});
export type WorkerFormSection = z.infer<typeof WorkerFormSection>;

export const FormSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  userForm: FormSection,
  workerForm: WorkerFormSection,
  calculations: z.record(z.string(), z.string()),
  template: z.string(),
});
export type FormSchema = z.infer<typeof FormSchema>;

export const AnswerValue = z.union([z.string(), z.number()]).optional();
export type AnswerValue = z.infer<typeof AnswerValue>;

export const FormAnswers = z.record(z.string(), AnswerValue);
export type FormAnswers = z.infer<typeof FormAnswers>;
