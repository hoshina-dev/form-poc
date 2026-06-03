"use client";

import { Button, Stack, Text } from "@mantine/core";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteExperimentAction } from "@/app/actions/experiment-manager";
import { experimentsPath } from "@/lib/routes";

interface DeleteExperimentButtonProps {
  expId: string;
}

export function DeleteExperimentButton({ expId }: DeleteExperimentButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Stack gap={4}>
      <Button
        color="red"
        variant="light"
        size="xs"
        loading={pending}
        onClick={() => {
          if (
            !window.confirm(
              "Delete this experiment and all saved answers? This cannot be undone.",
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteExperimentAction(expId);
            if (result.success) {
              router.push(experimentsPath());
              router.refresh();
            } else {
              setError(result.error);
            }
          });
        }}
      >
        Delete
      </Button>
      {error && (
        <Text size="xs" c="red">
          {error}
        </Text>
      )}
    </Stack>
  );
}
