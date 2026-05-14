"use client";

import {
  Button,
  Checkbox,
  ColorInput,
  MultiSelect,
  NumberInput,
  PasswordInput,
  Radio,
  Rating,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { useMemo, useState } from "react";

import type {
  AnswerValue,
  FormAnswers,
  Question,
  QuestionId,
} from "@/lib/schema";

interface RenderableSection {
  title: string;
  description?: string;
  questions: Question[];
}

interface FormRendererProps {
  section: RenderableSection;
  lockedValues?: Record<QuestionId, AnswerValue>;
  submitLabel?: string;
  onSubmit: (answers: FormAnswers) => void;
}

function defaultFor(q: Question): AnswerValue {
  if ("default" in q && q.default !== undefined) {
    return q.default as AnswerValue;
  }
  switch (q.type) {
    case "boolean":
      return false;
    case "multi-select":
    case "checkbox-group":
    case "tags":
      return [];
    default:
      return undefined;
  }
}

export function FormRenderer({
  section,
  lockedValues = {},
  submitLabel = "Submit",
  onSubmit,
}: FormRendererProps) {
  const initialAnswers = useMemo(() => {
    const answers: FormAnswers = {};
    for (const q of section.questions) {
      answers[q.id] = q.id in lockedValues ? lockedValues[q.id] : defaultFor(q);
    }
    return answers;
  }, [section, lockedValues]);

  const [answers, setAnswers] = useState<FormAnswers>(initialAnswers);

  const [seen, setSeen] = useState(section);
  if (seen !== section) {
    setSeen(section);
    setAnswers(initialAnswers);
  }

  return (
    <Stack
      component="form"
      gap="md"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(answers);
      }}
    >
      <div>
        <Title order={3}>{section.title}</Title>
        {section.description && (
          <Text c="dimmed" size="sm">
            {section.description}
          </Text>
        )}
      </div>

      {section.questions.map((q) => (
        <QuestionField
          key={q.id}
          question={q}
          value={answers[q.id]}
          disabled={q.id in lockedValues}
          onChange={(value) =>
            setAnswers((prev) => ({ ...prev, [q.id]: value }))
          }
        />
      ))}

      <Button type="submit" mt="sm" style={{ alignSelf: "flex-start" }}>
        {submitLabel}
      </Button>
    </Stack>
  );
}

interface QuestionFieldProps {
  question: Question;
  value: AnswerValue;
  disabled?: boolean;
  onChange: (value: AnswerValue) => void;
}

