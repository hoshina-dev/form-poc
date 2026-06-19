"use client";

import {
  type ExperimentTemplate,
  type FormAnswers,
  FormRenderer,
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
  calculateExperimentAction,
  saveExperimentStateAction,
  startExperimentAction,
} from "@/app/actions/experiment-manager";
import { LinkAnchor } from "@/components/LinkButton";
import type { SessionUser } from "@/lib/auth/definitions";
import type { TemplateRef } from "@/lib/experiment-manager/mappers";
import {
  createExperimentRunState,
  type ExperimentRunResult,
  type ExperimentRunState,
  phaseToStage,
} from "@/lib/experiment-manager/state";
import { experimentPath } from "@/lib/routes";

type Stage = 0 | 1 | 2;

interface FormFlowProps {
  template: ExperimentTemplate;
  title: string;
  description?: string;
  viewer: SessionUser;
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

export function FormFlow({ onRestart, ...props }: FormFlowProps) {
  const [session, setSession] = useState(0);
  const sessionKey = props.resume
    ? `resume-${props.resume.expId}-${session}`
    : `session-${session}`;

  const handleRestart = onRestart ?? (() => setSession((value) => value + 1));

  return (
    <FormFlowSession key={sessionKey} {...props} onRestart={handleRestart} />
  );
}

interface FormFlowSessionProps extends FormFlowProps {
  onRestart: () => void;
}

function FormFlowSession({
  template,
  title,
  description,
  viewer,
  experimentRef,
  resume,
  onRestart,
}: FormFlowSessionProps) {
  const [stage, setStage] = useState<Stage>(() =>
    resume ? phaseToStage(resume.runState.state.phase) : 0,
  );
  const [userAnswers, setUserAnswers] = useState<FormAnswers>(
    () => resume?.runState.state.answers.user ?? {},
  );
  const [workerAnswers, setWorkerAnswers] = useState<FormAnswers>(
    () => resume?.runState.state.answers.worker ?? {},
  );
  const [expId, setExpId] = useState<string | null>(
    () => resume?.expId ?? null,
  );
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistNotice, setPersistNotice] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const startingRef = useRef(Boolean(resume?.expId));

  const sampleId = experimentRef?.sampleId;
  const templateId = experimentRef?.templateId;
  const isClient = viewer.appRole === "client";
  const isTechnician = viewer.appRole === "technician";
  const createdBy = useMemo(
    () =>
      resume?.runState.createdBy ?? {
        id: viewer.userId,
        name: viewer.name,
        email: viewer.email,
      },
    [resume?.runState.createdBy, viewer.email, viewer.name, viewer.userId],
  );
  const technicianLogs = useMemo(
    () => resume?.runState.technicianLogs ?? [],
    [resume?.runState.technicianLogs],
  );

  const persistState = useCallback(
    async (id: string, state: ExperimentRunState, successMessage?: string) => {
      const result = await saveExperimentStateAction(id, state);
      if (!result.success) {
        setPersistError(result.error);
        setPersistNotice(null);
        return;
      }
      setPersistError(null);
      if (successMessage) {
        setPersistNotice(successMessage);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      resume?.expId ||
      !sampleId ||
      !templateId ||
      expId ||
      startingRef.current
    )
      return;
    startingRef.current = true;
    const ref = { sampleId, templateId };
    startTransition(async () => {
      const result = await startExperimentAction(ref);
      if (result.success) {
        const newExpId = result.data.expId;
        setExpId(newExpId);
        await persistState(
          newExpId,
          createExperimentRunState({
            template,
            createdBy,
            technicianLogs,
            phase: "user",
          }),
        );
      } else {
        setPersistError(result.error);
        startingRef.current = false;
      }
    });
  }, [
    sampleId,
    templateId,
    expId,
    persistState,
    resume?.expId,
    template,
    createdBy,
    technicianLogs,
  ]);

