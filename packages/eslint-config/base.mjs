// @ts-check

import { createESLintConfig } from "@leomotors/config";
import { defineConfig } from "eslint/config";

/** @type {import("eslint").Linter.Config[]} */
export const baseConfig = defineConfig([createESLintConfig()]);

export default baseConfig;
