// @ts-check

import { createESLintConfig } from "@leomotors/config";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// `@leomotors/config` already pulls in `typescript-eslint`'s recommended set,
// which registers the `@typescript-eslint` plugin. Both Next.js configs ship
// their own copy from a separately-installed `typescript-eslint`, and ESLint's
// flat-config loader refuses to redefine a plugin with a different object
// identity. Strip the duplicates so only the @leomotors instance wins.
/**
 * @param {import("eslint").Linter.Config[]} configs
 * @returns {import("eslint").Linter.Config[]}
 */
function stripTseslintPlugin(configs) {
  return configs.map((c) => {
    if (!c || typeof c !== "object" || !c.plugins) return c;
    if (!("@typescript-eslint" in c.plugins)) return c;
    const rest = { ...c.plugins };
    delete rest["@typescript-eslint"];
    if (Object.keys(rest).length === 0) {
      const copy = { ...c };
      delete copy.plugins;
      return copy;
    }
    return { ...c, plugins: rest };
  });
}

/** @type {import("eslint").Linter.Config[]} */
export const nextJsConfig = defineConfig([
  createESLintConfig(),
  ...stripTseslintPlugin(nextVitals),
  ...stripTseslintPlugin(nextTs),
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/libs/*.d.ts",
  ]),
]);

export default nextJsConfig;
