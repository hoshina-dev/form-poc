"use client";

import { Anchor, Container, Group, Text } from "@mantine/core";
import Link from "next/link";

export function Navbar() {
  return (
    <Container
      size="xl"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group justify="space-between">
        <Anchor component={Link} href="/" c="dark" underline="never">
          <Text fw={700}>Gallery</Text>
        </Anchor>
      </Group>
    </Container>
  );
}
