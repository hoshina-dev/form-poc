"use client";

import {
  type AnswerValue,
  type FormAnswers,
  FormRenderer,
  type FormSchema,
  type QuestionId,
} from "@hoshina-dev/forms";
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  saveExperimentStateAction,
  startExperimentAction,
} from "@/app/actions/experiment-manager";
import { LinkAnchor } from "@/components/LinkButton";
import { evaluateCalculations, interpolateTemplate } from "@/lib/evaluator";
import type { TemplateRef } from "@/lib/experiment-manager/mappers";
import {
  phaseToStage,
  type ExperimentRunState,
} from "@/lib/experiment-manager/state";
import { experimentPath } from "@/lib/routes";

type Stage = 0 | 1 | 2;

interface FormFlowProps {
  form: FormSchema;
  /** When set, creates an experiment instance and persists phase state via BFF. */
  experimentRef?: TemplateRef;
  /** When set, continues an existing experiment from saved state. */
  resume?: {
    expId: string;
    runState: ExperimentRunState;
  };
  /** Override restart behavior (defaults to resetting the local session). */
  onRestart?: () => void;
}

function hasUserPhase(form: FormSchema): boolean {
  return form.userForm.questions.length > 0;
}

export function FormFlow({ onRestart, ...props }: FormFlowProps) {
  const [session, setSession] = useState(0);
  const sessionKey = props.resume
    ? `resume-${props.resume.expId}-${session}`
    : `${props.form.id}-${session}`;

  const handleRestart =
    onRestart ?? (() => setSession((value) => value + 1));

  return (
    <FormFlowSession
      key={sessionKey}
      {...props}
      onRestart={handleRestart}
    />
  );
}

interface FormFlowSessionProps extends FormFlowProps {
  onRestart: () => void;
}

function FormFlowSession({
  form,
  experimentRef,
  resume,
  onRestart,
}: FormFlowSessionProps) {
  const skipUser = !hasUserPhase(form);
  const [stage, setStage] = useState<Stage>(() =>
    resume
      ? phaseToStage(resume.runState.phase, skipUser)
      : skipUser
        ? 1
        : 0,
  );
  const [userAnswers, setUserAnswers] = useState<FormAnswers>(
    () => resume?.runState.user ?? {},
  );
  const [workerAnswers, setWorkerAnswers] = useState<FormAnswers>(
    () => resume?.runState.worker ?? {},
  );
  const [expId, setExpId] = useState<string | null>(() => resume?.expId ?? null);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const startingRef = useRef(Boolean(resume?.expId));

  const sampleId = experimentRef?.sampleId;
  const templateId = experimentRef?.templateId;

  const persistState = useCallback(
    async (id: string, state: ExperimentRunState) => {
      const result = await saveExperimentStateAction(id, state);
      if (!result.success) {
        setPersistError(result.error);
      }
    },
    [],
  );

  useEffect(() => {
    if (resume?.expId || !sampleId || !templateId || expId || startingRef.current)
      return;
    startingRef.current = true;
    const id = crypto.randomUUID();
    const ref = { sampleId, templateId };
    startTransition(async () => {
      const result = await startExperimentAction(ref, id);
      if (result.success) {
        setExpId(id);
        await persistState(id, { phase: skipUser ? "worker" : "user" });
      } else {
        setPersistError(result.error);
        startingRef.current = false;
      }
    });
  }, [sampleId, templateId, expId, skipUser, persistState, resume?.expId]);

  const lockedValues = useMemo(() => {
    const locked: Record<QuestionId, AnswerValue> = {};
    for (const q of form.workerForm.questions) {
      if (q.prefillFrom !== undefined) {
        locked[q.id] = userAnswers[q.prefillFrom];
      }
    }
    return locked;
  }, [form.workerForm.questions, userAnswers]);

  const backToUser = () => {
    setStage(0);
    setUserAnswers({});
    setWorkerAnswers({});
    setPersistError(null);
  };

  const userLabel = form.userForm.title || "User";
  const workerLabel = form.workerForm.title || "Worker";

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>{form.title}</Title>
        {form.description && <Text c="dimmed">{form.description}</Text>}
        {experimentRef && expId && (
          <Text size="xs" c="dimmed" mt={4}>
            experiment {expId}
            {resume ? " · resumed" : ""} ·{" "}
            <LinkAnchor href={experimentPath(expId)} size="xs">
              View saved run
            </LinkAnchor>
          </Text>
        )}
      </div>

      {persistError && (
        <Alert color="orange" variant="light" title="Persistence warning">
          {persistError}
        </Alert>
      )}

      <Stepper active={stage} allowNextStepsSelect={false}>
        {!skipUser && <Stepper.Step label="User" description={userLabel} />}
        <Stepper.Step label="Worker" description={workerLabel} />
        <Stepper.Step label="Result" description="Computed output" />
      </Stepper>

      {stage === 0 && !skipUser && (
        <FormRenderer
          section={form.userForm}
          initialValues={userAnswers}
          submitLabel="Continue to worker phase"
          onSubmit={(answers) => {
            setUserAnswers(answers);
            setStage(1);
            if (expId) {
              startTransition(() =>
                persistState(expId, { phase: "worker", user: answers }),
              );
            }
          }}
        />
      )}

      {stage === 1 && (
        <Stack gap="md">
          <FormRenderer
            section={form.workerForm}
            lockedValues={lockedValues}
            initialValues={workerAnswers}
            submitLabel="Submit & calculate"
            onSubmit={(answers) => {
              setWorkerAnswers(answers);
              setStage(2);
              if (expId) {
                startTransition(() =>
                  persistState(expId, {
                    phase: "worker",
                    user: userAnswers,
                    worker: answers,
                  }),
                );
              }
            }}
          />
          {!skipUser && (
            <Button
              variant="subtle"
              onClick={backToUser}
              style={{ alignSelf: "flex-start" }}
            >
              Back to user phase
            </Button>
          )}
        </Stack>
      )}

      {stage === 2 && (
        <ResultView
          form={form}
          userAnswers={userAnswers}
          workerAnswers={workerAnswers}
          expId={expId}
          onRestart={onRestart}
        />
      )}
    </Stack>
  );
}

interface ResultViewProps {
  form: FormSchema;
  userAnswers: FormAnswers;
  workerAnswers: FormAnswers;
  expId: string | null;
  onRestart: () => void;
}

function ResultView({
  form,
  userAnswers,
  workerAnswers,
  expId,
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

  const [, startTransition] = useTransition();
  const savedRef = useRef(false);
  const [persistError, setPersistError] = useState<string | null>(null);

  useEffect(() => {
    if (!expId || savedRef.current) return;
    savedRef.current = true;
    startTransition(() =>
      saveExperimentStateAction(expId, {
        phase: "result",
        user: userAnswers,
        worker: workerAnswers,
        calculations: results,
        summary: interpolated,
        ...(Object.keys(errors).length ? { errors } : {}),
      }).then((result) => {
        if (!result.success) {
          setPersistError(result.error);
        }
      }),
    );
  }, [
    expId,
    userAnswers,
    workerAnswers,
    results,
    errors,
    interpolated,
    startTransition,
  ]);

  return (
    <Stack gap="md">
      {persistError && (
        <Alert color="orange" variant="light" title="Persistence warning">
          {persistError}
        </Alert>
      )}

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
