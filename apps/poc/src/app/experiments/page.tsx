import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";

import { EmptyStatePanel, ErrorPanel } from "@/components/ErrorPanel";
import { ExperimentPhaseBadge } from "@/components/ExperimentPhaseBadge";
import { LinkAnchor, LinkButton } from "@/components/LinkButton";
import { requireSession } from "@/lib/auth/dal";
import { fetchExperiments } from "@/lib/experiment-manager/queries";
import {
  experimentPath,
  experimentResumePath,
  templatePreviewPath,
} from "@/lib/routes";
import { ticketStatusColor, ticketStatusLabel } from "@/lib/ticketing/status";

export const dynamic = "force-dynamic";

function loadErrorMessage(): string {
  return "Experiments are unavailable right now. Please try again later.";
}

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ExperimentsPage() {
  const session = await requireSession();
  let experiments;
  let error: string | null = null;

  try {
    experiments = await fetchExperiments(session);
  } catch {
    error = loadErrorMessage();
  }

  if (error) {
    return (
      <Container size="xl" py="lg">
        <ErrorPanel title="Experiments unavailable" message={error} />
      </Container>
    );
  }

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <div>
          <Title order={1}>Experiments</Title>
          <Text c="dimmed">
            {session.appRole === "technician"
              ? "Forms submitted by clients and ready for technician work."
              : "Your saved forms. Client drafts can be resumed until submitted to technicians."}
          </Text>
        </div>

        {experiments!.length === 0 ? (
          <EmptyStatePanel
            title="No experiments yet"
            message={
              session.appRole === "technician"
                ? "No client-submitted forms are ready for technicians."
                : "Run a template from a sample to create your first form."
            }
          />
        ) : (
          <Stack gap="sm">
            {experiments!.map((row) => {
              const legacy = row.stateKind === "legacy";
              const resumable =
                session.appRole === "technician"
                  ? row.phase === "worker"
                  : row.phase === "user";
              return (
                <Card
                  key={row.expId}
                  withBorder
                  radius="md"
                  padding="md"
                  opacity={legacy ? 0.65 : undefined}
                >
                  <Group
                    justify="space-between"
                    wrap="nowrap"
                    align="flex-start"
                  >
                    <div style={{ minWidth: 0 }}>
                      <Group gap="xs" mb={4}>
                        <Title order={4}>{row.templateName}</Title>
                        <Badge variant="light" size="sm">
                          {row.sampleName}
                        </Badge>
                        <ExperimentPhaseBadge
                          phase={row.phase}
                          stateKind={row.stateKind}
                        />
                        {row.ticketStatus && (
                          <Badge
                            color={ticketStatusColor(row.ticketStatus)}
                            variant="light"
                            size="sm"
                          >
                            {ticketStatusLabel(row.ticketStatus)}
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed">
                        Started {formatCreatedAt(row.createdAt)}
                        {session.appRole === "technician" && row.createdByName
                          ? ` · Requested by ${row.createdByName}`
                          : ""}
                      </Text>
                      {session.appRole === "client" && row.createdByName && (
                        <Text size="xs" c="dimmed" mt={4}>
                          Client: {row.createdByName}
                        </Text>
                      )}
                      {row.technicianLogCount > 0 && (
                        <Text size="xs" c="dimmed" mt={4}>
                          Technician changes: {row.technicianLogCount}
                        </Text>
                      )}
                      <Text size="xs" c="dimmed" mt={4}>
                        id: {row.expId}
                      </Text>
                    </div>
                    <Group gap="xs" wrap="nowrap">
                      {legacy ? (
                        <Button disabled variant="light" size="xs">
                          Disabled
                        </Button>
                      ) : resumable ? (
                        <LinkButton
                          href={experimentResumePath(row.expId)}
                          variant="filled"
                          size="xs"
                        >
                          Resume
                        </LinkButton>
                      ) : (
                        <LinkButton
                          href={experimentPath(row.expId)}
                          variant="light"
                          size="xs"
                        >
                          View
                        </LinkButton>
                      )}
                      {session.appRole === "client" && (
                        <LinkButton
                          href={templatePreviewPath({
                            sampleId: row.sampleId,
                            templateId: row.templateId,
                          })}
                          variant="default"
                          size="xs"
                        >
                          New run
                        </LinkButton>
                      )}
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}

        {session.appRole === "client" && (
          <LinkAnchor href="/" size="sm">
            ← All samples
          </LinkAnchor>
        )}
      </Stack>
    </Container>
  );
}
