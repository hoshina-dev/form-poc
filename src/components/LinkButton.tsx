"use client";

import {
  Anchor,
  type AnchorProps,
  Button,
  type ButtonProps,
} from "@mantine/core";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Href = ComponentProps<typeof Link>["href"];

export function LinkButton({
  href,
  children,
  ...rest
}: ButtonProps & { href: Href; children: ReactNode }) {
  return (
    <Button component={Link} href={href} {...rest}>
      {children}
    </Button>
  );
}

export function LinkAnchor({
  href,
  children,
  ...rest
}: AnchorProps & { href: Href; children: ReactNode }) {
  return (
    <Anchor component={Link} href={href} {...rest}>
      {children}
    </Anchor>
  );
}
