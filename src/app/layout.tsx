import "@mantine/core/styles.css";
import "./globals.css";

import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";
import type { Metadata } from "next";

import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Form Builder POC",
  description: "JSON-driven form builder and renderer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <MantineProvider>
          <Navbar />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
