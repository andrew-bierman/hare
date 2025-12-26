import { z } from '@hono/zod-openapi'

/**
 * API key permissions schema.
 * Defines what actions the key can perform.
 */
export const ApiKeyPermissionsSchema = z
	.object({
		scopes: z
			.array(z.string())
			.optional()
			.openapi({ example: ['chat', 'agents:read'] }),
		agentIds: z
			.array(z.string())
			.optional()
			.openapi({ example: ['agent_abc123'] }),
	})
	.nullable()
	.openapi('ApiKeyPermissions')

/**
 * Full API key schema for API responses.
 * Note: The actual key value is never returned except on creation.
 */
export const ApiKeySchema = z
	.object({
		id: z.string().openapi({ example: 'key_xyz789' }),
		workspaceId: z.string().openapi({ example: 'ws_abc123' }),
		name: z.string().openapi({ example: 'Production API Key' }),
		prefix: z.string().openapi({ example: 'hare_abcd1234' }),
		permissions: ApiKeyPermissionsSchema,
		lastUsedAt: z.string().datetime().nullable().openapi({ example: '2024-12-25T10:30:00Z' }),
		expiresAt: z.string().datetime().nullable().openapi({ example: '2025-12-25T00:00:00Z' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('ApiKey')

/**
 * API key response that includes the actual key value.
 * Only returned on key creation.
 */
export const ApiKeyWithSecretSchema = z
	.object({
		id: z.string().openapi({ example: 'key_xyz789' }),
		workspaceId: z.string().openapi({ example: 'ws_abc123' }),
		name: z.string().openapi({ example: 'Production API Key' }),
		prefix: z.string().openapi({ example: 'hare_abcd1234' }),
		key: z.string().openapi({ example: 'hare_abcd1234efgh5678ijkl9012' }),
		permissions: ApiKeyPermissionsSchema,
		expiresAt: z.string().datetime().nullable().openapi({ example: '2025-12-25T00:00:00Z' }),
		createdAt: z.string().datetime().openapi({ example: '2024-12-01T00:00:00Z' }),
	})
	.openapi('ApiKeyWithSecret')

/**
 * Schema for creating a new API key.
 */
export const CreateApiKeySchema = z
	.object({
		name: z.string().min(1).max(100).openapi({ example: 'Production API Key' }),
		permissions: ApiKeyPermissionsSchema.optional(),
		expiresAt: z.string().datetime().optional().openapi({ example: '2025-12-25T00:00:00Z' }),
	})
	.openapi('CreateApiKey')

/**
 * Schema for updating an API key.
 */
export const UpdateApiKeySchema = z
	.object({
		name: z.string().min(1).max(100).optional().openapi({ example: 'Updated API Key Name' }),
		permissions: ApiKeyPermissionsSchema.optional(),
	})
	.openapi('UpdateApiKey')

/**
 * List of API keys response.
 */
export const ApiKeyListSchema = z
	.object({
		apiKeys: z.array(ApiKeySchema),
	})
	.openapi('ApiKeyList')
