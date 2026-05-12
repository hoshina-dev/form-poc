"use client";

import { useMemo, useState } from "react";
import {
  Button,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
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

export function FormRenderer({
  section,
  lockedValues = {},
  submitLabel = "Submit",
  onSubmit,
}: FormRendererProps) {
  const initialAnswers = useMemo(() => {
    const answers: FormAnswers = {};
    for (const q of section.questions) {
      answers[q.id] = q.id in lockedValues ? lockedValues[q.id] : q.default;
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
          value={typeof value === "string" ? value : ""}
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
  }
}
