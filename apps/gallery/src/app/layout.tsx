import "@mantine/core/styles.css";
import "./globals.css";

import { Box } from "@mantine/core";
import {
  ColorSchemeScript,
  mantineHtmlProps,
  MantineProvider,
} from "@mantine/core";
import type { Metadata } from "next";

import { GallerySidebar } from "@/components/GallerySidebar";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Hoshina Form Gallery",
  description: "Every question type the form engine supports.",
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
          <Box
            style={{
              display: "grid",
              gridTemplateColumns: "260px 1fr",
              minHeight: "calc(100vh - 60px)",
            }}
          >
            <Box
              component="nav"
              style={{
                borderRight: "1px solid var(--mantine-color-default-border)",
                position: "sticky",
                top: 0,
                alignSelf: "start",
                height: "calc(100vh - 60px)",
              }}
            >
              <GallerySidebar />
            </Box>
            <Box component="main" p="xl">
              {children}
            </Box>
          </Box>
        </MantineProvider>
      </body>
    </html>
  );
}
