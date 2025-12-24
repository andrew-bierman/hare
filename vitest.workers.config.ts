import path from "node:path";
import {
  defineWorkersConfig,
  readD1Migrations,
} from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  resolve: {
    alias: {
      "web-app": path.resolve(__dirname, "./apps/web/src"),
      "@workspace/ui": path.resolve(__dirname, "./packages/ui/src"),
    },
  },
  test: {
    globals: true,
    include: ["apps/web/src/lib/api/routes/__tests__/*.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./apps/web/wrangler.jsonc" },
        miniflare: {
          compatibilityDate: "2025-12-01",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
        },
      },
    },
  },
});
