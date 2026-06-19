import "@mantine/core/styles.css";
import "./globals.css";

import {
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";
import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Chemical Analysis",
  description: "JSON-driven form builder and renderer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <body>
        <MantineProvider defaultColorScheme="light">
          <Navbar />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
