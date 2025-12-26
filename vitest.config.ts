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
    env: {
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
    },
    include: ["apps/**/*.test.ts", "packages/**/*.test.ts"],
    exclude: [
      "node_modules/**",
      "**/node_modules/**",
      "e2e/**",
      ".next/**",
      "**/e2e/**",
      "**/*.spec.ts",
    ],
    poolOptions: {
      workers: {
        // Use miniflare in local-only mode (no remote Cloudflare resources)
        singleWorker: true,
        isolatedStorage: true,
        miniflare: {
          compatibilityDate: "2025-12-01",
          compatibilityFlags: ["nodejs_compat"],
          bindings: {
            ENVIRONMENT: "test",
            NODE_ENV: "test",
            BETTER_AUTH_SECRET: "test-secret",
            BETTER_AUTH_URL: "http://localhost:3000",
            NEXT_PUBLIC_APP_URL: "http://localhost:3000",
            NEXT_PUBLIC_API_URL: "http://localhost:3000",
            NEXTJS_ENV: "test",
          },
          d1Databases: ["DB"],
          kvNamespaces: ["KV"],
          r2Buckets: ["R2"],
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