function asString(value: AnswerValue): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: AnswerValue): string[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(value: AnswerValue, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function QuestionField({
  question,
  value,
  disabled,
  onChange,
}: QuestionFieldProps) {
  switch (question.type) {
    case "string":
      return (
        <TextInput
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          minLength={question.minLength}
          maxLength={question.maxLength}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "textarea":
      return (
        <Textarea
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          minLength={question.minLength}
          maxLength={question.maxLength}
          autosize
          minRows={question.minRows ?? 2}
          maxRows={question.maxRows ?? 8}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "password":
      return (
        <PasswordInput
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          minLength={question.minLength}
          maxLength={question.maxLength}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "number":
      return (
        <NumberInput
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          min={question.min}
          max={question.max}
          step={question.step}
          value={typeof value === "number" ? value : ""}
          onChange={(next) => {
            if (next === "" || next === null || next === undefined) {
              onChange(undefined);
            } else {
              onChange(typeof next === "number" ? next : Number(next));
            }
          }}
        />
      );

    case "select-string":
      return (
        <Select
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          data={question.options.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          value={typeof value === "string" ? value : null}
          onChange={(next) => onChange(next ?? undefined)}
        />
      );

    case "select-number":
      return (
        <Select
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          data={question.options.map((o) => ({
            value: String(o.value),
            label: o.label,
          }))}
          value={typeof value === "number" ? String(value) : null}
          onChange={(next) =>
            onChange(next === null ? undefined : Number(next))
          }
        />
      );

    case "multi-select":
      return (
        <MultiSelect
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          maxValues={question.maxValues}
          data={question.options.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
          value={asStringArray(value)}
          onChange={(next) => onChange(next.length === 0 ? [] : next)}
        />
      );

    case "radio":
      return (
        <Radio.Group
          label={question.label}
          description={question.description}
          required={question.required}
          value={typeof value === "string" ? value : null}
          onChange={(next) => onChange(next || undefined)}
        >
          <Stack gap="xs" mt="xs">
            {question.options.map((o) => (
              <Radio
                key={o.value}
                value={o.value}
                label={o.label}
                disabled={disabled}
              />
            ))}
          </Stack>
        </Radio.Group>
      );

    case "checkbox-group":
      return (
        <Checkbox.Group
          label={question.label}
          description={question.description}
          required={question.required}
          value={asStringArray(value)}
          onChange={(next) => onChange(next)}
        >
          <Stack gap="xs" mt="xs">
            {question.options.map((o) => (
              <Checkbox
                key={o.value}
                value={o.value}
                label={o.label}
                disabled={disabled}
              />
            ))}
          </Stack>
        </Checkbox.Group>
      );

    case "boolean":
      return (
        <Switch
          label={question.label}
          description={question.description}
          disabled={disabled}
          checked={value === true}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
      );

    case "segmented":
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {question.label}
            {question.required && (
              <Text component="span" c="red" ml={4}>
                *
              </Text>
            )}
          </Text>
          {question.description && (
            <Text size="xs" c="dimmed">
              {question.description}
            </Text>
          )}
          <SegmentedControl
            disabled={disabled}
            data={question.options.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            value={asString(value)}
            onChange={(next) => onChange(next || undefined)}
          />
        </Stack>
      );

    case "slider":
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {question.label}
            {question.required && (
              <Text component="span" c="red" ml={4}>
                *
              </Text>
            )}
          </Text>
          {question.description && (
            <Text size="xs" c="dimmed">
              {question.description}
            </Text>
          )}
          <Slider
            disabled={disabled}
            min={question.min}
            max={question.max}
            step={question.step}
            marks={question.marks}
            value={asNumber(value, question.default ?? question.min)}
            onChange={(next) => onChange(next)}
          />
        </Stack>
      );

    case "rating":
      return (
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            {question.label}
            {question.required && (
              <Text component="span" c="red" ml={4}>
                *
              </Text>
            )}
          </Text>
          {question.description && (
            <Text size="xs" c="dimmed">
              {question.description}
            </Text>
          )}
          <Rating
            readOnly={disabled}
            count={question.count ?? 5}
            fractions={question.fractions}
            value={asNumber(value, 0)}
            onChange={(next) => onChange(next === 0 ? undefined : next)}
          />
        </Stack>
      );

    case "color":
      return (
        <ColorInput
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          swatches={question.swatches}
          format={question.format ?? "hex"}
          value={asString(value)}
          onChange={(next) => onChange(next || undefined)}
        />
      );

    case "date":
      return (
        <TextInput
          type="date"
          label={question.label}
          description={question.description}
          required={question.required}
          disabled={disabled}
          min={question.min}
          max={question.max}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "time":
      return (
        <TextInput
          type="time"
          label={question.label}
          description={question.description}
          required={question.required}
          disabled={disabled}
          step={question.step}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "datetime":
      return (
        <TextInput
          type="datetime-local"
          label={question.label}
          description={question.description}
          required={question.required}
          disabled={disabled}
          value={asString(value)}
          onChange={(event) => {
            const next = event.currentTarget.value;
            onChange(next === "" ? undefined : next);
          }}
        />
      );

    case "tags":
      return (
        <TagsInput
          label={question.label}
          description={question.description}
          placeholder={question.placeholder}
          required={question.required}
          disabled={disabled}
          maxTags={question.maxTags}
          data={question.suggestions}
          value={asStringArray(value)}
          onChange={(next) => onChange(next)}
        />
      );
  }
}
