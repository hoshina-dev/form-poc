import type { NextConfig } from "next";

const isPages = process.env.GITHUB_PAGES === "1";
const repo = "form-poc";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : undefined,
  assetPrefix: isPages ? `/${repo}/` : undefined,
};

export default nextConfig;
