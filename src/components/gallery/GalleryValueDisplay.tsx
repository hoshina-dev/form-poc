"use client";

import { Code, Paper, Stack, Text } from "@mantine/core";
import { useState } from "react";

import { QuestionField } from "@/components/FormRenderer";
import type { AnswerValue, Question } from "@/lib/schema";

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

interface GalleryValueDisplayProps {
  question: Question;
}

export function GalleryValueDisplay({ question }: GalleryValueDisplayProps) {
  const [value, setValue] = useState<AnswerValue>(defaultFor(question));

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <QuestionField question={question} value={value} onChange={setValue} />
      </Paper>
      <div>
        <Text size="sm" c="dimmed" mb={4}>
          Current value
        </Text>
        <Code block>{JSON.stringify(value, null, 2)}</Code>
      </div>
    </Stack>
  );
}
