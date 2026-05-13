"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionIcon, Tooltip } from "@mantine/core";

interface DeleteButtonProps {
  id: string;
}

export function DeleteButton({ id }: DeleteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <Tooltip label="Delete form">
      <ActionIcon
        color="red"
        variant="subtle"
        loading={busy}
        onClick={async () => {
          if (!confirm(`Delete form "${id}"?`)) return;
          setBusy(true);
          try {
            const res = await fetch(`/api/forms/${id}`, { method: "DELETE" });
            if (!res.ok) {
              const body = await res.json().catch(() => ({}));
              alert(body.error ?? "Delete failed");
              return;
            }
            router.refresh();
          } finally {
            setBusy(false);
          }
        }}
        aria-label={`Delete ${id}`}
      >
        ✕
      </ActionIcon>
    </Tooltip>
  );
}
