"use client";

import { Anchor, Button, Container, Group, Text } from "@mantine/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { logout } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth/definitions";

const clientLinks = [
  { href: "/", label: "Samples", match: (p: string) => p === "/" },
  {
    href: "/experiments",
    label: "My forms",
    match: (p: string) => p === "/experiments" || p.startsWith("/experiments/"),
  },
];

const technicianLinks = [
  {
    href: "/",
    label: "Templates",
    match: (p: string) => p === "/" || p.startsWith("/samples"),
  },
  {
    href: "/experiments",
    label: "Assigned forms",
    match: (p: string) => p === "/experiments" || p.startsWith("/experiments/"),
  },
];

interface NavbarClientProps {
  session: SessionUser | null;
}

export function NavbarClient({ session }: NavbarClientProps) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const links =
    session?.appRole === "technician" ? technicianLinks : clientLinks;

  return (
    <Container
      size="xl"
      py="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-default-border)",
      }}
    >
      <Group justify="space-between">
        <Anchor
          component={Link}
          href={session?.appRole === "technician" ? "/experiments" : "/"}
          underline="never"
          c="inherit"
        >
          <Text fw={700}>Chemical Analysis</Text>
        </Anchor>
        <Group gap="lg">
          {session &&
            links.map((link) => {
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
        <Group gap="sm">
          {session ? (
            <>
              <Text size="sm" c="dimmed">
                {session.name} ·{" "}
                {session.appRole === "technician" ? "Technician" : "Client"}
              </Text>
              <Button
                variant="light"
                size="xs"
                loading={isPending}
                onClick={() => startTransition(() => void logout())}
              >
                Logout
              </Button>
            </>
          ) : (
            <Anchor component={Link} href="/login" size="sm">
              Login
            </Anchor>
          )}
        </Group>
      </Group>
    </Container>
  );
}
