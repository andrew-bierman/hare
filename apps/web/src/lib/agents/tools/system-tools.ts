/**
 * System Tools Definition
 *
 * Single source of truth for all system tool definitions.
 * Used by both the API routes and the agent tool loader.
 */

/**
 * System tool definition for API responses.
 */
export interface SystemToolDefinition {
  id: string;
  name: string;
  description: string;
  type: "http" | "kv" | "r2" | "sql";
  inputSchema: Record<
    string,
    {
      type: string;
      description?: string;
      enum?: string[];
      optional?: boolean;
    }
  >;
  isSystem: true;
}

/**
 * Core system tools available to all agents.
 * These provide access to Cloudflare's native services.
 */
export const SYSTEM_TOOLS: SystemToolDefinition[] = [
  {
    id: "system-http",
    name: "HTTP Request",
    description: "Make HTTP requests to external APIs",
    type: "http",
    inputSchema: {
      url: { type: "string", description: "The URL to request" },
      method: {
        type: "string",
        enum: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
      headers: { type: "object", optional: true },
      body: { type: "any", optional: true },
    },
    isSystem: true,
  },
  {
    id: "system-kv",
    name: "Key-Value Store",
    description: "Store and retrieve data from key-value storage",
    type: "kv",
    inputSchema: {
      operation: { type: "string", enum: ["get", "put", "delete", "list"] },
      key: { type: "string", description: "The key to operate on" },
      value: { type: "string", optional: true },
    },
    isSystem: true,
  },
  {
    id: "system-r2",
    name: "Object Storage",
    description: "Store and retrieve files from object storage",
    type: "r2",
    inputSchema: {
      operation: { type: "string", enum: ["get", "put", "delete", "list"] },
      path: { type: "string", description: "The path/key of the object" },
      content: { type: "string", optional: true },
    },
    isSystem: true,
  },
  {
    id: "system-sql",
    name: "SQL Query",
    description: "Execute read-only SQL queries on the database",
    type: "sql",
    inputSchema: {
      query: { type: "string", description: "The SQL query to execute" },
      params: { type: "array", optional: true },
    },
    isSystem: true,
  },
];

/**
 * Map of system tool IDs for quick lookup.
 */
export const SYSTEM_TOOL_IDS_SET = new Set(SYSTEM_TOOLS.map((t) => t.id));

/**
 * Check if a tool ID is a system tool.
 */
export function isSystemToolId(toolId: string): boolean {
  return SYSTEM_TOOL_IDS_SET.has(toolId);
}

/**
 * Get a system tool by ID.
 */
export function getSystemToolById(
  toolId: string,
): SystemToolDefinition | undefined {
  return SYSTEM_TOOLS.find((t) => t.id === toolId);
}
