import { Box } from "@mantine/core";

import { GallerySidebar } from "@/components/gallery/GallerySidebar";

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
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
  );
}
