"use client";

import { Anchor, Container, Group, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Samples", match: (p: string) => p === "/" },
  {
    href: "/experiments",
    label: "Experiments",
    match: (p: string) => p === "/experiments" || p.startsWith("/experiments/"),
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
        <Anchor component={Link} href="/" underline="never" c="inherit">
          <Text fw={700}>FormPoc</Text>
        </Anchor>
        <Group gap="lg">
          {links.map((link) => {
            const active =
              link.match(pathname) ||
              (link.href === "/" && pathname.startsWith("/samples"));
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
