"use client";

import {
  ActionIcon,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";

import {
  type FormDraft,
  makeQuestion,
  makeWorkerQuestion,
  QUESTION_TYPE_OPTIONS,
} from "@/lib/builder";
import type { Question, QuestionType, WorkerQuestion } from "@/lib/schema";

import { OptionsEditor } from "./OptionsEditor";

interface QuestionEditorProps {
  form: UseFormReturnType<FormDraft>;
  path: string;
  question: Question | WorkerQuestion;
  isWorker: boolean;
  userQuestionIds?: string[];
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function QuestionEditor({
  form,
  path,
  question,
  isWorker,
  userQuestionIds = [],
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
}: QuestionEditorProps) {
  const handleTypeChange = (next: QuestionType) => {
    const fresh = isWorker
      ? makeWorkerQuestion(next, {
          id: question.id,
          label: question.label,
          description: question.description,
          required: question.required,
        })
      : makeQuestion(next, {
          id: question.id,
          label: question.label,
          description: question.description,
          required: question.required,
        });
    form.setFieldValue(path, fresh);
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={5}>Question #{index + 1}</Title>
          <Group gap={4}>
            <ActionIcon
              variant="subtle"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Move up"
            >
              ↑
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              onClick={onMoveDown}
              disabled={index === total - 1}
              aria-label="Move down"
            >
              ↓
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={onRemove}
              aria-label="Remove question"
            >
              ✕
            </ActionIcon>
          </Group>
        </Group>

        <Group gap="sm" grow>
          <TextInput
            label="ID"
            placeholder="snake_case identifier"
            required
            {...form.getInputProps(`${path}.id`)}
          />
          <Select
            label="Type"
            data={QUESTION_TYPE_OPTIONS}
            value={question.type}
            onChange={(v) => v && handleTypeChange(v as QuestionType)}
            allowDeselect={false}
          />
        </Group>

        <TextInput
          label="Label"
          required
          {...form.getInputProps(`${path}.label`)}
        />
        <TextInput
          label="Description"
          {...form.getInputProps(`${path}.description`)}
        />
        <Checkbox
          label="Required"
          {...form.getInputProps(`${path}.required`, { type: "checkbox" })}
        />

        {isWorker && (
          <Select
            label="Prefill from user-form question"
            description="If set, the field is locked and shows the user's answer."
            placeholder="(not prefilled)"
            data={userQuestionIds}
            clearable
            {...form.getInputProps(`${path}.prefillFrom`)}
          />
        )}

        <TypeSpecificFields form={form} path={path} question={question} />
      </Stack>
    </Paper>
  );
}

interface TypeSpecificFieldsProps {
  form: UseFormReturnType<FormDraft>;
  path: string;
  question: Question | WorkerQuestion;
}

function TypeSpecificFields({ form, path, question }: TypeSpecificFieldsProps) {
  switch (question.type) {
    case "string":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.maxLength`)}
            />
          </Group>
        </>
      );
    case "textarea":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.maxLength`)}
            />
            <NumberInput
              label="Min rows"
              {...form.getInputProps(`${path}.minRows`)}
            />
            <NumberInput
              label="Max rows"
              {...form.getInputProps(`${path}.maxRows`)}
            />
          </Group>
        </>
      );
    case "password":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.maxLength`)}
            />
          </Group>
        </>
      );
    case "number":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <Group grow>
            <NumberInput
              label="Default value"
              {...form.getInputProps(`${path}.default`)}
            />
            <NumberInput label="Min" {...form.getInputProps(`${path}.min`)} />
            <NumberInput label="Max" {...form.getInputProps(`${path}.max`)} />
            <NumberInput label="Step" {...form.getInputProps(`${path}.step`)} />
          </Group>
        </>
      );
    case "select-string":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.options`}
            valueType="string"
            count={question.options.length}
          />
        </>
      );
    case "select-number":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.options`}
            valueType="number"
            count={question.options.length}
          />
        </>
      );
    case "multi-select":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <NumberInput
            label="Max selectable values"
            {...form.getInputProps(`${path}.maxValues`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.options`}
            valueType="string"
            count={question.options.length}
          />
        </>
      );
    case "radio":
      return (
        <>
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.options`}
            valueType="string"
            count={question.options.length}
          />
        </>
      );
    case "checkbox-group":
      return (
        <OptionsEditor
          form={form}
          path={`${path}.options`}
          valueType="string"
          count={question.options.length}
        />
      );
    case "boolean":
      return (
        <Checkbox
          label="Default checked"
          {...form.getInputProps(`${path}.default`, { type: "checkbox" })}
        />
      );
    case "segmented":
      return (
        <>
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.options`}
            valueType="string"
            count={question.options.length}
          />
        </>
      );
    case "slider":
      return (
        <Group grow>
          <NumberInput
            label="Min"
            required
            {...form.getInputProps(`${path}.min`)}
          />
          <NumberInput
            label="Max"
            required
            {...form.getInputProps(`${path}.max`)}
          />
          <NumberInput label="Step" {...form.getInputProps(`${path}.step`)} />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
        </Group>
      );
    case "rating":
      return (
        <Group grow>
          <NumberInput
            label="Count (stars)"
            {...form.getInputProps(`${path}.count`)}
          />
          <NumberInput
            label="Fractions"
            description="2 = half stars"
            {...form.getInputProps(`${path}.fractions`)}
          />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.default`)}
          />
        </Group>
      );
    case "color":
      return (
        <>
          <TextInput
            label="Default value"
            placeholder="#ffffff"
            {...form.getInputProps(`${path}.default`)}
          />
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <Select
            label="Format"
            data={["hex", "hexa", "rgb", "rgba", "hsl", "hsla"]}
            clearable
            {...form.getInputProps(`${path}.format`)}
          />
        </>
      );
    case "date":
      return (
        <Group grow>
          <TextInput
            type="date"
            label="Default"
            {...form.getInputProps(`${path}.default`)}
          />
          <TextInput
            type="date"
            label="Min"
            {...form.getInputProps(`${path}.min`)}
          />
          <TextInput
            type="date"
            label="Max"
            {...form.getInputProps(`${path}.max`)}
          />
        </Group>
      );
    case "time":
      return (
        <Group grow>
          <TextInput
            type="time"
            label="Default"
            {...form.getInputProps(`${path}.default`)}
          />
          <NumberInput
            label="Step (seconds)"
            {...form.getInputProps(`${path}.step`)}
          />
        </Group>
      );
    case "datetime":
      return (
        <TextInput
          type="datetime-local"
          label="Default"
          {...form.getInputProps(`${path}.default`)}
        />
      );
    case "tags":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.placeholder`)}
          />
          <NumberInput
            label="Max tags"
            {...form.getInputProps(`${path}.maxTags`)}
          />
        </>
      );
  }
}
