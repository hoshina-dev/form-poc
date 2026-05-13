"use client";

import {
  Button,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import type { UseFormReturnType } from "@mantine/form";

import { makeQuestion, makeWorkerQuestion, type FormDraft } from "@/lib/builder";

import { QuestionEditor } from "./QuestionEditor";

interface SectionEditorProps {
  form: UseFormReturnType<FormDraft>;
  path: "userForm" | "workerForm";
  isWorker: boolean;
  userQuestionIds?: string[];
}

export function SectionEditor({
  form,
  path,
  isWorker,
  userQuestionIds,
}: SectionEditorProps) {
  const section = form.values[path];
  const questionsPath = `${path}.questions`;

  return (
    <Paper withBorder p="md" radius="md">
      <Stack gap="md">
        <Title order={3}>{isWorker ? "Worker form" : "User form"}</Title>
        <TextInput
          label="Section title"
          required
          {...form.getInputProps(`${path}.title`)}
        />
        <TextInput
          label="Section description"
          {...form.getInputProps(`${path}.description`)}
        />

        <Stack gap="md">
          {section.questions.length === 0 && (
            <Text size="sm" c="dimmed">
              No questions yet.
            </Text>
          )}
          {section.questions.map((question, i) => (
            <QuestionEditor
              key={i}
              form={form}
              path={`${questionsPath}.${i}`}
              question={question}
              isWorker={isWorker}
              userQuestionIds={userQuestionIds}
              index={i}
              total={section.questions.length}
              onMoveUp={() =>
                form.reorderListItem(questionsPath, { from: i, to: i - 1 })
              }
              onMoveDown={() =>
                form.reorderListItem(questionsPath, { from: i, to: i + 1 })
              }
              onRemove={() => form.removeListItem(questionsPath, i)}
            />
          ))}
        </Stack>

        <Group>
          <Button
            variant="light"
            onClick={() =>
              form.insertListItem(
                questionsPath,
                isWorker ? makeWorkerQuestion("string") : makeQuestion("string"),
              )
            }
          >
            Add question
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}
