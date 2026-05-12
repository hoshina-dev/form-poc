"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Code,
  Group,
  Paper,
  Stack,
  Stepper,
  Text,
  Title,
} from "@mantine/core";
import type {
  AnswerValue,
  FormAnswers,
  FormSchema,
  QuestionId,
} from "@/lib/schema";
import {
  evaluateCalculations,
  interpolateTemplate,
} from "@/lib/evaluator";
import { FormRenderer } from "./FormRenderer";

type Stage = 0 | 1 | 2;

interface FormFlowProps {
  form: FormSchema;
}

export function FormFlow({ form }: FormFlowProps) {
  const [stage, setStage] = useState<Stage>(0);
  const [userAnswers, setUserAnswers] = useState<FormAnswers>({});
  const [workerAnswers, setWorkerAnswers] = useState<FormAnswers>({});

  const [seen, setSeen] = useState(form);
  if (seen !== form) {
    setSeen(form);
    setStage(0);
    setUserAnswers({});
    setWorkerAnswers({});
  }

  const lockedValues = useMemo(() => {
    const locked: Record<QuestionId, AnswerValue> = {};
    for (const q of form.workerForm.questions) {
      if (q.prefillFrom !== undefined) {
        locked[q.id] = userAnswers[q.prefillFrom];
      }
    }
    return locked;
  }, [form.workerForm.questions, userAnswers]);

  const restart = () => {
    setStage(0);
    setUserAnswers({});
    setWorkerAnswers({});
  };

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>{form.title}</Title>
        {form.description && <Text c="dimmed">{form.description}</Text>}
      </div>

      <Stepper active={stage} allowNextStepsSelect={false}>
        <Stepper.Step label="User" description={form.userForm.title} />
        <Stepper.Step label="Worker" description={form.workerForm.title} />
        <Stepper.Step label="Result" description="Computed output" />
      </Stepper>

      {stage === 0 && (
        <FormRenderer
          section={form.userForm}
          submitLabel="Send to worker"
          onSubmit={(answers) => {
            setUserAnswers(answers);
            setStage(1);
          }}
        />
      )}

      {stage === 1 && (
        <Stack gap="md">
          <FormRenderer
            section={form.workerForm}
            lockedValues={lockedValues}
            submitLabel="Submit & calculate"
            onSubmit={(answers) => {
              setWorkerAnswers(answers);
              setStage(2);
            }}
          />
          <Button
            variant="subtle"
            onClick={restart}
            style={{ alignSelf: "flex-start" }}
          >
            Back to user form
          </Button>
        </Stack>
      )}

      {stage === 2 && (
        <ResultView
          form={form}
          userAnswers={userAnswers}
          workerAnswers={workerAnswers}
          onRestart={restart}
        />
      )}
    </Stack>
  );
}

interface ResultViewProps {
  form: FormSchema;
  userAnswers: FormAnswers;
  workerAnswers: FormAnswers;
  onRestart: () => void;
}

function ResultView({
  form,
  userAnswers,
  workerAnswers,
  onRestart,
}: ResultViewProps) {
  const context: Record<string, unknown> = { ...userAnswers, ...workerAnswers };
  const { results, errors } = evaluateCalculations(form.calculations, context);
  const fullContext = { ...context, ...results };
  const interpolated = interpolateTemplate(form.template, fullContext);

  const output: Record<string, unknown> = {
    user: userAnswers,
    worker: workerAnswers,
    calculations: results,
  };
  if (Object.keys(errors).length) {
    output.errors = errors;
  }

  return (
    <Stack gap="md">
      <Paper withBorder p="md" radius="md">
        <Title order={4}>Summary</Title>
        <Text mt="xs">{interpolated}</Text>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4}>Output JSON</Title>
        <Code block mt="xs">
          {JSON.stringify(output, null, 2)}
        </Code>
      </Paper>

      {Object.keys(errors).length > 0 && (
        <Alert color="red" variant="light" title="Calculation errors">
          <Stack gap={4}>
            {Object.entries(errors).map(([name, msg]) => (
              <Text size="sm" key={name}>
                <Text component="span" fw={600}>
                  {name}
                </Text>
                : {msg}
              </Text>
            ))}
          </Stack>
        </Alert>
      )}

      <Group>
        <Button onClick={onRestart}>Start over</Button>
      </Group>
    </Stack>
  );
}
