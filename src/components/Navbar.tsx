"use client";

import { Anchor, Container, Group, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "List", match: (p: string) => p === "/" },
  {
    href: "/builder",
    label: "Builder",
    match: (p: string) => p.startsWith("/builder"),
  },
  {
    href: "/preview",
    label: "Preview",
    match: (p: string) => p.startsWith("/preview"),
  },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <Container
      size="xl"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group justify="space-between">
        <Text fw={700}>FormPoc</Text>
        <Group gap="lg">
          {links.map((link) => {
            const active = link.match(pathname);
            return (
              <Anchor
                key={link.href}
                component={Link}
                href={link.href}
                c={active ? "blue.6" : "dimmed"}
                fw={active ? 600 : 400}
                underline="never"
              >
                {link.label}
              </Anchor>
            );
          })}
        </Group>
      </Group>
    </Container>
  );
}
