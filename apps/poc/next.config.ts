import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@hoshina-dev/api-client", "@hoshina-dev/forms"],
};

export default nextConfig;
