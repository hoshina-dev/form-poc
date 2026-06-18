"use client";

import type { Question, QuestionType } from "@hoshina-dev/forms";
import {
  ActionIcon,
  Button,
  Checkbox,
  Group,
  NumberInput,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";

import {
  type FormDraft,
  makeNestedQuestion,
  makeQuestion,
  NESTED_QUESTION_TYPE_OPTIONS,
  QUESTION_TYPE_OPTIONS,
} from "@/lib/builder";

import { OptionsEditor } from "./OptionsEditor";

interface QuestionEditorProps {
  form: UseFormReturnType<FormDraft>;
  path: string;
  question: Question;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  nested?: boolean;
}

export function QuestionEditor({
  form,
  path,
  question,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onRemove,
  nested = false,
}: QuestionEditorProps) {
  const handleTypeChange = (next: QuestionType) => {
    const base = {
      id: question.id,
      label: question.label,
      description: question.description,
      required: question.required,
    };
    const fresh = nested
      ? makeNestedQuestion(
          next as Exclude<QuestionType, "repeatable-group">,
          base,
        )
      : makeQuestion(next, base);
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
            data={nested ? NESTED_QUESTION_TYPE_OPTIONS : QUESTION_TYPE_OPTIONS}
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

        <TypeSpecificFields form={form} path={path} question={question} />
      </Stack>
    </Paper>
  );
}

interface TypeSpecificFieldsProps {
  form: UseFormReturnType<FormDraft>;
  path: string;
  question: Question;
}

function TypeSpecificFields({ form, path, question }: TypeSpecificFieldsProps) {
  switch (question.type) {
    case "string":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.config.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.config.maxLength`)}
            />
          </Group>
        </>
      );
    case "textarea":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.config.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.config.maxLength`)}
            />
            <NumberInput
              label="Min rows"
              {...form.getInputProps(`${path}.config.minRows`)}
            />
            <NumberInput
              label="Max rows"
              {...form.getInputProps(`${path}.config.maxRows`)}
            />
          </Group>
        </>
      );
    case "password":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <Group grow>
            <NumberInput
              label="Min length"
              {...form.getInputProps(`${path}.config.minLength`)}
            />
            <NumberInput
              label="Max length"
              {...form.getInputProps(`${path}.config.maxLength`)}
            />
          </Group>
        </>
      );
    case "number":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <Group grow>
            <NumberInput
              label="Default value"
              {...form.getInputProps(`${path}.config.default`)}
            />
            <NumberInput
              label="Min"
              {...form.getInputProps(`${path}.config.min`)}
            />
            <NumberInput
              label="Max"
              {...form.getInputProps(`${path}.config.max`)}
            />
            <NumberInput
              label="Step"
              {...form.getInputProps(`${path}.config.step`)}
            />
          </Group>
        </>
      );
    case "select-string":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.config.options`}
            valueType="string"
            count={question.config.options.length}
          />
        </>
      );
    case "select-number":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.config.options`}
            valueType="number"
            count={question.config.options.length}
          />
        </>
      );
    case "multi-select":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <NumberInput
            label="Max selectable values"
            {...form.getInputProps(`${path}.config.maxValues`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.config.options`}
            valueType="string"
            count={question.config.options.length}
          />
        </>
      );
    case "radio":
      return (
        <>
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.config.options`}
            valueType="string"
            count={question.config.options.length}
          />
        </>
      );
    case "checkbox-group":
      return (
        <OptionsEditor
          form={form}
          path={`${path}.config.options`}
          valueType="string"
          count={question.config.options.length}
        />
      );
    case "boolean":
      return (
        <Checkbox
          label="Default checked"
          {...form.getInputProps(`${path}.config.default`, {
            type: "checkbox",
          })}
        />
      );
    case "segmented":
      return (
        <>
          <TextInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <OptionsEditor
            form={form}
            path={`${path}.config.options`}
            valueType="string"
            count={question.config.options.length}
          />
        </>
      );
    case "slider":
      return (
        <Group grow>
          <NumberInput
            label="Min"
            required
            {...form.getInputProps(`${path}.config.min`)}
          />
          <NumberInput
            label="Max"
            required
            {...form.getInputProps(`${path}.config.max`)}
          />
          <NumberInput
            label="Step"
            {...form.getInputProps(`${path}.config.step`)}
          />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
        </Group>
      );
    case "rating":
      return (
        <Group grow>
          <NumberInput
            label="Count (stars)"
            {...form.getInputProps(`${path}.config.count`)}
          />
          <NumberInput
            label="Fractions"
            description="2 = half stars"
            {...form.getInputProps(`${path}.config.fractions`)}
          />
          <NumberInput
            label="Default value"
            {...form.getInputProps(`${path}.config.default`)}
          />
        </Group>
      );
    case "color":
      return (
        <>
          <TextInput
            label="Default value"
            placeholder="#ffffff"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <Select
            label="Format"
            data={["hex", "hexa", "rgb", "rgba", "hsl", "hsla"]}
            clearable
            {...form.getInputProps(`${path}.config.format`)}
          />
        </>
      );
    case "date":
      return (
        <Group grow>
          <TextInput
            type="date"
            label="Default"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <TextInput
            type="date"
            label="Min"
            {...form.getInputProps(`${path}.config.min`)}
          />
          <TextInput
            type="date"
            label="Max"
            {...form.getInputProps(`${path}.config.max`)}
          />
        </Group>
      );
    case "time":
      return (
        <Group grow>
          <TextInput
            type="time"
            label="Default"
            {...form.getInputProps(`${path}.config.default`)}
          />
          <NumberInput
            label="Step (seconds)"
            {...form.getInputProps(`${path}.config.step`)}
          />
        </Group>
      );
    case "datetime":
      return (
        <TextInput
          type="datetime-local"
          label="Default"
          {...form.getInputProps(`${path}.config.default`)}
        />
      );
    case "tags":
      return (
        <>
          <TextInput
            label="Placeholder"
            {...form.getInputProps(`${path}.config.placeholder`)}
          />
          <NumberInput
            label="Max tags"
            {...form.getInputProps(`${path}.config.maxTags`)}
          />
        </>
      );
    case "repeatable-group": {
      const childrenPath = `${path}.config.questions`;
      const children = question.config.questions;
      return (
        <>
          <NumberInput
            label="Repetition count"
            min={1}
            {...form.getInputProps(`${path}.config.count`)}
          />
          <TextInput
            label="Item label"
            {...form.getInputProps(`${path}.config.itemLabel`)}
          />
          <Stack gap="md">
            {children.length === 0 && (
              <Text size="sm" c="dimmed">
                No child questions yet.
              </Text>
            )}
            {children.map((child, j) => (
              <QuestionEditor
                key={j}
                nested
                form={form}
                path={`${childrenPath}.${j}`}
                question={child}
                index={j}
                total={children.length}
                onMoveUp={() =>
                  form.reorderListItem(childrenPath, { from: j, to: j - 1 })
                }
                onMoveDown={() =>
                  form.reorderListItem(childrenPath, { from: j, to: j + 1 })
                }
                onRemove={() => form.removeListItem(childrenPath, j)}
              />
            ))}
          </Stack>
          <Button
            size="xs"
            variant="light"
            onClick={() =>
              form.insertListItem(childrenPath, makeNestedQuestion("number"))
            }
          >
            Add child question
          </Button>
        </>
      );
    }
  }
}
