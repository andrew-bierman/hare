import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { agents } from "./agents";
import { users } from "./auth";

export const deployments = sqliteTable("deployments", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  agentId: text("agentId")
    .notNull()
    .references(() => agents.id, { onDelete: "cascade" }),
  version: text("version").notNull(),
  environment: text("environment").notNull().default("production"),
  status: text("status").notNull().default("pending"),
  url: text("url"),
  metadata: text("metadata", { mode: "json" }).$type<{
    buildTime?: number;
    commitHash?: string;
    config?: Record<string, any>;
  }>(),
  deployedBy: text("deployedBy")
    .notNull()
    .references(() => users.id),
  deployedAt: integer("deployedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
