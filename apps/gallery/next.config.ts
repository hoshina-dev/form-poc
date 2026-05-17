import type { NextConfig } from "next";

const basePath =
  process.env.GITHUB_PAGES === "true"
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@hoshina-dev/forms"],
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
