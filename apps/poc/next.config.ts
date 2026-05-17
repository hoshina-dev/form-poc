import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@hoshina-dev/forms"],
};

export default nextConfig;
