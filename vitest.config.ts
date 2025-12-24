import path from "node:path";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  resolve: {
    alias: {
      "web-app": path.resolve(__dirname, "./apps/web/src"),
      "@workspace/ui": path.resolve(__dirname, "./packages/ui/src"),
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
      // Cloudflare-specific tests that require @cloudflare/vitest-pool-workers
      "**/lib/api/routes/__tests__/**",
    ],
    poolOptions: {
      workers: {
        miniflare: {
          compatibilityDate: "2025-01-01",
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            ENVIRONMENT: "test",
            BETTER_AUTH_SECRET: "test-secret",
            BETTER_AUTH_URL: "http://localhost:3000",
            NEXTJS_ENV: "test",
          },
          d1Databases: ["DB"],
          d1DatabasePath: "./apps/web/.wrangler/state/v3/d1",
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/**",
        "**/node_modules/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/e2e/**",
        "**/__tests__/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.config.ts",
        "**/*.config.js",
        "**/types.ts",
        "**/cloudflare-env.d.ts",
        "**/db/schema/**",
        "**/db/client.ts",
        "**/db/index.ts",
      ],
      all: true,
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90,
    },
  },
});
