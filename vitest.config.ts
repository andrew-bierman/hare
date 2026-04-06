import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig(async () => ({
  resolve: {
    alias: {
      // Mock cuid2 to avoid CF Workers global scope random generation error
      // cuid2 calls crypto.getRandomValues() at import time, which fails in Workers global scope
      "@paralleldrive/cuid2": path.resolve(__dirname, "./packages/testing/src/mocks/cuid2.ts"),
      // @hare/* package aliases
      "@hare/api": path.resolve(__dirname, "./packages/api/src/index.ts"),
      "@hare/auth/server": path.resolve(__dirname, "./packages/auth/src/server.ts"),
      "@hare/auth/client": path.resolve(__dirname, "./packages/auth/src/client.ts"),
      "@hare/auth": path.resolve(__dirname, "./packages/auth/src/index.ts"),
      "@hare/config": path.resolve(__dirname, "./packages/config/src/index.ts"),
      "@hare/db/schema": path.resolve(__dirname, "./packages/db/src/schema/index.ts"),
      "@hare/db": path.resolve(__dirname, "./packages/db/src/index.ts"),
      "@hare/tools": path.resolve(__dirname, "./packages/tools/src/index.ts"),
      "@hare/types": path.resolve(__dirname, "./packages/types/src/index.ts"),
      "@hare/ui": path.resolve(__dirname, "./packages/ui/src/index.ts"),
      "@hare/agent": path.resolve(__dirname, "./packages/agent/src/index.ts"),
      "@hare/security": path.resolve(__dirname, "./packages/security/src/index.ts"),
      "@hare/testing": path.resolve(__dirname, "./packages/testing/src/index.ts"),
      "@hare/app/shared/lib": path.resolve(__dirname, "./packages/app/shared/lib/index.ts"),
      "@hare/app": path.resolve(__dirname, "./packages/app/index.ts"),
      // Map web-app imports to new package structure
      "web-app/lib/env/server": path.resolve(__dirname, "./packages/config/src/env.ts"),
      "web-app/db/schema": path.resolve(__dirname, "./packages/db/src/schema/index.ts"),
      "web-app/db/client": path.resolve(__dirname, "./packages/db/src/client.ts"),
      "web-app/db": path.resolve(__dirname, "./packages/db/src/index.ts"),
      "web-app/lib/agents/memory": path.resolve(__dirname, "./packages/tools/src/memory.ts"),
      "web-app/lib/agents/tools/types": path.resolve(__dirname, "./packages/tools/src/types.ts"),
      "web-app/lib/agents/tools/agent-control": path.resolve(__dirname, "./packages/tools/src/agent-control.ts"),
      "web-app/lib/agents": path.resolve(__dirname, "./packages/agent/src/index.ts"),
      "web-app/lib/utils": path.resolve(__dirname, "./packages/ui/src/lib/utils.ts"),
      "web-app": path.resolve(__dirname, "./apps/web/src"),
    },
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify("test"),
    "process.env.VITE_APP_URL": JSON.stringify("http://localhost:3000"),
  },
  test: {
    globals: true,
    setupFiles: ["./test/apply-migrations.ts"],
    env: {
      NODE_ENV: "test",
      VITE_APP_URL: "http://localhost:3000",
    },
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "**/node_modules/**",
      "e2e/**",
      "**/e2e/**",
      "**/*.spec.ts",
    ],
    poolOptions: {
      workers: {
        singleWorker: true,
        isolatedStorage: true,
        miniflare: {
          compatibilityDate: "2025-12-01",
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            ENVIRONMENT: "test",
            NODE_ENV: "test",
            BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
            BETTER_AUTH_URL: "http://localhost:3000",
            VITE_APP_URL: "http://localhost:3000",
            TEST_MIGRATIONS: await readD1Migrations(
              path.resolve(__dirname, "./apps/web/migrations"),
            ),
          },
          d1Databases: ["DB"],
          d1Persist: process.env.VITEST ? '.vitest' : false,
          kvNamespaces: ["KV"],
          r2Buckets: ["R2"],
        },
      },
    },
    coverage: {
      provider: "istanbul",
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
      lines: 40,
      functions: 40,
      branches: 40,
      statements: 40,
    },
  },
}));
