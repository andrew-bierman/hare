import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "web-app": path.resolve(__dirname, "./apps/web/src"),
    },
  },
  test: {
    globals: true,
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "**/node_modules/**",
      "e2e/**",
      ".next/**",
      "**/e2e/**",
      "**/*.spec.ts",
    ],
    environment: "node",
  },
});