  const clientLabel = template.clientForm.title || "Client";
  const labLabel = template.labForm.title || "Lab";
  const canPersistDraft = Boolean(expId);

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>{title}</Title>
        {description && <Text c="dimmed">{description}</Text>}
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
        <Alert
          color={persistError.includes("calculation failed") ? "red" : "orange"}
          variant="light"
          title={
            persistError.includes("calculation failed")
              ? "Calculation failed"
              : "Persistence warning"
          }
        >
          {persistError}
          {persistError.includes("calculation failed") && (
            <Text size="sm" mt="xs">
              Your answers were saved. Fix any issues above, then click Submit
              &amp; finish again to retry the calculation.
            </Text>
          )}
        </Alert>
      )}
      {persistNotice && (
        <Alert color="green" variant="light" title="Draft saved">
          {persistNotice}
        </Alert>
      )}

      <Stepper active={stage} allowNextStepsSelect={false}>
        <Stepper.Step label="Client" description={clientLabel} />
        <Stepper.Step label="Technician" description={labLabel} />
        <Stepper.Step label="Result" description="Computed output" />
      </Stepper>

      {stage === 0 && isClient && (
        <FormRenderer
          doc={template.clientForm}
          initialValues={userAnswers}
          submitLabel="Submit to technician"
          onSaveDraft={
            canPersistDraft
              ? (answers) => {
                  setUserAnswers(answers);
                  startTransition(() =>
                    persistState(
                      expId!,
                      createExperimentRunState({
                        template,
                        createdBy,
                        technicianLogs,
                        phase: "user",
                        user: answers,
                      }),
                      "You can resume this run from the user phase.",
                    ),
                  );
                }
              : undefined
          }
          onSubmit={(answers) => {
            setUserAnswers(answers);
            setPersistNotice(null);
            setStage(1);
            if (expId) {
              startTransition(() =>
                persistState(
                  expId,
                  createExperimentRunState({
                    template,
                    createdBy,
                    technicianLogs,
                    phase: "worker",
                    user: answers,
                  }),
                ),
              );
            }
          }}
        />
      )}

      {stage === 1 && isClient && <WaitingForTechnician expId={expId} />}

      {stage === 1 && isTechnician && (
        <Stack gap="md">
          {template.clientForm.questions.length > 0 && (
            <Paper withBorder p="md" radius="md">
              <Title order={4}>Client submission</Title>
              <FormRenderer
                doc={template.clientForm}
                initialValues={userAnswers}
                readOnly
              />
            </Paper>
          )}
          <FormRenderer
            doc={template.labForm}
            initialValues={workerAnswers}
            submitLabel="Submit & finish"
            onSaveDraft={
              canPersistDraft
                ? (answers) => {
                    setWorkerAnswers(answers);
                    startTransition(() =>
                      persistState(
                        expId!,
                        createExperimentRunState({
                          template,
                          createdBy,
                          technicianLogs,
                          phase: "worker",
                          user: userAnswers,
                          worker: answers,
                        }),
                        "You can resume this run from the worker phase.",
                      ),
                    );
                  }
                : undefined
            }
            onSubmit={(answers) => {
              setWorkerAnswers(answers);
              setPersistNotice(null);
              if (!expId) return;

              startTransition(async () => {
                const result = await saveExperimentStateAction(
                  expId,
                  createExperimentRunState({
                    template,
                    createdBy,
                    technicianLogs,
                    phase: "result",
                    user: userAnswers,
                    worker: answers,
                  }),
                );
                if (!result.success) {
                  setPersistError(result.error);
                  return;
                }
                setPersistError(null);
                setStage(2);
              });
            }}
          />
        </Stack>
      )}

      {stage === 2 && (
        <ResultView
          template={template}
          userAnswers={userAnswers}
          workerAnswers={workerAnswers}
          expId={expId}
          onRestart={viewer.appRole === "client" ? onRestart : undefined}
        />
      )}
    </Stack>
  );
}

function WaitingForTechnician({ expId }: { expId: string | null }) {
  return (
    <Paper withBorder p="md" radius="md">
      <Title order={4}>Submitted to technician</Title>
      <Text mt="xs" c="dimmed">
        Your part is locked. A technician can now review and complete the
        technician section.
      </Text>
      {expId && (
        <Text size="sm" mt="xs">
          <LinkAnchor href={experimentPath(expId)}>View saved form</LinkAnchor>
        </Text>
      )}
    </Paper>
  );
}

interface ResultViewProps {
  template: ExperimentTemplate;
  userAnswers: FormAnswers;
  workerAnswers: FormAnswers;
  expId: string | null;
  onRestart?: () => void;
}

function ResultView({
  template,
  userAnswers,
  workerAnswers,
  expId,
  onRestart,
}: ResultViewProps) {
  const [, startTransition] = useTransition();
  const savedRef = useRef(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcLoading, setCalcLoading] = useState(Boolean(expId));
  const [runResult, setRunResult] = useState<ExperimentRunResult | null>(null);

  useEffect(() => {
    if (!expId || savedRef.current) return;
    savedRef.current = true;

    startTransition(async () => {
      const saveResult = await saveExperimentStateAction(
        expId,
        createExperimentRunState({
          template,
          phase: "result",
          user: userAnswers,
          worker: workerAnswers,
        }),
      );
      if (!saveResult.success) {
        setPersistError(saveResult.error);
        setCalcLoading(false);
        return;
      }

      const calcResult = await calculateExperimentAction(expId);
      if (!calcResult.success) {
        setCalcError(calcResult.error);
      } else {
        setRunResult(calcResult.data);
      }
      setCalcLoading(false);
    });
  }, [expId, template, userAnswers, workerAnswers, startTransition]);

  const calculationResults = runResult?.calculations ?? {};

  return (
    <Stack gap="md">
      {persistError && (
        <Alert color="orange" variant="light" title="Persistence warning">
          {persistError}
        </Alert>
      )}
      {calcError && (
        <Alert color="red" variant="light" title="Calculation failed">
          {calcError}
        </Alert>
      )}

      {runResult?.summary && (
        <Paper withBorder p="md" radius="md">
          <Title order={4}>Summary</Title>
          <Text mt="xs">{runResult.summary}</Text>
        </Paper>
      )}

      <Paper withBorder p="md" radius="md">
        <Title order={4}>Collected values</Title>
        <Code block mt="xs">
          {JSON.stringify({ client: userAnswers, lab: workerAnswers }, null, 2)}
        </Code>
      </Paper>

      <Paper withBorder p="md" radius="md">
        <Title order={4}>Calculations</Title>
        {calcLoading ? (
          <Text size="sm" c="dimmed" mt="xs">
            Computing results…
          </Text>
        ) : (
          <Stack gap="sm" mt="xs">
            {Object.entries(template.calculations).map(([name, calc]) => {
              const result = calculationResults[name];
              return (
                <div key={name}>
                  <Text fw={600}>{name}</Text>
                  <Text size="sm" c="dimmed">
                    {calc.formula}
                  </Text>
                  {result !== undefined ? (
                    <Text size="sm" mt={4}>
                      {String(result)}
                    </Text>
                  ) : (
                    <Text size="sm" c="dimmed" mt={4}>
                      No result
                    </Text>
                  )}
                </div>
              );
            })}
          </Stack>
        )}
      </Paper>

      <Group>
        {expId && (
          <LinkAnchor href={experimentPath(expId)} size="sm">
            View experiment details
          </LinkAnchor>
        )}
        {onRestart && <Button onClick={onRestart}>Start over</Button>}
      </Group>
    </Stack>
  );
}
