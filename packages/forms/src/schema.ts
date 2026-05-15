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

export const TextareaQuestion = BaseQuestion.extend({
  type: z.literal("textarea"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  minRows: z.number().optional(),
  maxRows: z.number().optional(),
});
export type TextareaQuestion = z.infer<typeof TextareaQuestion>;

export const PasswordQuestion = BaseQuestion.extend({
  type: z.literal("password"),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  placeholder: z.string().optional(),
});
export type PasswordQuestion = z.infer<typeof PasswordQuestion>;

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

export const MultiSelectQuestion = BaseQuestion.extend({
  type: z.literal("multi-select"),
  options: z.array(StringSelectOption),
  default: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  maxValues: z.number().optional(),
});
export type MultiSelectQuestion = z.infer<typeof MultiSelectQuestion>;

export const RadioQuestion = BaseQuestion.extend({
  type: z.literal("radio"),
  options: z.array(StringSelectOption),
  default: z.string().optional(),
});
export type RadioQuestion = z.infer<typeof RadioQuestion>;

export const CheckboxGroupQuestion = BaseQuestion.extend({
  type: z.literal("checkbox-group"),
  options: z.array(StringSelectOption),
  default: z.array(z.string()).optional(),
});
export type CheckboxGroupQuestion = z.infer<typeof CheckboxGroupQuestion>;

export const BooleanQuestion = BaseQuestion.extend({
  type: z.literal("boolean"),
  default: z.boolean().optional(),
});
export type BooleanQuestion = z.infer<typeof BooleanQuestion>;

export const SegmentedQuestion = BaseQuestion.extend({
  type: z.literal("segmented"),
  options: z.array(StringSelectOption),
  default: z.string().optional(),
});
export type SegmentedQuestion = z.infer<typeof SegmentedQuestion>;

export const SliderQuestion = BaseQuestion.extend({
  type: z.literal("slider"),
  min: z.number(),
  max: z.number(),
  step: z.number().optional(),
  default: z.number().optional(),
  marks: z
    .array(z.object({ value: z.number(), label: z.string().optional() }))
    .optional(),
});
export type SliderQuestion = z.infer<typeof SliderQuestion>;

export const RatingQuestion = BaseQuestion.extend({
  type: z.literal("rating"),
  count: z.number().optional(),
  fractions: z.number().optional(),
  default: z.number().optional(),
});
export type RatingQuestion = z.infer<typeof RatingQuestion>;

export const ColorQuestion = BaseQuestion.extend({
  type: z.literal("color"),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  swatches: z.array(z.string()).optional(),
  format: z.enum(["hex", "hexa", "rgb", "rgba", "hsl", "hsla"]).optional(),
});
export type ColorQuestion = z.infer<typeof ColorQuestion>;

export const DateQuestion = BaseQuestion.extend({
  type: z.literal("date"),
  default: z.string().optional(),
  min: z.string().optional(),
  max: z.string().optional(),
});
export type DateQuestion = z.infer<typeof DateQuestion>;

export const TimeQuestion = BaseQuestion.extend({
  type: z.literal("time"),
  default: z.string().optional(),
  step: z.number().optional(),
});
export type TimeQuestion = z.infer<typeof TimeQuestion>;

export const DateTimeQuestion = BaseQuestion.extend({
  type: z.literal("datetime"),
  default: z.string().optional(),
});
export type DateTimeQuestion = z.infer<typeof DateTimeQuestion>;

export const TagsQuestion = BaseQuestion.extend({
  type: z.literal("tags"),
  default: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  maxTags: z.number().optional(),
  suggestions: z.array(z.string()).optional(),
});
export type TagsQuestion = z.infer<typeof TagsQuestion>;

export const Question = z.discriminatedUnion("type", [
  StringQuestion,
  TextareaQuestion,
  PasswordQuestion,
  NumberQuestion,
  StringSelectQuestion,
  NumberSelectQuestion,
  MultiSelectQuestion,
  RadioQuestion,
  CheckboxGroupQuestion,
  BooleanQuestion,
  SegmentedQuestion,
  SliderQuestion,
  RatingQuestion,
  ColorQuestion,
  DateQuestion,
  TimeQuestion,
  DateTimeQuestion,
  TagsQuestion,
]);
export type Question = z.infer<typeof Question>;
export type QuestionType = Question["type"];
export type QuestionId = Question["id"];

const prefillExt = { prefillFrom: z.string().optional() };

export const WorkerStringQuestion = StringQuestion.extend(prefillExt);
export type WorkerStringQuestion = z.infer<typeof WorkerStringQuestion>;

export const WorkerTextareaQuestion = TextareaQuestion.extend(prefillExt);
export type WorkerTextareaQuestion = z.infer<typeof WorkerTextareaQuestion>;

export const WorkerPasswordQuestion = PasswordQuestion.extend(prefillExt);
export type WorkerPasswordQuestion = z.infer<typeof WorkerPasswordQuestion>;

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

export const WorkerMultiSelectQuestion = MultiSelectQuestion.extend(prefillExt);
export type WorkerMultiSelectQuestion = z.infer<
  typeof WorkerMultiSelectQuestion
>;

export const WorkerRadioQuestion = RadioQuestion.extend(prefillExt);
export type WorkerRadioQuestion = z.infer<typeof WorkerRadioQuestion>;

export const WorkerCheckboxGroupQuestion =
  CheckboxGroupQuestion.extend(prefillExt);
export type WorkerCheckboxGroupQuestion = z.infer<
  typeof WorkerCheckboxGroupQuestion
>;

export const WorkerBooleanQuestion = BooleanQuestion.extend(prefillExt);
export type WorkerBooleanQuestion = z.infer<typeof WorkerBooleanQuestion>;

export const WorkerSegmentedQuestion = SegmentedQuestion.extend(prefillExt);
export type WorkerSegmentedQuestion = z.infer<typeof WorkerSegmentedQuestion>;

export const WorkerSliderQuestion = SliderQuestion.extend(prefillExt);
export type WorkerSliderQuestion = z.infer<typeof WorkerSliderQuestion>;

export const WorkerRatingQuestion = RatingQuestion.extend(prefillExt);
export type WorkerRatingQuestion = z.infer<typeof WorkerRatingQuestion>;

export const WorkerColorQuestion = ColorQuestion.extend(prefillExt);
export type WorkerColorQuestion = z.infer<typeof WorkerColorQuestion>;

export const WorkerDateQuestion = DateQuestion.extend(prefillExt);
export type WorkerDateQuestion = z.infer<typeof WorkerDateQuestion>;

export const WorkerTimeQuestion = TimeQuestion.extend(prefillExt);
export type WorkerTimeQuestion = z.infer<typeof WorkerTimeQuestion>;

export const WorkerDateTimeQuestion = DateTimeQuestion.extend(prefillExt);
export type WorkerDateTimeQuestion = z.infer<typeof WorkerDateTimeQuestion>;

export const WorkerTagsQuestion = TagsQuestion.extend(prefillExt);
export type WorkerTagsQuestion = z.infer<typeof WorkerTagsQuestion>;

export const WorkerQuestion = z.discriminatedUnion("type", [
  WorkerStringQuestion,
  WorkerTextareaQuestion,
  WorkerPasswordQuestion,
  WorkerNumberQuestion,
  WorkerStringSelectQuestion,
  WorkerNumberSelectQuestion,
  WorkerMultiSelectQuestion,
  WorkerRadioQuestion,
  WorkerCheckboxGroupQuestion,
  WorkerBooleanQuestion,
  WorkerSegmentedQuestion,
  WorkerSliderQuestion,
  WorkerRatingQuestion,
  WorkerColorQuestion,
  WorkerDateQuestion,
  WorkerTimeQuestion,
  WorkerDateTimeQuestion,
  WorkerTagsQuestion,
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

export const AnswerValue = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.string())])
  .optional();
export type AnswerValue = z.infer<typeof AnswerValue>;

export const FormAnswers = z.record(z.string(), AnswerValue);
export type FormAnswers = z.infer<typeof FormAnswers>;
