"use client";

import { Alert, Badge, Button, Group, Paper, Text, Title } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  downloadReportAction,
  generateReportAction,
} from "@/app/actions/experiment-manager";

interface ReportPanelProps {
  expId: string;
  reportStatus: string | null;
  reportGeneratedAt: string | null;
  /** Technician viewing a completed experiment can (re)generate the PDF. */
  canGenerate: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued", color: "blue" },
  processing: { label: "Generating", color: "yellow" },
  success: { label: "Ready", color: "green" },
  failed: { label: "Failed", color: "red" },
};

export function ReportPanel({
  expId,
  reportStatus,
  reportGeneratedAt,
  canGenerate,
}: ReportPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(
    null,
  );

  const status = reportStatus ?? null;
  const meta = status ? STATUS_META[status] : null;
  const isReady = status === "success";
  const inFlight = status === "pending" || status === "processing";
  const showGenerate = canGenerate && !inFlight;

  const handleGenerate = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await generateReportAction(expId);
      if (result.success) {
        setMessage({ text: "Report queued — refresh shortly.", ok: true });
        router.refresh();
      } else {
        setMessage({ text: result.error, ok: false });
      }
    });
  };

  const handleDownload = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await downloadReportAction(expId);
      if (result.success) {
        window.open(result.data.url, "_blank", "noopener,noreferrer");
      } else {
        setMessage({ text: result.error, ok: false });
      }
    });
  };

  return (
    <Paper withBorder p="md" radius="md">
      <Group justify="space-between" align="center" mb="xs">
        <Title order={4}>Report</Title>
        {meta && (
          <Badge color={meta.color} variant="light">
            {meta.label}
          </Badge>
        )}
      </Group>

      {reportGeneratedAt && isReady && (
        <Text size="sm" c="dimmed">
          Generated {new Date(reportGeneratedAt).toLocaleString()}
        </Text>
      )}

      {!status && (
        <Text size="sm" c="dimmed">
          No report has been generated for this experiment yet.
        </Text>
      )}

      <Group gap="sm" mt="md">
        {isReady && (
          <Button size="xs" loading={isPending} onClick={handleDownload}>
            Download PDF
          </Button>
        )}
        {showGenerate && (
          <Button
            size="xs"
            variant={isReady ? "default" : "filled"}
            loading={isPending}
            onClick={handleGenerate}
          >
            {isReady ? "Regenerate report" : "Generate report"}
          </Button>
        )}
        {inFlight && (
          <Button
            size="xs"
            variant="light"
            loading={isPending}
            onClick={() => router.refresh()}
          >
            Refresh status
          </Button>
        )}
      </Group>

      {message && (
        <Alert
          mt="md"
          variant="light"
          color={message.ok ? "green" : "red"}
          title={message.ok ? "Done" : "Unavailable"}
        >
          {message.text}
        </Alert>
      )}
    </Paper>
  );
}
